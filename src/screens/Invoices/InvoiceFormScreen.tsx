import React, { useEffect, useState, useCallback } from 'react';
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
    TextInput,
    Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Minus, Trash2, ChevronDown, User, Calendar, FileText, Percent, RefreshCw, Languages, Search, QrCode, Barcode, Camera, Image as ImageIcon, Contact, FileSignature } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SvgXml } from 'react-native-svg';
import { t } from '../../i18n';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Input, Button, QuickAddModal, BarcodeScannerModal, SignaturePadModal } from '../../components/common';
import { Profile, Invoice, Client, Product, InvoiceStatus, PaymentMethod } from '../../types';

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

    // Get document type info from route params
    const documentType = route.params?.type || 'invoice';
    const documentSubtype = route.params?.subtype || 'regular';
    const documentKey = route.params?.documentKey || 'regularInvoice';

    // Forced template and page size for fiscal invoices
    const forceTemplate = route.params?.forceTemplate; // 'kosovo' for Faturë e Rregullt
    const forcePageSize = route.params?.forcePageSize; // 'A4' for Faturë e Rregullt
    const isFiscalInvoice = !!forceTemplate;

    // Document type configurations
    const documentConfigs: Record<string, {
        prefix: string;
        title: string;
        color: string;
        showRecurring: boolean;
        showDueDate: boolean;
        showSignature: boolean;
        showDiscount: boolean;
        showTax: boolean;
        statusOptions: InvoiceStatus[];
    }> = {
        // Invoices
        'regular': { prefix: 'INV', title: t('regularInvoice', language), color: '#6366f1', showRecurring: true, showDueDate: true, showSignature: true, showDiscount: true, showTax: true, statusOptions: ['draft', 'sent', 'pending', 'paid', 'overdue'] },
        'delivery_note': { prefix: 'DN', title: t('deliveryNote', language), color: '#3b82f6', showRecurring: false, showDueDate: false, showSignature: true, showDiscount: false, showTax: false, statusOptions: ['draft', 'sent', 'pending'] },
        // Offers
        'order': { prefix: 'ORD', title: t('order', language), color: '#8b5cf6', showRecurring: false, showDueDate: true, showSignature: false, showDiscount: true, showTax: true, statusOptions: ['draft', 'sent', 'pending', 'paid'] },
        'pro_invoice': { prefix: 'PRO', title: t('proInvoice', language), color: '#a855f7', showRecurring: false, showDueDate: true, showSignature: false, showDiscount: true, showTax: true, statusOptions: ['draft', 'sent', 'pending'] },
        'offer': { prefix: 'OFF', title: t('offer', language), color: '#ec4899', showRecurring: false, showDueDate: true, showSignature: false, showDiscount: true, showTax: true, statusOptions: ['draft', 'sent', 'pending', 'paid'] },
    };

    const currentConfig = documentConfigs[documentSubtype] || documentConfigs['regular'];

    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [showQuickClient, setShowQuickClient] = useState(false);
    const [showQuickProduct, setShowQuickProduct] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [showProductDropdown, setShowProductDropdown] = useState<string | null>(null);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    const [currency, setCurrency] = useState('USD');
    const [defaultTaxRate, setDefaultTaxRate] = useState(0);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

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
        type: documentType as 'invoice' | 'offer',
        subtype: documentSubtype,
        buyer_signature_url: '',
        payment_method: 'bank' as PaymentMethod,
        amount_received: 0,
        paper_size: 'A4' as 'A4' | 'A5' | 'Receipt',
    });
    const [showPreview, setShowPreview] = useState(false);

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0, unit: 'pcs', amount: 0 },
    ]);

    // Reset form state when screen is focused for a new invoice (Fix #4: Unique invoice IDs)
    useFocusEffect(
        useCallback(() => {
            if (!isEditing) {
                // Reset line items for new invoice
                setLineItems([{ id: String(Date.now()), description: '', quantity: 1, unit_price: 0, unit: 'pcs', amount: 0 }]);
                // Reset form data to defaults
                setFormData(prev => ({
                    ...prev,
                    client_id: '',
                    invoice_number: '',
                    due_date: '',
                    status: 'draft',
                    discount_amount: 0,
                    notes: '',
                    is_recurring: false,
                    buyer_signature_url: '',
                    payment_method: 'bank',
                    amount_received: 0,
                }));
            }
        }, [isEditing])
    );

    useEffect(() => {
        fetchInitialData();
        if (isEditing) {
            fetchInvoice();
        } else {
            // Initialize with route params
            setFormData(prev => ({
                ...prev,
                type: documentType,
                subtype: documentSubtype,
                // Apply forced page size for fiscal invoices
                paper_size: forcePageSize || prev.paper_size,
            }));
            generateInvoiceNumber();
        }
    }, []);

    // Effect to regenerate number when type/subtype changes (only in create mode)
    useEffect(() => {
        if (!isEditing && profile) {
            generateInvoiceNumber();
        }
    }, [formData.type, formData.subtype, profile]);

    const fetchInitialData = async () => {
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
            setProfile(profile);
            setCurrency(profile.currency || 'USD');
            setDefaultTaxRate(profile.tax_rate || 0);

            // AUTO-APPLY DEFAULT DISCOUNT
            if (!isEditing && profile.default_client_discount) {
                setFormData(prev => ({ ...prev, discount_percent: Number(profile.default_client_discount) }));
            }

            // AUTO-APPLY DEFAULT DISCOUNT
            if (!isEditing && profile.default_client_discount) {
                setFormData(prev => ({ ...prev, discount_percent: Number(profile.default_client_discount) }));
            }

            if (profile.template_config?.pageSize && !forcePageSize) {
                // Only apply profile page size if not a fiscal invoice with forced size
                setFormData(prev => ({ ...prev, paper_size: profile.template_config.pageSize }));
            }

            const companyId = profile.active_company_id || profile.company_id || user.id;

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
                type: (invoice.type as 'invoice' | 'offer') || 'invoice',
                subtype: invoice.subtype || 'regular',
                buyer_signature_url: invoice.buyer_signature_url || '',
                payment_method: invoice.payment_method || 'bank',
                amount_received: Number(invoice.amount_received) || 0,
                paper_size: (invoice.paper_size as any) || 'A4',
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
        const { count } = await supabase.from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('type', formData.type)
            .eq('subtype', formData.subtype);

        const nextNumber = (count || 0) + 1;
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();

        const prefix = currentConfig.prefix;
        setFormData((prev) => ({
            ...prev,
            invoice_number: `${prefix}-${String(nextNumber).padStart(3, '0')}-${dd}-${mm}-${yyyy}`
        }));
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

    const calculateChange = () => {
        const total = calculateTotal();
        const received = formData.amount_received || 0;
        return Math.max(0, received - total);
    };

    const getPreviewStyles = () => {
        switch (formData.paper_size) {
            case 'A5': return { width: 300, height: 420 };
            case 'Receipt': return { width: 220, minHeight: 400 };
            default: return { width: 320, height: 450 }; // A4 semi-scaled
        }
    };

    const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
        setLineItems(items => items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unit_price') {
                    // Fix #3: Ensure decimal precision with proper rounding
                    updated.amount = Math.round(updated.quantity * updated.unit_price * 100) / 100;
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
        // Fix #1: Dismiss keyboard to ensure UI updates properly
        Keyboard.dismiss();

        setLineItems(items => items.map(i => {
            if (i.id === item.id) {
                // Fix #3: Ensure decimal precision with proper rounding
                const unitPrice = Math.round(Number(product.unit_price) * 100) / 100;
                const amount = Math.round(i.quantity * unitPrice * 100) / 100;
                return {
                    ...i,
                    description: product.name,
                    unit_price: unitPrice,
                    unit: product.unit || 'pcs',
                    amount: amount,
                    product_id: product.id,
                    tax_rate: product.tax_rate,
                };
            }
            return i;
        }));
        setShowProductDropdown(null);
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

        const total = calculateTotal();
        if (formData.payment_method === 'cash' && total > 300) {
            Alert.alert(t('error', language), t('cashLimitError', language));
            return;
        }

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
                subtype: formData.subtype,
                buyer_signature_url: formData.buyer_signature_url,
                payment_method: formData.payment_method,
                amount_received: formData.amount_received,
                change_amount: calculateChange(),
                paper_size: formData.paper_size,
                // Force kosovo template for fiscal invoices
                template_id: forceTemplate || 'classic',
            };

            console.log('Saving invoice:', invoiceData);

            let savedId = invoiceId;
            if (isEditing) {
                const { error } = await supabase.from('invoices').update(invoiceData).eq('id', invoiceId);
                if (error) throw error;
                await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
            } else {
                const { data, error } = await supabase.from('invoices').insert(invoiceData).select().single();
                console.log('Insert result:', { data, error });
                if (error) throw error;
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
                    tax_rate: currentConfig.showTax ? (it.tax_rate !== undefined ? it.tax_rate : defaultTaxRate) : 0,
                    amount: it.amount,
                }));

            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
                if (itemsError) console.error('Error saving items:', itemsError);
            }

            console.log('Invoice saved successfully:', savedId);
            setLoading(false);
            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving invoice:', error);
            Alert.alert('Error', 'Failed to save invoice: ' + error.message);
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
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: textColor }]}>
                        {isEditing ? `${t('edit', language)} ${currentConfig.title}` : `${t('create', language)} ${currentConfig.title}`}
                    </Text>
                    {!isEditing && (
                        <Text style={[styles.subtitle, { color: mutedColor }]}>
                            {formData.type === 'invoice' ? t('invoices', language) : t('offers', language)} • {formData.subtype}
                        </Text>
                    )}
                </View>
                <View style={[styles.typeBadge, { backgroundColor: `${currentConfig.color}20` }]}>
                    <Text style={[styles.typeBadgeText, { color: currentConfig.color }]}>{currentConfig.prefix}</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Status Selector */}
                <View style={styles.statusContainer}>
                    <Text style={[styles.tinyLabel, { color: mutedColor, marginBottom: 8 }]}>{t('status', language)}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {currentConfig.statusOptions.map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[
                                    styles.statusChip,
                                    { backgroundColor: inputBg },
                                    formData.status === s && { backgroundColor: currentConfig.color }
                                ]}
                                onPress={() => setFormData({ ...formData, status: s })}
                            >
                                <Text style={[styles.statusText, { color: formData.status === s ? '#fff' : mutedColor }]}>
                                    {t(s as any, language).toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>


                {/* Details Section */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <FileText color={currentConfig.color} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('invoiceNumber', language)}</Text>
                    </View>
                    <Input
                        label={t('invoiceNumber', language)}
                        value={formData.invoice_number}
                        onChangeText={t => setFormData({ ...formData, invoice_number: t })}
                    />
                    <View style={styles.row}>
                        <View style={styles.half}>
                            <Input label={t('issueDate', language)} value={formData.issue_date} onChangeText={t => setFormData({ ...formData, issue_date: t })} placeholder="YYYY-MM-DD" />
                        </View>
                        {currentConfig.showDueDate && (
                            <View style={styles.half}>
                                <Input label={t('dueDate', language)} value={formData.due_date} onChangeText={t => setFormData({ ...formData, due_date: t })} placeholder="YYYY-MM-DD" />
                            </View>
                        )}
                    </View>
                </View>

                {/* Recurring Section */}
                {currentConfig.showRecurring && (
                    <View style={[styles.section, { backgroundColor: cardBg }]}>
                        <View style={styles.sectionHeader}>
                            <RefreshCw color={primaryColor} size={20} />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Recurring Invoice</Text>
                            <Switch value={formData.is_recurring} onValueChange={v => setFormData({ ...formData, is_recurring: v })} />
                        </View>
                        {formData.is_recurring && (
                            <View style={styles.intervalGrid}>
                                {intervals.map(int => (
                                    <TouchableOpacity
                                        key={int.value}
                                        style={[styles.intervalChip, { backgroundColor: inputBg }, formData.recurring_interval === int.value && { backgroundColor: primaryColor }]}
                                        onPress={() => setFormData({ ...formData, recurring_interval: int.value })}
                                    >
                                        <Text style={[styles.intervalText, { color: formData.recurring_interval === int.value ? '#fff' : mutedColor }]}>{int.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Client Section */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <User color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('client', language)}</Text>
                    </View>
                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.picker, { backgroundColor: inputBg, flex: 1 }]} onPress={() => setShowClientPicker(!showClientPicker)}>
                            <Text style={{ color: selectedClientObj ? textColor : mutedColor }}>{selectedClientObj?.name || t('selectClient', language as any) || 'Select Client'}</Text>
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
                <View style={styles.sectionDivider}>
                    <Text style={[styles.labelGroup, { color: textColor }]}>{t('items', language)}</Text>
                </View>

                {lineItems.map((item, idx) => (
                    <Card key={item.id} style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                            <Text style={styles.itemCount}>ITEM {idx + 1}</Text>
                            <View style={styles.row}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setActiveRowId(item.id);
                                        setShowScanner(true);
                                    }}
                                    style={styles.iconActionBtn}
                                >
                                    <Barcode color={currentConfig.color} size={18} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => removeLineItem(item.id)} style={styles.iconActionBtn}>
                                    <Trash2 color="#ef4444" size={18} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label={t('description', language)}
                                    value={item.description}
                                    onChangeText={t => {
                                        updateLineItem(item.id, 'description', t);
                                        if (t.length > 1) setShowProductDropdown(item.id);
                                        else setShowProductDropdown(null);
                                    }}
                                    onFocus={() => {
                                        if (item.description.length > 0) setShowProductDropdown(item.id);
                                    }}
                                />
                                {showProductDropdown === item.id && (
                                    <View style={[styles.productDropdown, { backgroundColor: cardBg, borderColor }]}>
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                                            {products.filter(p =>
                                                p.name.toLowerCase().includes(item.description.toLowerCase()) ||
                                                p.sku?.toLowerCase().includes(item.description.toLowerCase()) ||
                                                p.barcode?.includes(item.description)
                                            ).map(p => (
                                                <TouchableOpacity
                                                    key={p.id}
                                                    style={[styles.productDropdownItem, { borderBottomColor: borderColor }]}
                                                    onPress={() => selectProduct(item, p)}
                                                >
                                                    <View>
                                                        <Text style={{ color: textColor, fontWeight: 'bold' }}>{p.name}</Text>
                                                        <Text style={{ color: mutedColor, fontSize: 10 }}>{p.sku || p.barcode || ''} • {formatCurrency(Number(p.unit_price))}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                            <TouchableOpacity
                                                style={[styles.productDropdownItem, { borderBottomWidth: 0 }]}
                                                onPress={() => {
                                                    setActiveRowId(item.id);
                                                    setShowQuickProduct(true);
                                                    setShowProductDropdown(null);
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Plus color={primaryColor} size={16} />
                                                    <Text style={{ color: primaryColor, fontWeight: 'bold' }}>{t('addItem', language)}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                style={[styles.smallActionBtn, { marginTop: 24, backgroundColor: `${currentConfig.color}10` }]}
                                onPress={() => {
                                    setActiveRowId(item.id);
                                    setShowQuickProduct(true);
                                }}
                            >
                                <Plus color={currentConfig.color} size={20} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1.2 }}>
                                <Text style={[styles.tinyLabel, { color: mutedColor, marginBottom: 8 }]}>{t('quantity', language)}</Text>
                                <View style={styles.qtyContainer}>
                                    <TouchableOpacity
                                        style={[styles.qtyBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
                                        onPress={() => updateLineItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                                    >
                                        <Minus color={textColor} size={16} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[styles.qtyInput, { backgroundColor: inputBg, color: textColor }]}
                                        value={String(item.quantity)}
                                        onChangeText={(t: string) => updateLineItem(item.id, 'quantity', Number(t) || 1)}
                                        keyboardType="numeric"
                                        textAlign="center"
                                    />
                                    <TouchableOpacity
                                        style={[styles.qtyBtn, { backgroundColor: currentConfig.color }]}
                                        onPress={() => updateLineItem(item.id, 'quantity', item.quantity + 1)}
                                    >
                                        <Plus color="#fff" size={16} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={{ flex: 1.5 }}>
                                <Input label={t('price', language)} value={String(item.unit_price)} onChangeText={t => updateLineItem(item.id, 'unit_price', Number(t) || 0)} keyboardType="numeric" />
                            </View>
                        </View>

                        <View style={styles.itemFooter}>
                            <View style={styles.unitSelector}>
                                {units.map(u => (
                                    <TouchableOpacity
                                        key={u}
                                        style={[
                                            styles.unitChip,
                                            { borderColor: borderColor },
                                            item.unit === u && { backgroundColor: `${currentConfig.color}20`, borderColor: currentConfig.color }
                                        ]}
                                        onPress={() => updateLineItem(item.id, 'unit', u)}
                                    >
                                        <Text style={[styles.unitText, { color: item.unit === u ? currentConfig.color : mutedColor }]}>{u}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.itemTotal}>
                                <Text style={{ color: currentConfig.color, fontWeight: '800', fontSize: 16 }}>{formatCurrency(item.amount)}</Text>
                            </View>
                        </View>
                    </Card>
                ))}

                <Button
                    title={t('addItem', language)}
                    variant="secondary"
                    icon={Plus}
                    onPress={addLineItem}
                    style={{ marginBottom: 24, borderStyle: 'dashed', borderWidth: 1 }}
                />

                {/* Summary Section */}
                <Card style={[styles.summaryCard, { borderLeftColor: currentConfig.color, borderLeftWidth: 4 }]}>
                    <SummaryRow label={t('subtotal', language)} value={formatCurrency(calculateSubtotal())} color={textColor} />

                    {currentConfig.showTax && (
                        <SummaryRow label={t('tax', language)} value={formatCurrency(calculateTax())} color={textColor} />
                    )}

                    {currentConfig.showDiscount && (
                        <View style={styles.discountBox}>
                            <Text style={[styles.tinyLabel, { color: mutedColor }]}>{t('discount', language)}</Text>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}><Input label="%" value={String(formData.discount_percent || '')} onChangeText={t => setFormData({ ...formData, discount_percent: Number(t) || 0 })} keyboardType="numeric" /></View>
                                <View style={{ flex: 1 }}><Input label={t('total', language)} value={String(formData.discount_amount || '')} onChangeText={t => setFormData({ ...formData, discount_amount: Number(t) || 0 })} keyboardType="numeric" /></View>
                            </View>
                        </View>
                    )}

                    <SummaryRow label={t('total', language)} value={formatCurrency(calculateTotal())} color={currentConfig.color} isLarge />

                    {/* Payment Method Selector */}
                    <View style={[styles.divider, { marginVertical: 12 }]} />
                    <Text style={[styles.tinyLabel, { color: mutedColor, marginBottom: 8 }]}>{t('paymentMethod', language)}</Text>
                    <View style={styles.paymentMethodsRow}>
                        {(['bank', 'cash', 'card'] as PaymentMethod[]).map((method) => (
                            <TouchableOpacity
                                key={method}
                                style={[
                                    styles.paymentMethodChip,
                                    { borderColor: borderColor },
                                    formData.payment_method === method && { backgroundColor: `${currentConfig.color}20`, borderColor: currentConfig.color }
                                ]}
                                onPress={() => setFormData({ ...formData, payment_method: method })}
                            >
                                <Text style={[styles.paymentMethodText, { color: formData.payment_method === method ? currentConfig.color : mutedColor }]}>
                                    {t(method as any, language)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {formData.payment_method === 'cash' && (
                        <View style={styles.cashCalculation}>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label={t('amountReceived', language)}
                                        value={String(formData.amount_received || '')}
                                        onChangeText={t => setFormData({ ...formData, amount_received: Number(t) || 0 })}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1, paddingLeft: 12 }}>
                                    <Text style={[styles.tinyLabel, { color: mutedColor, marginBottom: 4 }]}>{t('change', language)}</Text>
                                    <Text style={[styles.changeValue, { color: textColor }]}>{formatCurrency(calculateChange())}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </Card>

                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <Input label={t('notes', language)} value={formData.notes} onChangeText={t => setFormData({ ...formData, notes: t })} multiline />
                </View>

                {/* Buyer Signature Section */}
                {currentConfig.showSignature && (
                    <View style={[styles.section, { backgroundColor: cardBg }]}>
                        <View style={styles.sectionHeader}>
                            <Contact color="#ec4899" size={20} />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Buyer Signature</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.signatureBox, { backgroundColor: inputBg, borderColor: isDark ? '#334155' : '#cbd5e1' }]}
                            onPress={pickBuyerSignature}
                        >
                            {formData.buyer_signature_url ? (
                                <View style={styles.signaturePreviewContainer}>
                                    {formData.buyer_signature_url.startsWith('data:image/svg+xml') ? (
                                        <View style={{ width: 100, height: 40 }}>
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
                                        style={[styles.smallActionBtnRow, { backgroundColor: currentConfig.color, marginBottom: 12, paddingVertical: 12, minWidth: 180, justifyContent: 'center' }]}
                                        onPress={() => setShowSignaturePad(true)}
                                    >
                                        <FileSignature color="#fff" size={20} />
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
                )}

                {/* Paper Size Selector */}
                <Card style={[styles.section, { backgroundColor: cardBg }]}>
                    <Text style={[styles.tinyLabel, { color: mutedColor, marginBottom: 12 }]}>{t('paperSize', language) || 'Paper Size'}</Text>
                    {isFiscalInvoice ? (
                        <View style={styles.paymentMethodsRow}>
                            <View style={[styles.paymentMethodChip, { borderColor: primaryColor, backgroundColor: `${primaryColor}15` }]}>
                                <Text style={[styles.paymentMethodText, { color: primaryColor }]}>A4 (Dokument Fiskal)</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.paymentMethodsRow}>
                            {['A4', 'A5', 'Receipt'].map(size => (
                                <TouchableOpacity
                                    key={size}
                                    style={[
                                        styles.paymentMethodChip,
                                        { borderColor: formData.paper_size === size ? primaryColor : borderColor, backgroundColor: formData.paper_size === size ? `${primaryColor}15` : 'transparent' }
                                    ]}
                                    onPress={() => setFormData(prev => ({ ...prev, paper_size: size as any }))}
                                >
                                    <Text style={[styles.paymentMethodText, { color: formData.paper_size === size ? primaryColor : mutedColor }]}>{size}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </Card>

                <Button
                    title={showPreview ? "Hide Preview" : "Show On-Screen Preview"}
                    variant="outline"
                    onPress={() => setShowPreview(!showPreview)}
                    style={{ marginBottom: 16 }}
                />

                {showPreview && (
                    <Card style={[styles.previewCard, { backgroundColor: '#fff' }]}>
                        <View style={[styles.previewDocument, getPreviewStyles()]}>
                            {/* Header */}
                            <View style={styles.previewHeader}>
                                <View style={styles.previewCompany}>
                                    <Text style={styles.previewCompanyName}>{profile?.company_name || 'My Business'}</Text>
                                    <Text style={styles.previewCompanyInfo}>{profile?.email}</Text>
                                    <Text style={styles.previewCompanyInfo}>{profile?.phone}</Text>
                                </View>
                                {profile?.logo_url && (
                                    <View style={styles.previewLogo}>
                                        <Text style={{ fontSize: 8 }}>LOGO</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.previewDivider} />

                            {/* Client & Invoice Info */}
                            <View style={styles.previewSplit}>
                                <View style={styles.previewHalf}>
                                    <Text style={styles.previewLabel}>BILL TO:</Text>
                                    <Text style={styles.previewValue}>{clients.find(c => c.id === formData.client_id)?.name || 'Guest Client'}</Text>
                                </View>
                                <View style={[styles.previewHalf, { alignItems: 'flex-end' }]}>
                                    <Text style={styles.previewLabel}>{currentConfig.title.toUpperCase()}</Text>
                                    <Text style={styles.previewValue}>#{formData.invoice_number}</Text>
                                    <Text style={styles.previewLabel}>DATE: {formData.issue_date}</Text>
                                </View>
                            </View>

                            {/* Items */}
                            <View style={styles.previewTable}>
                                <View style={styles.previewTableRow}>
                                    <Text style={[styles.previewTableHeader, { flex: 2 }]}>Description</Text>
                                    <Text style={[styles.previewTableHeader, { flex: 1, textAlign: 'right' }]}>Qty</Text>
                                    <Text style={[styles.previewTableHeader, { flex: 1, textAlign: 'right' }]}>Total</Text>
                                </View>
                                {lineItems.map((item, idx) => (
                                    <View key={idx} style={styles.previewTableRow}>
                                        <Text style={[styles.previewTableData, { flex: 2 }]} numberOfLines={1}>{item.description || '...'}</Text>
                                        <Text style={[styles.previewTableData, { flex: 1, textAlign: 'right' }]}>{item.quantity}</Text>
                                        <Text style={[styles.previewTableData, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.amount)}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Summary */}
                            <View style={[styles.previewSplit, { marginTop: 15 }]}>
                                <View style={styles.previewHalf}>
                                    {formData.payment_method === 'cash' && (
                                        <View>
                                            <Text style={styles.previewLabel}>PAYMENT: CASH</Text>
                                            <Text style={styles.previewLabel}>CHANGE: {formatCurrency(calculateChange())}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={[styles.previewHalf, { alignItems: 'flex-end' }]}>
                                    <View style={styles.previewSummaryRow}>
                                        <Text style={styles.previewSummaryLabel}>Total:</Text>
                                        <Text style={styles.previewSummaryValue}>{formatCurrency(calculateTotal())}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Signatures */}
                            <View style={[styles.previewSplit, { marginTop: 20 }]}>
                                <View style={[styles.previewHalf, { alignItems: 'center' }]}>
                                    <View style={styles.previewSignLine} />
                                    <Text style={styles.previewSignLabel}>Seller</Text>
                                </View>
                                <View style={[styles.previewHalf, { alignItems: 'center' }]}>
                                    <View style={styles.previewSignLine} />
                                    <Text style={styles.previewSignLabel}>Buyer</Text>
                                </View>
                            </View>
                        </View>
                    </Card>
                )}

                <Button
                    title={isEditing ? t('saveChanges', language) : `${t('create', language)} ${currentConfig.title}`}
                    onPress={handleSave}
                    loading={loading}
                    style={{ marginTop: 10 }}
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
        </KeyboardAvoidingView >
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
    title: { fontSize: 20, fontWeight: 'bold' },
    subtitle: { fontSize: 12 },
    typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 40, alignItems: 'center' },
    typeBadgeText: { fontSize: 12, fontWeight: '800' },
    statusContainer: { paddingHorizontal: 16, marginBottom: 16 },
    statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 60 },
    section: { borderRadius: 16, padding: 16, marginBottom: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
    sectionDivider: { borderBottomWidth: 1, borderBottomColor: '#334155', marginVertical: 8, marginBottom: 16 },
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
    itemCard: { marginBottom: 16, padding: 16 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    itemCount: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
    itemFooter: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    unitSelector: { flexDirection: 'row', gap: 6 },
    itemTotal: {},
    tinyLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    unitChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
    unitText: { fontSize: 10, fontWeight: 'bold' },
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
    qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    qtyInput: { flex: 1, height: 40, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: '600' },
    paymentMethodsRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
    paymentMethodChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    paymentMethodText: { fontSize: 13, fontWeight: '700' },
    cashCalculation: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    changeValue: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
    divider: { height: 1, backgroundColor: '#334155', marginVertical: 16, opacity: 0.1 },
    productDropdown: {
        position: 'absolute',
        top: 70,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderRadius: 12,
        borderWidth: 1,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    productDropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
    },
    previewCard: { padding: 30, marginBottom: 20, alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16 },
    previewDocument: { padding: 20, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    previewHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    previewCompany: { flex: 1 },
    previewCompanyName: { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },
    previewCompanyInfo: { fontSize: 8, color: '#64748b' },
    previewLogo: { width: 30, height: 30, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
    previewDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
    previewSplit: { flexDirection: 'row', justifyContent: 'space-between' },
    previewHalf: { flex: 1 },
    previewLabel: { fontSize: 7, color: '#94a3b8', fontWeight: 'bold' },
    previewValue: { fontSize: 9, color: '#1e293b', fontWeight: 'bold', marginBottom: 2 },
    previewTable: { marginTop: 10 },
    previewTableRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
    previewTableHeader: { fontSize: 7, fontWeight: 'bold', color: '#64748b' },
    previewTableData: { fontSize: 8, color: '#1e293b' },
    previewSummaryRow: { flexDirection: 'row', alignItems: 'center' },
    previewSummaryLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginRight: 8 },
    previewSummaryValue: { fontSize: 12, fontWeight: 'bold', color: '#6366f1' },
    previewSignLine: { width: '80%', height: 1, backgroundColor: '#e2e8f0', marginTop: 15 },
    previewSignLabel: { fontSize: 6, color: '#94a3b8', marginTop: 4 },
});
