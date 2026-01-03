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
} from 'react-native';
import { ArrowLeft, Plus, Trash2, ChevronDown, User, Calendar, FileText, Percent } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Input, Button } from '../../components/common';
import { Client, Product, InvoiceStatus } from '../../types';

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
    tax_rate?: number;
    amount: number;
}

export function InvoiceFormScreen({ navigation, route }: InvoiceFormScreenProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const invoiceId = route.params?.invoiceId;
    const isEditing = !!invoiceId;

    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [showClientPicker, setShowClientPicker] = useState(false);
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
    });

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0, amount: 0 },
    ]);

    useEffect(() => {
        fetchInitialData();
        if (isEditing) fetchInvoice();
        else generateInvoiceNumber();
    }, []);

    const fetchInitialData = async () => {
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('currency, tax_rate').eq('id', user.id).single();
        if (profile) {
            setCurrency(profile.currency || 'USD');
            setDefaultTaxRate(profile.tax_rate || 0);
        }

        const { data: clientsData } = await supabase.from('clients').select('*').eq('user_id', user.id);
        if (clientsData) setClients(clientsData);

        const { data: productsData } = await supabase.from('products').select('*').eq('user_id', user.id);
        if (productsData) setProducts(productsData);
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
                discount_amount: invoice.discount_amount || 0,
                discount_percent: invoice.discount_percent || 0,
                notes: invoice.notes || '',
            });
        }

        const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
        if (items && items.length > 0) setLineItems(items);
    };

    const generateInvoiceNumber = async () => {
        const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user?.id);
        const nextNumber = (count || 0) + 1;
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        // Format: 001-02-01-2026
        setFormData((prev) => ({ ...prev, invoice_number: `${String(nextNumber).padStart(3, '0')}-${dd}-${mm}-${yyyy}` }));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
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
        if (formData.discount_percent > 0) {
            return subtotal * (formData.discount_percent / 100);
        }
        return formData.discount_amount;
    };

    const calculateTotal = () => calculateSubtotal() + calculateTax() - calculateDiscount();

    const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
        setLineItems((items) =>
            items.map((item) => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'quantity' || field === 'unit_price') {
                        updated.amount = updated.quantity * updated.unit_price;
                    }
                    return updated;
                }
                return item;
            })
        );
    };

    const addLineItem = () => {
        setLineItems((items) => [
            ...items,
            { id: String(Date.now()), description: '', quantity: 1, unit_price: 0, amount: 0 },
        ]);
    };

    const removeLineItem = (id: string) => {
        if (lineItems.length === 1) return;
        setLineItems((items) => items.filter((item) => item.id !== id));
    };

    const selectProduct = (item: LineItem, product: Product) => {
        setLineItems((items) =>
            items.map((i) => {
                if (i.id === item.id) {
                    const price = Number(product.unit_price);
                    return {
                        ...i,
                        description: product.name,
                        unit_price: price,
                        amount: i.quantity * price,
                        product_id: product.id,
                        tax_rate: product.tax_rate,
                    };
                }
                return i;
            })
        );
    };

    const selectClient = (client: Client) => {
        setFormData({
            ...formData,
            client_id: client.id,
            discount_percent: client.discount_percent || 0,
        });
        setShowClientPicker(false);
    };

    const handleSave = async () => {
        if (!formData.invoice_number) {
            Alert.alert('Error', 'Invoice number is required');
            return;
        }

        setLoading(true);
        try {
            const invoiceData = {
                user_id: user?.id,
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
            };

            let savedInvoiceId = invoiceId;

            if (isEditing) {
                await supabase.from('invoices').update(invoiceData).eq('id', invoiceId);
                await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
            } else {
                const { data } = await supabase.from('invoices').insert(invoiceData).select().single();
                savedInvoiceId = data?.id;
            }

            const itemsToInsert = lineItems
                .filter((item) => item.description)
                .map((item) => ({
                    invoice_id: savedInvoiceId,
                    product_id: item.product_id || null,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate,
                    amount: item.amount,
                }));

            await supabase.from('invoice_items').insert(itemsToInsert);
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save invoice');
        } finally {
            setLoading(false);
        }
    };

    const selectedClient = clients.find((c) => c.id === formData.client_id);

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>{isEditing ? 'Edit Invoice' : 'New Invoice'}</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Invoice Details */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <FileText color="#818cf8" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Invoice Details</Text>
                    </View>

                    <Input label="Invoice Number" value={formData.invoice_number} onChangeText={(text) => setFormData({ ...formData, invoice_number: text })} placeholder="001-02-01-2026" />

                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            <Input label="Issue Date" value={formData.issue_date} onChangeText={(text) => setFormData({ ...formData, issue_date: text })} placeholder="YYYY-MM-DD" />
                        </View>
                        <View style={styles.halfField}>
                            <Input label="Due Date" value={formData.due_date} onChangeText={(text) => setFormData({ ...formData, due_date: text })} placeholder="YYYY-MM-DD" />
                        </View>
                    </View>
                </View>

                {/* Client Selection */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <User color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Client</Text>
                    </View>

                    <TouchableOpacity style={[styles.clientPicker, { backgroundColor: inputBg }]} onPress={() => setShowClientPicker(!showClientPicker)}>
                        <View>
                            <Text style={selectedClient ? { color: textColor } : { color: mutedColor }}>
                                {selectedClient?.name || 'Select a client'}
                            </Text>
                            {selectedClient?.discount_percent && selectedClient.discount_percent > 0 && (
                                <Text style={styles.clientDiscount}>{selectedClient.discount_percent}% discount applied</Text>
                            )}
                        </View>
                        <ChevronDown color={mutedColor} size={20} />
                    </TouchableOpacity>

                    {showClientPicker && clients.length > 0 && (
                        <View style={styles.clientList}>
                            {clients.map((client) => (
                                <TouchableOpacity
                                    key={client.id}
                                    style={[styles.clientOption, formData.client_id === client.id && styles.clientOptionActive]}
                                    onPress={() => selectClient(client)}
                                >
                                    <View>
                                        <Text style={[styles.clientOptionText, { color: formData.client_id === client.id ? '#fff' : textColor }]}>{client.name}</Text>
                                        <Text style={[styles.clientOptionEmail, { color: formData.client_id === client.id ? 'rgba(255,255,255,0.7)' : mutedColor }]}>{client.email}</Text>
                                    </View>
                                    {client.discount_percent && client.discount_percent > 0 && (
                                        <View style={styles.clientDiscountBadge}>
                                            <Percent color="#10b981" size={10} />
                                            <Text style={styles.clientDiscountText}>{client.discount_percent}%</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Line Items */}
                <Text style={[styles.sectionLabel, { color: textColor }]}>Line Items</Text>
                {lineItems.map((item, index) => (
                    <View key={item.id} style={[styles.section, { backgroundColor: cardBg }]}>
                        <View style={styles.lineItemHeader}>
                            <Text style={[styles.lineItemLabel, { color: mutedColor }]}>Item {index + 1}</Text>
                            {lineItems.length > 1 && (
                                <TouchableOpacity onPress={() => removeLineItem(item.id)} style={styles.removeBtn}>
                                    <Trash2 color="#ef4444" size={18} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Input
                            label="Description"
                            value={item.description}
                            onChangeText={(text) => updateLineItem(item.id, 'description', text)}
                            placeholder="Product or service"
                        />

                        {products.length > 0 && !item.description && (
                            <View style={styles.productChips}>
                                <Text style={[styles.chipLabel, { color: mutedColor }]}>Quick add:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {products.slice(0, 5).map((product) => (
                                        <TouchableOpacity key={product.id} style={styles.productChip} onPress={() => selectProduct(item, product)}>
                                            <Text style={styles.productChipText}>{product.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.row}>
                            <View style={styles.thirdField}>
                                <Input label="Qty" value={String(item.quantity)} onChangeText={(text) => updateLineItem(item.id, 'quantity', Number(text) || 0)} keyboardType="number-pad" />
                            </View>
                            <View style={styles.thirdField}>
                                <Input label="Price" value={String(item.unit_price)} onChangeText={(text) => updateLineItem(item.id, 'unit_price', Number(text) || 0)} keyboardType="decimal-pad" />
                            </View>
                            <View style={styles.thirdField}>
                                <Text style={[styles.label, { color: textColor }]}>Amount</Text>
                                <View style={[styles.amountBox, { backgroundColor: inputBg }]}>
                                    <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={styles.addLineButton} onPress={addLineItem}>
                    <Plus color="#818cf8" size={20} />
                    <Text style={styles.addLineText}>Add Line Item</Text>
                </TouchableOpacity>

                {/* Summary */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: mutedColor }]}>Subtotal</Text>
                        <Text style={[styles.summaryValue, { color: textColor }]}>{formatCurrency(calculateSubtotal())}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: mutedColor }]}>Tax</Text>
                        <Text style={[styles.summaryValue, { color: textColor }]}>{formatCurrency(calculateTax())}</Text>
                    </View>

                    <View style={styles.discountSection}>
                        <Text style={[styles.discountTitle, { color: textColor }]}>Discount</Text>
                        <View style={styles.row}>
                            <View style={styles.halfField}>
                                <Input label="Percent (%)" value={String(formData.discount_percent || '')} onChangeText={(text) => setFormData({ ...formData, discount_percent: Number(text) || 0, discount_amount: 0 })} keyboardType="decimal-pad" />
                            </View>
                            <View style={styles.halfField}>
                                <Input label="Fixed Amount" value={String(formData.discount_amount || '')} onChangeText={(text) => setFormData({ ...formData, discount_amount: Number(text) || 0, discount_percent: 0 })} keyboardType="decimal-pad" />
                            </View>
                        </View>
                    </View>

                    {calculateDiscount() > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: '#10b981' }]}>Discount Applied</Text>
                            <Text style={[styles.summaryValue, { color: '#10b981' }]}>-{formatCurrency(calculateDiscount())}</Text>
                        </View>
                    )}

                    <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
                    </View>
                </View>

                {/* Notes */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <Input label="Notes" value={formData.notes} onChangeText={(text) => setFormData({ ...formData, notes: text })} placeholder="Additional notes..." multiline numberOfLines={3} />
                </View>

                <Button title={isEditing ? 'Update Invoice' : 'Create Invoice'} onPress={handleSave} loading={loading} style={styles.saveButton} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: { marginRight: 16, padding: 4 },
    title: { fontSize: 22, fontWeight: 'bold' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    section: { borderRadius: 16, padding: 16, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600' },
    sectionLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    row: { flexDirection: 'row', gap: 12 },
    halfField: { flex: 1 },
    thirdField: { flex: 1 },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    clientPicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 16, marginBottom: 8 },
    clientDiscount: { color: '#10b981', fontSize: 12, marginTop: 4 },
    clientList: { gap: 8 },
    clientOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
    clientOptionActive: { backgroundColor: '#6366f1' },
    clientOptionText: { fontWeight: '600' },
    clientOptionEmail: { fontSize: 12, marginTop: 2 },
    clientDiscountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    clientDiscountText: { color: '#10b981', fontSize: 11, fontWeight: '600' },
    lineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    lineItemLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
    removeBtn: { padding: 6 },
    productChips: { marginBottom: 12 },
    chipLabel: { fontSize: 12, marginBottom: 8 },
    productChip: { backgroundColor: '#6366f1', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    productChipText: { color: '#fff', fontSize: 13, fontWeight: '500' },
    amountBox: { borderRadius: 12, padding: 16, alignItems: 'center' },
    amountText: { color: '#818cf8', fontWeight: '600', fontSize: 15 },
    addLineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginBottom: 12, gap: 8 },
    addLineText: { color: '#818cf8', fontWeight: '600', fontSize: 15 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    summaryLabel: { fontSize: 14 },
    summaryValue: { fontSize: 14, fontWeight: '600' },
    discountSection: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16, marginTop: 8 },
    discountTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
    totalRow: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16, marginTop: 8 },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    totalValue: { fontSize: 22, fontWeight: 'bold', color: '#818cf8' },
    saveButton: { marginTop: 8 },
});
