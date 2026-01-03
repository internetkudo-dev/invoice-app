import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet,
    Switch,
} from 'react-native';
import { ArrowLeft, Plus, Trash2, ChevronDown, User, Calendar, FileText, Percent, RefreshCw, Languages, Search, QrCode, Barcode, Camera, Image as ImageIcon, Contact } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SvgXml } from 'react-native-svg';
import { t } from '../../i18n';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Input, Button, QuickAddModal, BarcodeScannerModal, SignaturePadModal } from '../../components/common';
import { Profile, Invoice, Client, Product, InvoiceStatus } from '../../types';

interface InvoiceFormScreenProps {
    navigation: any;
    route: any;
}

interface LineItem {
    id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    unit: string;
    tax_rate?: number;
    amount: number;
}

const intervals = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
];

const units = ['pcs', 'hrs', 'kg', 'unit', 'mt', 'l'];

export function InvoiceFormScreen({ navigation, route }: InvoiceFormScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [profile, setProfile] = useState<Profile | null>(null);
    const invoiceId = route.params?.invoiceId;
    const isEditing = !!invoiceId;

    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [showQuickClient, setShowQuickClient] = useState(false);
    const [showQuickProduct, setShowQuickProduct] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    const [currency, setCurrency] = useState('USD');
    const [defaultTaxRate, setDefaultTaxRate] = useState(0);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';

    const [formData, setFormData] = useState({
        client_id: '',
        invoice_number: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        status: 'draft' as InvoiceStatus,
        discount_amount: 0,
        discount_percent: 0,
        notes: '',
        is_recurring: false,
        recurring_interval: 'monthly' as any,
        type: 'invoice' as 'invoice' | 'offer',
        buyer_signature_url: '',
    });

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0, unit: 'pcs', amount: 0 },
    ]);

    useEffect(() => {
        fetchInitialData();
        if (isEditing) fetchInvoice();
        else {
            // Wait for profile to load? No, generate immediately with defaults
            // But we might need to know if the user passed a type param?
            const initialType = route.params?.type || 'invoice';
            setFormData(prev => ({ ...prev, type: initialType })); // Set initial type from nav params if any
            // We'll let the type selector effect trigger the generation or do it here
        }
    }, []);

    // Effect to regenerate number when type changes (only in create mode)
    useEffect(() => {
        if (!isEditing) {
            generateInvoiceNumber();
        }
    }, [formData.type]);

    const fetchInitialData = async () => {
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
            setProfile(profile);
            setCurrency(profile.currency || 'USD');
            setDefaultTaxRate(profile.tax_rate || 0);

            const companyId = profile.company_id || user.id;

            const { data: clientsData } = await supabase
                .from('clients')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);
            if (clientsData) setClients(clientsData);

            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);
            if (productsData) setProducts(productsData);
        }
    };

    const fetchInvoice = async () => {
        const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
        if (invoice) {
            setFormData({
                client_id: invoice.client_id || '',
                invoice_number: invoice.invoice_number,
                issue_date: invoice.issue_date,
                due_date: invoice.due_date || '',
                status: invoice.status,
                discount_amount: Number(invoice.discount_amount) || 0,
                discount_percent: Number(invoice.discount_percent) || 0,
                notes: invoice.notes || '',
                is_recurring: invoice.is_recurring || false,
                recurring_interval: invoice.recurring_interval || 'monthly',
                type: invoice.type || 'invoice',
                buyer_signature_url: invoice.buyer_signature_url || '',
            });
        }

        const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
        if (items && items.length > 0) setLineItems(items.map(it => ({
            ...it,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            amount: Number(it.amount)
        })));
    };

    const generateInvoiceNumber = async () => {
        const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('type', formData.type);
        const nextNumber = (count || 0) + 1;
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const prefix = formData.type === 'offer' ? 'OFF' : 'INV';
        setFormData((prev) => ({ ...prev, invoice_number: `${prefix}-${String(nextNumber).padStart(3, '0')}-${dd}-${mm}-${yyyy}` }));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(amount);
    };

    const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + item.amount, 0);

    const calculateTax = () => {
        return lineItems.reduce((sum, item) => {
            const itemTax = item.tax_rate !== undefined ? item.tax_rate : defaultTaxRate;
            return sum + (item.amount * (itemTax / 100));
        }, 0);
    };

    const calculateDiscount = () => {
        const subtotal = calculateSubtotal();
        if (formData.discount_percent > 0) return subtotal * (formData.discount_percent / 100);
        return formData.discount_amount;
    };

    const calculateTotal = () => calculateSubtotal() + calculateTax() - calculateDiscount();

    const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
        setLineItems(items => items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unit_price') {
                    updated.amount = updated.quantity * updated.unit_price;
                }
                return updated;
            }
            return item;
        }));
    };

    const addLineItem = () => {
        setLineItems(items => [
            ...items,
            { id: String(Date.now()), description: '', quantity: 1, unit_price: 0, unit: 'pcs', amount: 0 },
        ]);
    };

    const removeLineItem = (id: string) => {
        if (lineItems.length === 1) return;
        setLineItems(items => items.filter(item => item.id !== id));
    };

    const selectProduct = (item: LineItem, product: Product) => {
        setLineItems(items => items.map(i => {
            if (i.id === item.id) {
                return {
                    ...i,
                    description: product.name,
                    unit_price: Number(product.unit_price),
                    unit: product.unit || 'pcs',
                    amount: i.quantity * Number(product.unit_price),
                    product_id: product.id,
                    tax_rate: product.tax_rate,
                };
            }
            return i;
        }));
    };

    const handleQuickAddClient = async (data: any) => {
        const { data: newClient, error } = await supabase
            .from('clients')
            .insert({ ...data, user_id: user?.id, company_id: profile?.company_id || user?.id })
            .select()
            .single();
        if (newClient) {
            setClients([...clients, newClient]);
            setFormData({ ...formData, client_id: newClient.id });
        }
    };

    const handleQuickAddProduct = async (data: any) => {
        const { data: newProduct, error } = await supabase
            .from('products')
            .insert({ ...data, user_id: user?.id, company_id: profile?.company_id || user?.id })
            .select()
            .single();
        if (newProduct) {
            setProducts([...products, newProduct]);
            if (activeRowId) {
                const item = lineItems.find(i => i.id === activeRowId);
                if (item) selectProduct(item, newProduct);
            }
        }
    };

    const handleBarcodeScanned = (code: string) => {
        const product = products.find(p => p.barcode === code || p.sku === code);
        if (product && activeRowId) {
            const item = lineItems.find(i => i.id === activeRowId);
            if (item) selectProduct(item, product);
        } else if (activeRowId) {
            Alert.alert('Not Found', `No product found with barcode: ${code}. Add it as a new product?`, [
                { text: 'Cancel' },
                { text: 'Add Product', onPress: () => setShowQuickProduct(true) }
            ]);
        }
    };

    const pickBuyerSignature = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const base64 = `data:image/png;base64,${result.assets[0].base64}`;
            setFormData(prev => ({ ...prev, buyer_signature_url: base64 }));
        }
    };

    const handleSave = async () => {
        if (!formData.invoice_number) { Alert.alert('Error', 'Invoice number is required'); return; }

        setLoading(true);
        try {
            const invoiceData = {
                user_id: user?.id,
                company_id: profile?.company_id || user?.id,
                client_id: formData.client_id || null,
                invoice_number: formData.invoice_number,
                issue_date: formData.issue_date,
                due_date: formData.due_date || null,
                status: formData.status,
                discount_amount: calculateDiscount(),
                discount_percent: formData.discount_percent,
                tax_amount: calculateTax(),
                total_amount: calculateTotal(),
                notes: formData.notes,
                is_recurring: formData.is_recurring,
                recurring_interval: formData.is_recurring ? formData.recurring_interval : null,
                type: formData.type,
                buyer_signature_url: formData.buyer_signature_url,
            };

            let savedId = invoiceId;
            if (isEditing) {
                await supabase.from('invoices').update(invoiceData).eq('id', invoiceId);
                await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
            } else {
                const { data } = await supabase.from('invoices').insert(invoiceData).select().single();
                savedId = data?.id;
            }

            const itemsToInsert = lineItems
                .filter(it => it.description)
                .map(it => ({
                    invoice_id: savedId,
                    product_id: it.product_id || null,
                    description: it.description,
                    quantity: it.quantity,
                    unit_price: it.unit_price,
                    unit: it.unit,
                    tax_rate: it.tax_rate,
                    amount: it.amount,
                }));

            await supabase.from('invoice_items').insert(itemsToInsert);
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save invoice');
        } finally {
            setLoading(false);
        }
    };

    const selectedClientObj = clients.find(c => c.id === formData.client_id);

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>
                    {isEditing ? (formData.type === 'invoice' ? `${t('edit', language)} ${t('invoice', language)}` : `${t('edit', language)} ${t('offer', language)}`) : (formData.type === 'invoice' ? t('newInvoice', language) : t('newOffer', language))}
                </Text>
            </View>

            <View style={styles.typeSelector}>
                {(['invoice', 'offer'] as const).map((tValue) => (
                    <TouchableOpacity
                        key={tValue}
                        style={[styles.typeOption, { backgroundColor: inputBg }, formData.type === tValue && { backgroundColor: primaryColor }]}
                        onPress={() => {
                            setFormData(prev => ({ ...prev, type: tValue }));
                            if (!isEditing) generateInvoiceNumber();
                        }}
                    >
                        <Text style={[styles.typeText, { color: formData.type === tValue ? '#fff' : mutedColor }]}>
                            {tValue === 'invoice' ? t('invoices', language).toUpperCase() : t('offers', language).toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Details Section */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <FileText color="#818cf8" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{formData.type === 'invoice' ? 'Invoice Basics' : 'Offer Basics'}</Text>
                    </View>
                    <Input label={formData.type === 'invoice' ? 'Invoice #' : 'Offer #'} value={formData.invoice_number} onChangeText={t => setFormData({ ...formData, invoice_number: t })} />
                    <View style={styles.row}>
                        <View style={styles.half}>
                            <Input label="Issue Date" value={formData.issue_date} onChangeText={t => setFormData({ ...formData, issue_date: t })} placeholder="YYYY-MM-DD" />
                        </View>
                        <View style={styles.half}>
                            <Input label="Due Date" value={formData.due_date} onChangeText={t => setFormData({ ...formData, due_date: t })} placeholder="YYYY-MM-DD" />
                        </View>
                    </View>
                </View>

                {/* Recurring Section */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <RefreshCw color="#6366f1" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Recurring Invoice</Text>
                        <Switch value={formData.is_recurring} onValueChange={v => setFormData({ ...formData, is_recurring: v })} />
                    </View>
                    {formData.is_recurring && (
                        <View style={styles.intervalGrid}>
                            {intervals.map(int => (
                                <TouchableOpacity
                                    key={int.value}
                                    style={[styles.intervalChip, { backgroundColor: inputBg }, formData.recurring_interval === int.value && styles.activeInterval]}
                                    onPress={() => setFormData({ ...formData, recurring_interval: int.value })}
                                >
                                    <Text style={[styles.intervalText, { color: formData.recurring_interval === int.value ? '#fff' : mutedColor }]}>{int.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Client Section */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <User color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Recipient</Text>
                    </View>
                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.picker, { backgroundColor: inputBg, flex: 1 }]} onPress={() => setShowClientPicker(!showClientPicker)}>
                            <Text style={{ color: selectedClientObj ? textColor : mutedColor }}>{selectedClientObj?.name || 'Select Client'}</Text>
                            <ChevronDown color={mutedColor} size={18} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: '#10b98120' }]}
                            onPress={() => setShowQuickClient(true)}
                        >
                            <Plus color="#10b981" size={20} />
                        </TouchableOpacity>
                    </View>
                    {showClientPicker && (
                        <View style={styles.pickerList}>
                            {clients.map(c => (
                                <TouchableOpacity key={c.id} style={styles.pickerItem} onPress={() => { setFormData({ ...formData, client_id: c.id }); setShowClientPicker(false); }}>
                                    <Text style={{ color: textColor }}>{c.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Line Items */}
                <Text style={styles.labelGroup}>Line Items</Text>
                {lineItems.map((item, idx) => (
                    <Card key={item.id} style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                            <Text style={styles.itemCount}>Item {idx + 1}</Text>
                            <View style={styles.row}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setActiveRowId(item.id);
                                        setShowScanner(true);
                                    }}
                                    style={styles.iconActionBtn}
                                >
                                    <Barcode color="#818cf8" size={18} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => removeLineItem(item.id)} style={styles.iconActionBtn}>
                                    <Trash2 color="#ef4444" size={18} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Input label="Description" value={item.description} onChangeText={t => updateLineItem(item.id, 'description', t)} />
                            </View>
                            <TouchableOpacity
                                style={[styles.smallActionBtn, { marginTop: 24, backgroundColor: '#f1f5f920' }]}
                                onPress={() => {
                                    setActiveRowId(item.id);
                                    setShowQuickProduct(true);
                                }}
                            >
                                <Plus color={textColor} size={20} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Input label="Qty" value={String(item.quantity)} onChangeText={t => updateLineItem(item.id, 'quantity', Number(t) || 1)} keyboardType="numeric" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ marginBottom: 8 }}><Text style={[styles.tinyLabel, { color: mutedColor }]}>Unit</Text></View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
                                    {units.map(u => (
                                        <TouchableOpacity key={u} style={[styles.unitChip, item.unit === u && styles.activeUnit]} onPress={() => updateLineItem(item.id, 'unit', u)}>
                                            <Text style={[styles.unitText, item.unit === u && styles.activeUnitText]}>{u}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                            <View style={{ flex: 1.5 }}>
                                <Input label="Price" value={String(item.unit_price)} onChangeText={t => updateLineItem(item.id, 'unit_price', Number(t) || 0)} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.itemTotal}>
                            <Text style={{ color: mutedColor }}>Amount: </Text>
                            <Text style={{ color: '#818cf8', fontWeight: 'bold' }}>{formatCurrency(item.amount)}</Text>
                        </View>
                    </Card>
                ))}

                <Button title="Add New Item" variant="secondary" icon={Plus} onPress={addLineItem} style={{ marginBottom: 24 }} />

                {/* Summary Section */}
                <Card style={styles.summaryCard}>
                    <SummaryRow label="Subtotal" value={formatCurrency(calculateSubtotal())} color={textColor} />
                    <SummaryRow label="Tax" value={formatCurrency(calculateTax())} color={textColor} />

                    <View style={styles.discountBox}>
                        <Text style={[styles.tinyLabel, { color: mutedColor }]}>Discount</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}><Input label="%" value={String(formData.discount_percent || '')} onChangeText={t => setFormData({ ...formData, discount_percent: Number(t) || 0 })} keyboardType="numeric" /></View>
                            <View style={{ flex: 1 }}><Input label="Amount" value={String(formData.discount_amount || '')} onChangeText={t => setFormData({ ...formData, discount_amount: Number(t) || 0 })} keyboardType="numeric" /></View>
                        </View>
                    </View>

                    <SummaryRow label="Total" value={formatCurrency(calculateTotal())} color="#818cf8" isLarge />
                </Card>

                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <Input label="Notes" value={formData.notes} onChangeText={t => setFormData({ ...formData, notes: t })} multiline />
                </View>

                {/* Buyer Signature Section */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Contact color="#ec4899" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Buyer Signature (Required for Invoices)</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.signatureBox, { backgroundColor: inputBg, borderColor: isDark ? '#334155' : '#cbd5e1' }]}
                        onPress={pickBuyerSignature}
                    >
                        {formData.buyer_signature_url ? (
                            <View style={styles.signaturePreviewContainer}>
                                {formData.buyer_signature_url.startsWith('data:image/svg+xml') ? (
                                    <View style={{ width: 40, height: 40 }}>
                                        <SvgXml xml={decodeURIComponent(formData.buyer_signature_url.split(',')[1])} width="100%" height="100%" />
                                    </View>
                                ) : (
                                    <ImageIcon color={textColor} size={24} style={styles.signaturePreviewImg} />
                                )}
                                <Text style={{ color: textColor, fontWeight: 'bold' }}>Signature Captured</Text>
                                <TouchableOpacity style={styles.clearSignature} onPress={() => setFormData(prev => ({ ...prev, buyer_signature_url: '' }))}>
                                    <Trash2 color="#ef4444" size={16} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <TouchableOpacity
                                    style={[styles.smallActionBtnRow, { backgroundColor: primaryColor, marginBottom: 12, paddingVertical: 12, minWidth: 180, justifyContent: 'center' }]}
                                    onPress={() => setShowSignaturePad(true)}
                                >
                                    <FileText color="#fff" size={20} />
                                    <Text style={{ color: '#fff', marginLeft: 8, fontWeight: 'bold', fontSize: 16 }}>Sign Here</Text>
                                </TouchableOpacity>

                                <Text style={{ color: mutedColor, marginVertical: 4 }}>- OR -</Text>

                                <TouchableOpacity
                                    onPress={pickBuyerSignature}
                                    style={{ alignItems: 'center' }}
                                >
                                    <Camera color={mutedColor} size={24} />
                                    <Text style={{ color: mutedColor, fontSize: 13, marginTop: 4 }}>Upload Image</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <Button
                    title={isEditing ? t('saveChanges', language) : `${t('create', language)} ${formData.type === 'invoice' ? t('invoice', language) : t('offer', language)}`}
                    onPress={handleSave}
                    loading={loading}
                />
            </ScrollView>

            <SignaturePadModal
                visible={showSignaturePad}
                onClose={() => setShowSignaturePad(false)}
                onSave={(sig) => setFormData(prev => ({ ...prev, buyer_signature_url: sig }))}
                primaryColor={primaryColor}
            />

            <QuickAddModal
                visible={showQuickClient}
                onClose={() => setShowQuickClient(false)}
                title="Quick Add Client"
                onAdd={handleQuickAddClient}
                fields={[
                    { key: 'name', label: 'Client Name', placeholder: 'Acme Corp' },
                    { key: 'email', label: 'Email', placeholder: 'client@example.com', keyboardType: 'email-address' },
                    { key: 'phone', label: 'Phone', placeholder: '+1 234...', keyboardType: 'phone-pad' },
                    { key: 'address', label: 'Address', placeholder: '123 Main St...', multiline: true },
                ]}
            />

            <QuickAddModal
                visible={showQuickProduct}
                onClose={() => setShowQuickProduct(false)}
                title="Quick Add Product"
                onAdd={handleQuickAddProduct}
                fields={[
                    { key: 'name', label: 'Product Name', placeholder: 'Consultation' },
                    { key: 'unit_price', label: 'Unit Price', placeholder: '0.00', keyboardType: 'decimal-pad' },
                    { key: 'unit', label: 'Unit', placeholder: 'hrs' },
                    { key: 'sku', label: 'SKU/Barcode', placeholder: 'Optional' },
                ]}
            />

            <BarcodeScannerModal
                visible={showScanner}
                onClose={() => setShowScanner(false)}
                onScanned={handleBarcodeScanned}
            />
        </KeyboardAvoidingView>
    );
}

function SummaryRow({ label, value, color, isLarge }: any) {
    return (
        <View style={styles.summaryRow}>
            <Text style={{ color: '#94a3b8', fontSize: isLarge ? 16 : 14 }}>{label}</Text>
            <Text style={{ color: color, fontSize: isLarge ? 22 : 16, fontWeight: 'bold' }}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: { marginRight: 16 },
    title: { fontSize: 24, fontWeight: 'bold' },
    typeSelector: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden', gap: 1 },
    typeOption: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    typeText: { fontSize: 12, fontWeight: 'bold' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 60 },
    section: { borderRadius: 16, padding: 16, marginBottom: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    intervalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    intervalChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    activeInterval: { backgroundColor: '#6366f1' },
    intervalText: { fontSize: 12, fontWeight: '600' },
    picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12 },
    pickerList: { marginTop: 8, gap: 4 },
    pickerItem: { padding: 12, borderRadius: 8, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
    labelGroup: { fontSize: 18, fontWeight: 'bold', marginVertical: 12, color: '#fff' },
    itemCard: { marginBottom: 12, padding: 16 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    itemCount: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    itemTotal: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
    tinyLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    unitChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 6, borderWidth: 1, borderColor: '#334155' },
    activeUnit: { backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#818cf8' },
    unitText: { fontSize: 11, color: '#94a3b8' },
    activeUnitText: { color: '#818cf8', fontWeight: 'bold' },
    summaryCard: { padding: 20, marginBottom: 20 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    discountBox: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16, marginVertical: 8 },
    saveButton: { marginTop: 16 },
    smallActionBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconActionBtn: {
        padding: 8,
        marginLeft: 8,
    },
    signatureBox: {
        height: 160,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    smallActionBtnRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    signaturePreviewContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    signaturePreviewImg: { opacity: 0.5 },
    clearSignature: { padding: 8 },
});
