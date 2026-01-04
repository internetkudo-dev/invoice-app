import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, DollarSign, User, FileText, Banknote, Building, CreditCard } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { Payment } from '../../types';
import { t } from '../../i18n';

export function PaymentsListScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, language, primaryColor } = useTheme();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [totalReceived, setTotalReceived] = useState(0);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    useFocusEffect(
        useCallback(() => {
            fetchPayments();
        }, [user])
    );

    const fetchPayments = async () => {
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, active_company_id')
            .eq('id', user.id)
            .single();

        const companyId = profile?.active_company_id || profile?.company_id || user.id;

        const { data } = await supabase
            .from('payments')
            .select('*, client:clients(*), invoice:invoices(*)')
            .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
            .order('payment_date', { ascending: false });

        if (data) {
            setPayments(data);
            const total = data.reduce((sum, p) => sum + Number(p.amount), 0);
            setTotalReceived(total);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchPayments();
        setRefreshing(false);
    };

    const getMethodIcon = (method: string) => {
        switch (method) {
            case 'bank': return Building;
            case 'card': return CreditCard;
            default: return Banknote;
        }
    };

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'bank': return '#3b82f6';
            case 'card': return '#8b5cf6';
            default: return '#10b981';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('sq-AL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderPayment = ({ item }: { item: Payment }) => {
        const MethodIcon = getMethodIcon(item.payment_method);
        const methodColor = getMethodColor(item.payment_method);

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('PaymentForm', { paymentId: item.id })}
            >
                <Card style={styles.paymentCard}>
                    <View style={styles.paymentRow}>
                        <View style={[styles.methodBadge, { backgroundColor: `${methodColor}15` }]}>
                            <MethodIcon color={methodColor} size={20} />
                        </View>

                        <View style={styles.paymentInfo}>
                            <Text style={[styles.paymentNumber, { color: textColor }]}>
                                {item.payment_number}
                            </Text>
                            <View style={styles.paymentMeta}>
                                <User color={mutedColor} size={12} />
                                <Text style={[styles.paymentMetaText, { color: mutedColor }]}>
                                    {item.client?.name || 'Pa klient'}
                                </Text>
                            </View>
                            {item.invoice && (
                                <View style={styles.paymentMeta}>
                                    <FileText color={mutedColor} size={12} />
                                    <Text style={[styles.paymentMetaText, { color: mutedColor }]}>
                                        {item.invoice.invoice_number}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.paymentRight}>
                            <Text style={[styles.paymentAmount, { color: '#10b981' }]}>
                                +€{Number(item.amount).toFixed(2)}
                            </Text>
                            <Text style={[styles.paymentDate, { color: mutedColor }]}>
                                {formatDate(item.payment_date)}
                            </Text>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Pagesat Hyrëse</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: primaryColor }]}
                    onPress={() => navigation.navigate('PaymentForm')}
                >
                    <Plus color="#fff" size={20} />
                </TouchableOpacity>
            </View>

            {/* Summary Card */}
            <Card style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryIcon, { backgroundColor: '#10b98115' }]}>
                        <DollarSign color="#10b981" size={24} />
                    </View>
                    <View>
                        <Text style={[styles.summaryLabel, { color: mutedColor }]}>Total i Pranuar</Text>
                        <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                            €{totalReceived.toFixed(2)}
                        </Text>
                    </View>
                </View>
            </Card>

            {/* Payments List */}
            <FlatList
                data={payments}
                renderItem={renderPayment}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <DollarSign color={mutedColor} size={48} />
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            Nuk ka pagesa të regjistruara
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 16,
    },
    backButton: { marginRight: 16, padding: 4 },
    title: { fontSize: 22, fontWeight: 'bold', flex: 1 },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    summaryIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryLabel: { fontSize: 13, marginBottom: 2 },
    summaryValue: { fontSize: 24, fontWeight: 'bold' },
    listContent: { padding: 16, paddingTop: 0 },
    paymentCard: { padding: 14, marginBottom: 12 },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    methodBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    paymentInfo: { flex: 1 },
    paymentNumber: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
    paymentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    paymentMetaText: { fontSize: 12 },
    paymentRight: { alignItems: 'flex-end' },
    paymentAmount: { fontSize: 16, fontWeight: 'bold' },
    paymentDate: { fontSize: 12, marginTop: 2 },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: { fontSize: 15 },
});
