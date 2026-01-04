import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { ArrowLeft, Building2, CreditCard, Calendar, FileText, Hash } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';
import { Vendor } from '../../types';
import { t } from '../../i18n';

export function VendorPaymentFormScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { isDark, language, primaryColor } = useTheme();
    const paymentId = route.params?.paymentId;
    const preselectedVendorId = route.params?.vendorId;
    const isEditing = !!paymentId;

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
    const [showVendorPicker, setShowVendorPicker] = useState(false);
    const [showBillPicker, setShowBillPicker] = useState(false);
    const [selectedBill, setSelectedBill] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        vendor_id: preselectedVendorId || '',
        payment_number: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank' as 'cash' | 'bank' | 'card',
        bank_reference: '',
        description: '',
        notes: '',
    });

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useEffect(() => {
        fetchVendors();
        if (isEditing) fetchPayment();
        else generatePaymentNumber();
    }, []);

    useEffect(() => {
        if (formData.vendor_id) {
            fetchUnpaidBills(formData.vendor_id);
        }
    }, [formData.vendor_id]);

    const fetchVendors = async () => {
        if (!user) return;
        const { data: profileData } = await supabase.from('profiles').select('company_id, active_company_id').eq('id', user.id).single();
        const companyId = profileData?.active_company_id || profileData?.company_id || user.id;

        const { data } = await supabase
            .from('vendors')
            .select('*')
            .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
            .order('name');
        if (data) setVendors(data);
    };

    const fetchUnpaidBills = async (vendorId: string) => {
        const { data } = await supabase
            .from('supplier_bills')
            .select('*')
            .eq('vendor_id', vendorId)
            .neq('status', 'paid')
            .order('issue_date', { ascending: false });
        if (data) setUnpaidBills(data || []);
    };

    const fetchPayment = async () => {
        const { data } = await supabase.from('vendor_payments').select('*').eq('id', paymentId).single();
        if (data) {
            setFormData({
                vendor_id: data.vendor_id || '',
                payment_number: data.payment_number || '',
                amount: String(data.amount) || '',
                payment_date: data.payment_date || new Date().toISOString().split('T')[0],
                payment_method: data.payment_method || 'bank',
                bank_reference: data.bank_reference || '',
                description: data.description || '',
                notes: data.notes || '',
            });
        }
    };

    const generatePaymentNumber = async () => {
        if (!user) return;
        const { data: profileData } = await supabase.from('profiles').select('company_id, active_company_id').eq('id', user.id).single();
        const companyId = profileData?.active_company_id || profileData?.company_id || user.id;

        const { count } = await supabase
            .from('vendor_payments')
            .select('*', { count: 'exact', head: true })
            .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

        const nextNumber = (count || 0) + 1;
        setFormData(prev => ({ ...prev, payment_number: `VP-${String(nextNumber).padStart(4, '0')}` }));
    };

    const handleSave = async () => {
        if (!formData.vendor_id) {
            Alert.alert(t('error', language), 'Please select a vendor');
            return;
        }
        if (!formData.amount || Number(formData.amount) <= 0) {
            Alert.alert(t('error', language), 'Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            const { data: profileData } = await supabase.from('profiles').select('company_id, active_company_id').eq('id', user?.id).single();
            const companyId = profileData?.active_company_id || profileData?.company_id || user?.id;

            const paymentData = {
                vendor_id: formData.vendor_id,
                payment_number: formData.payment_number,
                amount: Number(formData.amount),
                payment_date: formData.payment_date,
                payment_method: formData.payment_method,
                bank_reference: formData.bank_reference || null,
                description: formData.description || null,
                notes: formData.notes || null,
            };

            if (isEditing) {
                await supabase.from('vendor_payments').update(paymentData).eq('id', paymentId);
            } else {
                await supabase.from('vendor_payments').insert({ ...paymentData, user_id: user?.id, company_id: companyId });
            }

            // Update supplier bill status if selected
            if (selectedBill && Number(formData.amount) >= selectedBill.total_amount) {
                await supabase
                    .from('supplier_bills')
                    .update({ status: 'paid' })
                    .eq('id', selectedBill.id);
            }

            navigation.goBack();
        } catch (error) {
            Alert.alert(t('error', language), 'Failed to save payment');
        } finally {
            setLoading(false);
        }
    };

    const selectedVendor = vendors.find(v => v.id === formData.vendor_id);

    const paymentMethods = [
        { key: 'bank', label: t('bank', language), icon: Building2 },
        { key: 'cash', label: t('cash', language), icon: CreditCard },
        { key: 'card', label: t('card', language), icon: CreditCard },
    ];

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bgColor }]}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>
                    {isEditing ? t('editPayment', language) : t('newPayment', language)}
                </Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Vendor Selection */}
                <Card style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Building2 color="#0891b2" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('selectVendor', language)}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.picker, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor }]}
                        onPress={() => setShowVendorPicker(!showVendorPicker)}
                    >
                        <Text style={{ color: selectedVendor ? textColor : mutedColor }}>
                            {selectedVendor?.name || t('selectVendor', language)}
                        </Text>
                    </TouchableOpacity>
                    {showVendorPicker && (
                        <View style={[styles.pickerList, { borderColor, backgroundColor: cardBg }]}>
                            {vendors.map(v => (
                                <TouchableOpacity
                                    key={v.id}
                                    style={[styles.pickerItem, { borderBottomColor: borderColor }]}
                                    onPress={() => {
                                        setFormData({ ...formData, vendor_id: v.id });
                                        setShowVendorPicker(false);
                                    }}
                                >
                                    <Text style={{ color: textColor }}>{v.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </Card>

                {/* Bill Selection - Similar to Income Payment logic */}
                {formData.vendor_id ? (
                    <Card style={[styles.section, { backgroundColor: cardBg }]}>
                        <View style={styles.sectionHeader}>
                            <FileText color="#f59e0b" size={20} />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Zgjidh Faturën e Furnitorit (Opsionale)</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.picker, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor }]}
                            onPress={() => setShowBillPicker(!showBillPicker)}
                        >
                            <Text style={{ color: selectedBill ? textColor : mutedColor }}>
                                {selectedBill ? `${selectedBill.bill_number} - €${selectedBill.total_amount}` : 'Zgjidh faturën për të paguar'}
                            </Text>
                        </TouchableOpacity>
                        {showBillPicker && (
                            <View style={[styles.pickerList, { borderColor, backgroundColor: cardBg }]}>
                                {unpaidBills.length === 0 ? (
                                    <Text style={{ padding: 12, textAlign: 'center', color: mutedColor }}>S'ka fatura të papaguara</Text>
                                ) : (
                                    unpaidBills.map(bill => (
                                        <TouchableOpacity
                                            key={bill.id}
                                            style={[styles.pickerItem, { borderBottomColor: borderColor }]}
                                            onPress={() => {
                                                setSelectedBill(bill);
                                                setFormData({ ...formData, amount: String(bill.total_amount), description: `Pagesë për faturën #${bill.bill_number}` });
                                                setShowBillPicker(false);
                                            }}
                                        >
                                            <View>
                                                <Text style={{ color: textColor, fontWeight: '500' }}>{bill.bill_number}</Text>
                                                <Text style={{ color: mutedColor, fontSize: 12 }}>Data: {bill.issue_date} • €{bill.total_amount}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}
                    </Card>
                ) : null}

                {/* Payment Details */}
                <Card style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Hash color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('paymentDetails', language)}</Text>
                    </View>
                    <Input
                        label={t('paymentNumber', language)}
                        value={formData.payment_number}
                        onChangeText={(text) => setFormData({ ...formData, payment_number: text })}
                        placeholder="VP-0001"
                    />
                    <Input
                        label={`${t('paymentAmount', language)} (€)`}
                        value={formData.amount}
                        onChangeText={(text) => setFormData({ ...formData, amount: text })}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                    />
                    <Input
                        label={t('paymentDate', language)}
                        value={formData.payment_date}
                        onChangeText={(text) => setFormData({ ...formData, payment_date: text })}
                        placeholder="YYYY-MM-DD"
                    />
                </Card>

                {/* Payment Method */}
                <Card style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <CreditCard color="#f59e0b" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('paymentMethod', language)}</Text>
                    </View>
                    <View style={styles.methodRow}>
                        {paymentMethods.map(method => (
                            <TouchableOpacity
                                key={method.key}
                                style={[
                                    styles.methodButton,
                                    { borderColor: formData.payment_method === method.key ? primaryColor : borderColor },
                                    formData.payment_method === method.key && { backgroundColor: `${primaryColor}15` }
                                ]}
                                onPress={() => setFormData({ ...formData, payment_method: method.key as any })}
                            >
                                <Text style={{ color: formData.payment_method === method.key ? primaryColor : mutedColor, fontWeight: '600' }}>
                                    {method.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {formData.payment_method === 'bank' && (
                        <Input
                            label={t('bankReference', language)}
                            value={formData.bank_reference}
                            onChangeText={(text) => setFormData({ ...formData, bank_reference: text })}
                            placeholder="Transaction reference"
                        />
                    )}
                </Card>

                {/* Description & Notes */}
                <Card style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <FileText color="#8b5cf6" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('description', language)}</Text>
                    </View>
                    <Input
                        label={t('description', language)}
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        placeholder="e.g., Fatura e Hyrjes #502"
                    />
                    <Input
                        label={t('notes', language)}
                        value={formData.notes}
                        onChangeText={(text) => setFormData({ ...formData, notes: text })}
                        placeholder="Additional notes..."
                        multiline
                        numberOfLines={3}
                    />
                </Card>

                <Button
                    title={isEditing ? t('updatePayment', language) : t('registerPayment', language)}
                    onPress={handleSave}
                    loading={loading}
                    style={styles.saveButton}
                />
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
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    picker: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1 },
    pickerList: { marginTop: 8, borderWidth: 1, borderRadius: 8, maxHeight: 200 },
    pickerItem: { padding: 12, borderBottomWidth: 1 },
    methodRow: { flexDirection: 'row', gap: 10 },
    methodButton: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, alignItems: 'center' },
    saveButton: { marginTop: 8 },
});
