import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Building2, CreditCard, Calendar, MoreVertical, Trash2, Edit2 } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { VendorPayment, Vendor } from '../../types';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';

export function VendorPaymentsListScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [payments, setPayments] = useState<(VendorPayment & { vendor?: Vendor })[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useFocusEffect(
        useCallback(() => {
            fetchPayments();
        }, [user])
    );

    const fetchPayments = async () => {
        if (!user) return;
        setLoading(true);

        const { data: profileData } = await supabase.from('profiles').select('company_id, active_company_id').eq('id', user.id).single();
        const companyId = profileData?.active_company_id || profileData?.company_id || user.id;

        const { data } = await supabase
            .from('vendor_payments')
            .select('*, vendor:vendors(*)')
            .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
            .order('payment_date', { ascending: false });

        if (data) setPayments(data);
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchPayments();
        setRefreshing(false);
    };

    const handleDelete = (paymentId: string, paymentNumber: string) => {
        Alert.alert(
            t('delete', language),
            `Are you sure you want to delete "${paymentNumber}"?`,
            [
                { text: t('cancel', language), style: 'cancel' },
                {
                    text: t('delete', language),
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.from('vendor_payments').delete().eq('id', paymentId);
                        fetchPayments();
                    }
                }
            ]
        );
    };

    const getTotalPaid = () => {
        return payments.reduce((sum, p) => sum + Number(p.amount), 0);
    };

    const renderPayment = ({ item }: { item: VendorPayment & { vendor?: Vendor } }) => (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('VendorPaymentForm', { paymentId: item.id })}
        >
            <Card style={[styles.paymentCard, { backgroundColor: cardBg }]}>
                <View style={styles.paymentHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: '#0891b220' }]}>
                        <CreditCard color="#0891b2" size={20} />
                    </View>
                    <View style={styles.paymentInfo}>
                        <Text style={[styles.paymentNumber, { color: textColor }]}>{item.payment_number}</Text>
                        <Text style={[styles.vendorName, { color: mutedColor }]}>{item.vendor?.name || 'Unknown Vendor'}</Text>
                    </View>
                    <View style={styles.paymentRight}>
                        <Text style={[styles.amount, { color: '#10b981' }]}>{formatCurrency(item.amount)}</Text>
                        <TouchableOpacity
                            style={styles.menuButton}
                            onPress={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                        >
                            <MoreVertical color={mutedColor} size={18} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Calendar color={mutedColor} size={14} />
                        <Text style={[styles.detailText, { color: mutedColor }]}>
                            {new Date(item.payment_date).toLocaleDateString('sq-AL')}
                        </Text>
                    </View>
                    <View style={[styles.methodBadge, { backgroundColor: `${primaryColor}15` }]}>
                        <Text style={[styles.methodText, { color: primaryColor }]}>
                            {t(item.payment_method as any, language)}
                        </Text>
                    </View>
                </View>

                {item.description && (
                    <Text style={[styles.description, { color: mutedColor }]} numberOfLines={1}>
                        {item.description}
                    </Text>
                )}

                {/* Dropdown menu */}
                {activeMenu === item.id && (
                    <View style={[styles.dropdownMenu, { backgroundColor: cardBg, borderColor }]}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setActiveMenu(null);
                                navigation.navigate('VendorPaymentForm', { paymentId: item.id });
                            }}
                        >
                            <Edit2 color="#10b981" size={18} />
                            <Text style={[styles.menuText, { color: textColor }]}>{t('edit', language)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setActiveMenu(null);
                                handleDelete(item.id, item.payment_number);
                            }}
                        >
                            <Trash2 color="#ef4444" size={18} />
                            <Text style={[styles.menuText, { color: '#ef4444' }]}>{t('delete', language)}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>{t('vendorPayments', language)}</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: primaryColor }]}
                    onPress={() => navigation.navigate('VendorPaymentForm')}
                >
                    <Plus color="#fff" size={20} />
                </TouchableOpacity>
            </View>

            {/* Summary Card */}
            <Card style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryLabel, { color: mutedColor }]}>{t('totalReceived', language)}</Text>
                        <Text style={[styles.summaryValue, { color: '#10b981' }]}>{formatCurrency(getTotalPaid())}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryLabel, { color: mutedColor }]}>Payments</Text>
                        <Text style={[styles.summaryValue, { color: textColor }]}>{payments.length}</Text>
                    </View>
                </View>
            </Card>

            <FlatList
                data={payments}
                keyExtractor={(item) => item.id}
                renderItem={renderPayment}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <CreditCard color={mutedColor} size={48} />
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            {loading ? 'Loading...' : t('noPaymentsRecorded', language)}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: { padding: 4 },
    title: { fontSize: 22, fontWeight: 'bold' },
    addButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    summaryCard: { marginHorizontal: 16, marginBottom: 16, padding: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
    summaryItem: { alignItems: 'center' },
    summaryLabel: { fontSize: 12, marginBottom: 4 },
    summaryValue: { fontSize: 20, fontWeight: 'bold' },
    list: { padding: 16, paddingTop: 0 },
    paymentCard: { padding: 16, marginBottom: 12 },
    paymentHeader: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    paymentInfo: { flex: 1 },
    paymentNumber: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    vendorName: { fontSize: 13 },
    paymentRight: { alignItems: 'flex-end' },
    amount: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    menuButton: { padding: 4 },
    detailsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 13 },
    methodBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    methodText: { fontSize: 12, fontWeight: '600' },
    description: { marginTop: 8, fontSize: 13, fontStyle: 'italic' },
    dropdownMenu: { position: 'absolute', right: 16, top: 56, borderRadius: 12, borderWidth: 1, padding: 8, zIndex: 100, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
    menuText: { fontSize: 14, fontWeight: '500' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
    emptyText: { fontSize: 16 },
});
