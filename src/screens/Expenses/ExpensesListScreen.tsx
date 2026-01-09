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
import { ArrowLeft, Plus, ArrowUpCircle, ArrowDownCircle, MoreVertical } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, FAB } from '../../components/common';
import { Profile } from '../../types';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';

interface ExpensesListScreenProps {
    navigation: any;
    route?: any;
}

export function ExpensesListScreen({ navigation, route }: ExpensesListScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const type = route?.params?.type || 'expense'; // 'expense', 'income', 'dashboard'

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user, type])
    );

    const fetchData = async () => {
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
            setProfile(profileData);
            const companyId = profileData.company_id || user.id;

            if (type === 'income') {
                // Fetch paid invoices as income
                const { data } = await supabase
                    .from('invoices')
                    .select('*, client:clients(name)')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                    .eq('status', 'paid')
                    .order('issue_date', { ascending: false });

                setExpenses(data?.map(inv => ({
                    id: inv.id,
                    description: `${inv.invoice_number} - ${inv.client?.name || 'Client'}`,
                    amount: inv.total_amount,
                    date: inv.issue_date,
                    category: 'Invoice Payment',
                    type: 'income',
                })) || []);
            } else {
                // Fetch expenses
                const { data } = await supabase
                    .from('expenses')
                    .select('*')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                    .order('date', { ascending: false });

                setExpenses(data?.map(exp => ({
                    ...exp,
                    type: 'expense',
                })) || []);
            }
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const getTitle = () => {
        switch (type) {
            case 'income': return t('trackIncomes', language);
            case 'dashboard': return t('expensesDashboard', language);
            default: return t('trackExpenses', language);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isIncome = item.type === 'income';
        const Icon = isIncome ? ArrowDownCircle : ArrowUpCircle;
        const color = isIncome ? '#10b981' : '#ef4444';

        return (
            <TouchableOpacity activeOpacity={0.8}>
                <Card style={styles.itemCard}>
                    <View style={styles.itemContent}>
                        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                            <Icon color={color} size={22} />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
                                {item.description || item.category || 'Expense'}
                            </Text>
                            <Text style={[styles.itemDate, { color: mutedColor }]}>
                                {item.date ? new Date(item.date).toLocaleDateString() : 'No date'}
                            </Text>
                        </View>
                        <View style={styles.itemRight}>
                            <Text style={[styles.itemAmount, { color }]}>
                                {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                            </Text>
                            {item.category && (
                                <Text style={[styles.itemCategory, { color: mutedColor }]}>{item.category}</Text>
                            )}
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{type === 'income' ? t('finances', language) : t('management', language)}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{getTitle()}</Text>
                </View>
            </View>

            {/* Stats Summary */}
            <View style={styles.summaryCard}>
                <Card style={[styles.statCard, { backgroundColor: type === 'income' ? '#10b98115' : '#ef444415' }]}>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>
                        {type === 'income' ? t('totalIncomes', language) : t('totalExpenses', language)}
                    </Text>
                    <Text style={[styles.statValue, { color: type === 'income' ? '#10b981' : '#ef4444' }]}>
                        {formatCurrency(expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0))}
                    </Text>
                    <Text style={[styles.statCount, { color: mutedColor }]}>
                        {expenses.length} {type === 'income' ? 'payments' : 'expenses'}
                    </Text>
                </Card>
            </View>

            {/* List */}
            <FlatList
                data={expenses}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            {type === 'income' ? 'No income payments yet' : 'No expenses yet'}
                        </Text>
                    </View>
                }
            />

            {/* FAB for adding */}
            {type !== 'income' && (
                <FAB
                    onPress={() => navigation.navigate('ExpenseForm')}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, gap: 16 },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },

    summaryCard: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    statCard: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statCount: {
        fontSize: 12,
    },

    listContent: { padding: 16, paddingBottom: 100 },
    itemCard: { marginBottom: 10, padding: 16 },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemInfo: { flex: 1 },
    itemTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    itemDate: { fontSize: 12 },
    itemRight: { alignItems: 'flex-end' },
    itemAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    itemCategory: { fontSize: 11 },

    emptyContainer: { alignItems: 'center', marginTop: 48 },
    emptyText: { textAlign: 'center' },
});
