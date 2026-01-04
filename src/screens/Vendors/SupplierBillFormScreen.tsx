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
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Plus, Minus, Trash2, Building, Calendar, FileText, Search } from 'lucide-react-native';
import { t } from '../../i18n';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Input, Button } from '../../components/common';
import { Profile, Vendor, SupplierBill, SupplierBillItem } from '../../types';

interface SupplierBillFormScreenProps {
    navigation: any;
    route: any;
}

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
}

export function SupplierBillFormScreen({ navigation, route }: SupplierBillFormScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const billId = route.params?.billId;
    const isEditing = !!billId;

    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [showVendorPicker, setShowVendorPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';

    const [formData, setFormData] = useState({
        vendor_id: '',
        bill_number: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        status: 'unpaid' as 'unpaid' | 'paid' | 'partial',
        notes: '',
        tax_amount: 0,
    });

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0, amount: 0 },
    ]);

    useEffect(() => {
        fetchInitialData();
        if (isEditing) {
            fetchBill();
        }
    }, []);

    useEffect(() => {
        if (route.params?.scannedData && vendors.length > 0) {
            const data = route.params.scannedData;
            // Try to find vendor by name
            const foundVendor = vendors.find(v => v.name.toLowerCase().includes(data.vendor_name.toLowerCase()));

            setFormData(prev => ({
                ...prev,
                vendor_id: foundVendor?.id || '',
                bill_number: data.bill_number,
                issue_date: data.date,
            }));

            if (data.items) {
                setLineItems(data.items.map((it: any, idx: number) => ({
                    id: String(idx + 1),
                    description: it.description,
                    quantity: it.quantity,
                    unit_price: it.unit_price,
                    amount: it.amount
                })));
            }
        }
    }, [route.params?.scannedData, vendors]);

    const fetchInitialData = async () => {
        if (!user) return;
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
            setProfile(profileData);
            const companyId = profileData.active_company_id || profileData.company_id || user.id;

            const { data: vendorsData } = await supabase
                .from('vendors')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .order('name');
            if (vendorsData) setVendors(vendorsData);
        }
    };

    const fetchBill = async () => {
        setLoading(true);
        try {
            const { data: bill } = await supabase.from('supplier_bills').select('*, items:supplier_bill_items(*)').eq('id', billId).single();
            if (bill) {
                setFormData({
                    vendor_id: bill.vendor_id,
                    bill_number: bill.bill_number,
                    issue_date: bill.issue_date,
                    due_date: bill.due_date || '',
                    status: bill.status,
                    notes: bill.notes || '',
                    tax_amount: Number(bill.tax_amount) || 0,
                });
                if (bill.items && bill.items.length > 0) {
                    setLineItems(bill.items.map((it: any) => ({
                        id: it.id,
                        description: it.description,
                        quantity: Number(it.quantity),
                        unit_price: Number(it.unit_price),
                        amount: Number(it.amount),
                    })));
                }
            }
        } catch (error) {
            console.error('Error fetching bill:', error);
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setLineItems([...lineItems, { id: Math.random().toString(), description: '', quantity: 1, unit_price: 0, amount: 0 }]);
    };

    const removeItem = (id: string) => {
        if (lineItems.length === 1) return;
        setLineItems(lineItems.filter(item => item.id !== id));
    };

    const updateItem = (id: string, updates: Partial<LineItem>) => {
        setLineItems(lineItems.map(item => {
            if (item.id === id) {
                const newItem = { ...item, ...updates };
                newItem.amount = newItem.quantity * newItem.unit_price;
                return newItem;
            }
            return item;
        }));
    };

    const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + item.amount, 0);
    const calculateTotal = () => calculateSubtotal() + Number(formData.tax_amount);

    const handleSave = async () => {
        if (!formData.vendor_id || !formData.bill_number) {
            Alert.alert('Error', 'Please select a vendor and enter a bill number');
            return;
        }

        setLoading(true);
        try {
            const billData = {
                user_id: user?.id,
                company_id: profile?.active_company_id || profile?.company_id || user?.id,
                vendor_id: formData.vendor_id,
                bill_number: formData.bill_number,
                issue_date: formData.issue_date,
                due_date: formData.due_date || null,
                total_amount: calculateTotal(),
                tax_amount: formData.tax_amount,
                status: formData.status,
                notes: formData.notes,
            };

            let billIdToUse = billId;

            if (isEditing) {
                const { error } = await supabase.from('supplier_bills').update(billData).eq('id', billId);
                if (error) throw error;
                // Simple approach: delete and re-insert items
                await supabase.from('supplier_bill_items').delete().eq('bill_id', billId);
            } else {
                const { data, error } = await supabase.from('supplier_bills').insert(billData).select().single();
                if (error) throw error;
                billIdToUse = data.id;
            }

            const itemsToInsert = lineItems.map(item => ({
                bill_id: billIdToUse,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                amount: item.amount,
            }));

            const { error: itemsError } = await supabase.from('supplier_bill_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const selectedVendor = vendors.find(v => v.id === formData.vendor_id);
    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: bgColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>
                    {isEditing ? 'Edit Bill' : t('newSupplierBill', language)}
                </Text>
                <Button
                    title={t('save', language)}
                    onPress={handleSave}
                    loading={loading}
                    size="small"
                />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Vendor Section */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>{t('vendor', language)}</Text>
                <TouchableOpacity
                    style={[styles.vendorSelector, { backgroundColor: cardBg, borderColor }]}
                    onPress={() => setShowVendorPicker(true)}
                >
                    <View style={[styles.vendorIcon, { backgroundColor: primaryColor + '20' }]}>
                        <Building color={primaryColor} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.vendorName, { color: selectedVendor ? textColor : mutedColor }]}>
                            {selectedVendor ? selectedVendor.name : t('selectVendor', language)}
                        </Text>
                        {selectedVendor && (
                            <Text style={[styles.vendorEmail, { color: mutedColor }]}>{selectedVendor.email}</Text>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Details Section */}
                <Card style={styles.detailsCard}>
                    <Input
                        label={t('billNumber', language)}
                        value={formData.bill_number}
                        onChangeText={(text) => setFormData({ ...formData, bill_number: text })}
                        placeholder="e.g. INV-2024-001"
                    />
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Date"
                                value={formData.issue_date}
                                onChangeText={(text) => setFormData({ ...formData, issue_date: text })}
                                placeholder="YYYY-MM-DD"
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Input
                                label="Due Date"
                                value={formData.due_date}
                                onChangeText={(text) => setFormData({ ...formData, due_date: text })}
                                placeholder="YYYY-MM-DD"
                            />
                        </View>
                    </View>
                </Card>

                {/* Items Section */}
                <View style={styles.itemsHeader}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Items</Text>
                    <TouchableOpacity onPress={addItem} style={[styles.addButton, { backgroundColor: primaryColor }]}>
                        <Plus color="#fff" size={16} />
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                </View>

                {lineItems.map((item, index) => (
                    <Card key={item.id} style={styles.itemCard}>
                        <View style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Input
                                    placeholder="Description"
                                    value={item.description}
                                    onChangeText={(text) => updateItem(item.id, { description: text })}
                                />
                            </View>
                            <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                                <Trash2 color="#ef4444" size={18} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Qty"
                                    keyboardType="numeric"
                                    value={String(item.quantity)}
                                    onChangeText={(text) => updateItem(item.id, { quantity: Number(text) || 0 })}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Input
                                    label="Price"
                                    keyboardType="numeric"
                                    value={String(item.unit_price)}
                                    onChangeText={(text) => updateItem(item.id, { unit_price: Number(text) || 0 })}
                                />
                            </View>
                            <View style={{ flex: 1.2, marginLeft: 12 }}>
                                <Text style={[styles.amountLabel, { color: mutedColor }]}>Amount</Text>
                                <Text style={[styles.amountValue, { color: textColor }]}>
                                    {item.amount.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </Card>
                ))}

                {/* Totals */}
                <Card style={styles.totalsCard}>
                    <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: mutedColor }]}>Subtotal</Text>
                        <Text style={[styles.totalValue, { color: textColor }]}>{calculateSubtotal().toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: mutedColor }]}>Tax</Text>
                        <View style={{ width: 80 }}>
                            <TextInput
                                style={[styles.taxInput, { color: textColor, borderBottomColor: borderColor }]}
                                keyboardType="numeric"
                                value={String(formData.tax_amount)}
                                onChangeText={(text) => setFormData({ ...formData, tax_amount: Number(text) || 0 })}
                            />
                        </View>
                    </View>
                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                        <Text style={[styles.grandTotalLabel, { color: textColor }]}>Total</Text>
                        <Text style={[styles.grandTotalValue, { color: primaryColor }]}>{calculateTotal().toFixed(2)}</Text>
                    </View>
                </Card>

                <Input
                    label="Notes"
                    value={formData.notes}
                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                    multiline
                    numberOfLines={3}
                />
            </ScrollView>

            {/* Vendor Picker Modal */}
            {showVendorPicker && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowVendorPicker(false)} />
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>{t('selectVendor', language)}</Text>
                            <TouchableOpacity onPress={() => setShowVendorPicker(false)}>
                                <Text style={{ color: primaryColor, fontWeight: 'bold' }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
                            <Search color={mutedColor} size={20} />
                            <TextInput
                                placeholder={t('search', language)}
                                placeholderTextColor={mutedColor}
                                style={[styles.searchInput, { color: textColor }]}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            <TouchableOpacity
                                style={[styles.vendorOption, { borderBottomColor: primaryColor + '20' }]}
                                onPress={() => {
                                    setShowVendorPicker(false);
                                    navigation.navigate('VendorForm');
                                }}
                            >
                                <View style={[styles.vendorIconSmall, { backgroundColor: primaryColor + '20' }]}>
                                    <Plus color={primaryColor} size={16} />
                                </View>
                                <Text style={[styles.vendorOptionText, { color: primaryColor, fontWeight: 'bold' }]}>
                                    {t('newVendor', language)}
                                </Text>
                            </TouchableOpacity>
                            {filteredVendors.map(vendor => (
                                <TouchableOpacity
                                    key={vendor.id}
                                    style={styles.vendorOption}
                                    onPress={() => {
                                        setFormData({ ...formData, vendor_id: vendor.id });
                                        setShowVendorPicker(false);
                                    }}
                                >
                                    <View style={[styles.vendorIconSmall, { backgroundColor: primaryColor + '10' }]}>
                                        <Building color={primaryColor} size={16} />
                                    </View>
                                    <Text style={[styles.vendorOptionText, { color: textColor }]}>{vendor.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: { padding: 4 },
    title: { fontSize: 20, fontWeight: 'bold' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    vendorSelector: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
    vendorIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    vendorName: { fontSize: 16, fontWeight: '600' },
    vendorEmail: { fontSize: 12, marginTop: 2 },
    detailsCard: { padding: 16, marginBottom: 20 },
    row: { flexDirection: 'row', alignItems: 'center' },
    itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
    addButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    itemCard: { padding: 16, marginBottom: 12 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    removeBtn: { padding: 8 },
    amountLabel: { fontSize: 12, marginBottom: 4 },
    amountValue: { fontSize: 16, fontWeight: 'bold' },
    totalsCard: { padding: 16, marginBottom: 20 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    totalLabel: { fontSize: 14 },
    totalValue: { fontSize: 14, fontWeight: '600' },
    grandTotalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    grandTotalLabel: { fontSize: 18, fontWeight: 'bold' },
    grandTotalValue: { fontSize: 18, fontWeight: 'bold' },
    taxInput: { fontSize: 14, textAlign: 'right', borderBottomWidth: 1, paddingVertical: 2 },
    modalContent: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: 400 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 16, gap: 10 },
    searchInput: { flex: 1, fontSize: 16 },
    vendorOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    vendorIconSmall: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    vendorOptionText: { fontSize: 16 },
});
