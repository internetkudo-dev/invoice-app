import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { ArrowLeft, Plus, Building, Calendar, FileText, Search, MoreVertical, Trash2, Edit2 } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Input, Button } from '../../components/common';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';
import { SupplierBill } from '../../types';

export function SupplierBillsListScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [bills, setBills] = useState<SupplierBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: profile } = await supabase.from('profiles').select('active_company_id, company_id').eq('id', user.id).single();
            const companyId = profile?.active_company_id || profile?.company_id || user.id;

            const { data, error } = await supabase
                .from('supplier_bills')
                .select('*, vendor:vendors(name)')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .order('issue_date', { ascending: false });

            if (error) throw error;
            setBills(data || []);
        } catch (error: any) {
            console.error('Error fetching bills:', error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this bill?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('supplier_bills').delete().eq('id', id);
                            if (error) throw error;
                            setBills(bills.filter(b => b.id !== id));
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const filteredBills = bills.filter(bill =>
        bill.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderBill = ({ item }: { item: SupplierBill }) => (
        <Card style={styles.billCard}>
            <View style={styles.billHeader}>
                <View style={[styles.vendorIcon, { backgroundColor: primaryColor + '15' }]}>
                    <Building color={primaryColor} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.vendorName, { color: textColor }]}>{item.vendor?.name || 'Unknown Vendor'}</Text>
                    <Text style={[styles.billNumber, { color: mutedColor }]}>#{item.bill_number}</Text>
                </View>
                <View style={styles.amountContainer}>
                    <Text style={[styles.amount, { color: textColor }]}>{formatCurrency(item.total_amount)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'paid' ? '#10b981' : (item.status === 'partial' ? '#f59e0b' : '#ef4444') + '20' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'paid' ? '#10b981' : (item.status === 'partial' ? '#f59e0b' : '#ef4444') }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.billFooter}>
                <View style={styles.footerItem}>
                    <Calendar color={mutedColor} size={14} />
                    <Text style={[styles.footerText, { color: mutedColor }]}>{item.issue_date}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => navigation.navigate('SupplierBillForm', { billId: item.id })} style={styles.actionBtn}>
                        <Edit2 color={primaryColor} size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                        <Trash2 color="#ef4444" size={18} />
                    </TouchableOpacity>
                </View>
            </View>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{t('management', language)}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('supplierBills', language)}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('SupplierBillForm')} style={[styles.addButton, { backgroundColor: cardBg }]}>
                    <Plus color={primaryColor} size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}>
                    <Search color={mutedColor} size={20} />
                    <Input
                        placeholder={t('search', language)}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={{ borderBottomWidth: 0, marginBottom: 0, flex: 1 }}
                    />
                </View>

                {loading ? (
                    <ActivityIndicator color={primaryColor} size="large" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filteredBills}
                        keyExtractor={(item) => item.id}
                        renderItem={renderBill}
                        contentContainerStyle={styles.listContent}
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchBills(); }}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <FileText color={mutedColor} size={48} />
                                <Text style={{ color: mutedColor, marginTop: 12 }}>No bills found.</Text>
                                <Button
                                    title={t('newSupplierBill', language)}
                                    onPress={() => navigation.navigate('SupplierBillForm')}
                                    style={{ marginTop: 20 }}
                                />
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    addButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, paddingHorizontal: 16 },
    searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 8 },
    listContent: { paddingBottom: 100 },
    billCard: { padding: 16, marginBottom: 16 },
    billHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    vendorIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    vendorName: { fontSize: 16, fontWeight: 'bold' },
    billNumber: { fontSize: 13, marginTop: 2 },
    amountContainer: { alignItems: 'flex-end' },
    amount: { fontSize: 16, fontWeight: 'bold' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    billFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 13 },
    actions: { flexDirection: 'row', gap: 16 },
    actionBtn: { padding: 4 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
});
