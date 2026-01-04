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
import { ArrowLeft, DollarSign, User, FileText, CreditCard, Building, Banknote } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';
import { Client, Invoice, Payment } from '../../types';
import { t } from '../../i18n';

export function PaymentFormScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { isDark, language } = useTheme();
    const paymentId = route.params?.paymentId;
    const preselectedInvoiceId = route.params?.invoiceId;
    const isEditing = !!paymentId;

    const [clients, setClients] = useState<Client[]>([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [showInvoicePicker, setShowInvoicePicker] = useState(false);

    const [formData, setFormData] = useState({
        payment_number: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash' as 'cash' | 'bank' | 'card',
        bank_reference: '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useEffect(() => {
        fetchClients();
        generatePaymentNumber();
        if (isEditing) fetchPayment();
    }, [paymentId]);

    useEffect(() => {
        if (selectedClient) {
            fetchUnpaidInvoices(selectedClient.id);
        }
    }, [selectedClient]);

    useEffect(() => {
        if (preselectedInvoiceId) {
            fetchInvoiceAndClient(preselectedInvoiceId);
        }
    }, [preselectedInvoiceId]);

    const generatePaymentNumber = async () => {
        const { count } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id);
        const nextNum = (count || 0) + 1;
        setFormData(prev => ({ ...prev, payment_number: `PAY-${String(nextNum).padStart(4, '0')}` }));
    };

    const fetchClients = async () => {
        const { data } = await supabase
            .from('clients')
            .select('*')
            .order('name');
        if (data) setClients(data);
    };

    const fetchUnpaidInvoices = async (clientId: string) => {
        const { data } = await supabase
            .from('invoices')
            .select('*')
            .eq('client_id', clientId)
            .neq('status', 'paid')
            .eq('type', 'invoice')
            .order('issue_date', { ascending: false });
        if (data) setUnpaidInvoices(data);
    };

    const fetchInvoiceAndClient = async (invoiceId: string) => {
        const { data: invoice } = await supabase
            .from('invoices')
            .select('*, client:clients(*)')
            .eq('id', invoiceId)
            .single();
        if (invoice) {
            setSelectedInvoice(invoice);
            if (invoice.client) {
                setSelectedClient(invoice.client);
            }
            setFormData(prev => ({ ...prev, amount: String(invoice.total_amount) }));
        }
    };

    const fetchPayment = async () => {
        const { data } = await supabase
            .from('payments')
            .select('*, client:clients(*), invoice:invoices(*)')
            .eq('id', paymentId)
            .single();
        if (data) {
            setSelectedClient(data.client);
            setSelectedInvoice(data.invoice);
            setFormData({
                payment_number: data.payment_number,
                amount: String(data.amount),
                payment_date: data.payment_date,
                payment_method: data.payment_method,
                bank_reference: data.bank_reference || '',
                notes: data.notes || '',
            });
        }
    };

    const handleSave = async () => {
        if (!formData.amount || Number(formData.amount) <= 0) {
            Alert.alert(t('error', language), 'Vendosni shumën e pagesës');
            return;
        }
        if (!selectedClient) {
            Alert.alert(t('error', language), 'Zgjidhni klientin');
            return;
        }

        setLoading(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id, active_company_id')
                .eq('id', user?.id)
                .single();

            const companyId = profile?.active_company_id || profile?.company_id || user?.id;

            const paymentData = {
                user_id: user?.id,
                company_id: companyId,
                client_id: selectedClient.id,
                invoice_id: selectedInvoice?.id || null,
                payment_number: formData.payment_number,
                amount: Number(formData.amount),
                payment_date: formData.payment_date,
                payment_method: formData.payment_method,
                bank_reference: formData.bank_reference || null,
                notes: formData.notes || null,
            };

            if (isEditing) {
                await supabase.from('payments').update(paymentData).eq('id', paymentId);
            } else {
                await supabase.from('payments').insert(paymentData);
            }

            // If payment matches invoice total, mark invoice as paid
            if (selectedInvoice && Number(formData.amount) >= selectedInvoice.total_amount) {
                await supabase
                    .from('invoices')
                    .update({ status: 'paid' })
                    .eq('id', selectedInvoice.id);
            }

            navigation.goBack();
        } catch (error) {
            console.error('Payment save error:', error);
            Alert.alert(t('error', language), 'Dështoi ruajtja e pagesës');
        } finally {
            setLoading(false);
        }
    };

    const paymentMethods = [
        { key: 'cash', label: 'Cash', icon: Banknote, color: '#10b981' },
        { key: 'bank', label: 'Bankë', icon: Building, color: '#3b82f6' },
        { key: 'card', label: 'Kartelë', icon: CreditCard, color: '#8b5cf6' },
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
                    {isEditing ? 'Modifiko Pagesën' : 'Pagesë e Re'}
                </Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Payment Number */}
                <Card style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <FileText color="#6366f1" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Detajet e Pagesës</Text>
                    </View>

                    <Input
                        label="Numri i Pagesës"
                        value={formData.payment_number}
                        onChangeText={(text) => setFormData({ ...formData, payment_number: text })}
                        placeholder="PAY-0001"
                    />

                    <Input
                        label="Data e Pagesës"
                        value={formData.payment_date}
                        onChangeText={(text) => setFormData({ ...formData, payment_date: text })}
                        placeholder="YYYY-MM-DD"
                    />
                </Card>

                {/* Client Selection */}
                <Card style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <User color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Klienti</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.pickerButton, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => setShowClientPicker(!showClientPicker)}
                    >
                        <Text style={[styles.pickerButtonText, { color: selectedClient ? textColor : mutedColor }]}>
                            {selectedClient ? selectedClient.name : 'Zgjidh Klientin'}
                        </Text>
                    </TouchableOpacity>

                    {showClientPicker && (
                        <View style={[styles.pickerList, { backgroundColor: cardBg, borderColor }]}>
                            {clients.map(client => (
                                <TouchableOpacity
                                    key={client.id}
                                    style={[styles.pickerItem, selectedClient?.id === client.id && styles.pickerItemActive]}
                                    onPress={() => {
                                        setSelectedClient(client);
                                        setSelectedInvoice(null);
                                        setShowClientPicker(false);
                                    }}
                                >
                                    <Text style={[styles.pickerItemText, { color: textColor }]}>{client.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </Card>

                {/* Invoice Selection */}
                {selectedClient && (
                    <Card style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <FileText color="#f59e0b" size={20} />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Fatura (Opsionale)</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.pickerButton, { backgroundColor: cardBg, borderColor }]}
                            onPress={() => setShowInvoicePicker(!showInvoicePicker)}
                        >
                            <Text style={[styles.pickerButtonText, { color: selectedInvoice ? textColor : mutedColor }]}>
                                {selectedInvoice ? `${selectedInvoice.invoice_number} - €${selectedInvoice.total_amount}` : 'Zgjidh Faturën (opsionale)'}
                            </Text>
                        </TouchableOpacity>

                        {showInvoicePicker && (
                            <View style={[styles.pickerList, { backgroundColor: cardBg, borderColor }]}>
                                {unpaidInvoices.length === 0 ? (
                                    <Text style={[styles.noItems, { color: mutedColor }]}>Nuk ka fatura të papaguara</Text>
                                ) : (
                                    unpaidInvoices.map(invoice => (
                                        <TouchableOpacity
                                            key={invoice.id}
                                            style={[styles.pickerItem, selectedInvoice?.id === invoice.id && styles.pickerItemActive]}
                                            onPress={() => {
                                                setSelectedInvoice(invoice);
                                                setFormData({ ...formData, amount: String(invoice.total_amount) });
                                                setShowInvoicePicker(false);
                                            }}
                                        >
                                            <Text style={[styles.pickerItemText, { color: textColor }]}>
                                                {invoice.invoice_number}
                                            </Text>
                                            <Text style={[styles.pickerItemSubtext, { color: mutedColor }]}>
                                                €{invoice.total_amount} • {invoice.status}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}
                    </Card>
                )}

                {/* Amount & Method */}
                <Card style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <DollarSign color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Shuma & Mënyra</Text>
                    </View>

                    <Input
                        label="Shuma e Pagesës *"
                        value={formData.amount}
                        onChangeText={(text) => setFormData({ ...formData, amount: text })}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                    />

                    <Text style={[styles.label, { color: textColor }]}>Mënyra e Pagesës</Text>
                    <View style={styles.methodGrid}>
                        {paymentMethods.map(method => {
                            const Icon = method.icon;
                            const isActive = formData.payment_method === method.key;
                            return (
                                <TouchableOpacity
                                    key={method.key}
                                    style={[
                                        styles.methodOption,
                                        { backgroundColor: isActive ? method.color : (isDark ? '#334155' : '#f1f5f9') }
                                    ]}
                                    onPress={() => setFormData({ ...formData, payment_method: method.key as any })}
                                >
                                    <Icon color={isActive ? '#fff' : mutedColor} size={20} />
                                    <Text style={[styles.methodText, { color: isActive ? '#fff' : mutedColor }]}>
                                        {method.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {formData.payment_method === 'bank' && (
                        <Input
                            label="Referenca Bankare"
                            value={formData.bank_reference}
                            onChangeText={(text) => setFormData({ ...formData, bank_reference: text })}
                            placeholder="Nr. i transferit bankar"
                        />
                    )}

                    <Input
                        label="Shënime"
                        value={formData.notes}
                        onChangeText={(text) => setFormData({ ...formData, notes: text })}
                        placeholder="Shënime shtesë..."
                        multiline
                    />
                </Card>

                <Button
                    title={isEditing ? 'Përditëso Pagesën' : 'Regjistro Pagesën'}
                    onPress={handleSave}
                    loading={loading}
                    variant="primary"
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
    card: { padding: 16, marginBottom: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600' },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 12 },
    pickerButton: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    pickerButtonText: { fontSize: 15 },
    pickerList: {
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    pickerItem: {
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    pickerItemActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    pickerItemText: { fontSize: 15, fontWeight: '500' },
    pickerItemSubtext: { fontSize: 12, marginTop: 2 },
    noItems: { padding: 14, textAlign: 'center' },
    methodGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    methodOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    methodText: { fontWeight: '600', fontSize: 13 },
    saveButton: { marginTop: 8 },
});
