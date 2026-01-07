import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Plus,
    LayoutDashboard,
    ChevronRight,
    Wallet,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Calendar,
} from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { Profile } from '../../types';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';

const { width } = Dimensions.get('window');

interface ActionItem {
    key: string;
    labelKey: string;
    icon: any;
    color: string;
    action: string;
}

// Dashboard action items
const dashboardActions: ActionItem[] = [
    { key: 'expensesDashboard', labelKey: 'expensesDashboard', icon: PieChart, color: '#6366f1', action: 'dashboard' },
    { key: 'expenseReports', labelKey: 'expenseReports', icon: BarChart3, color: '#8b5cf6', action: 'reports' },
];

// Expense tracking items
const expenseActions: ActionItem[] = [
    { key: 'trackExpenses', labelKey: 'trackExpenses', icon: LayoutDashboard, color: '#ef4444', action: 'list' },
    { key: 'addExpense', labelKey: 'addExpense', icon: Plus, color: '#f97316', action: 'add' },
];

// Income tracking items
const incomeActions: ActionItem[] = [
    { key: 'trackIncomes', labelKey: 'trackIncomes', icon: LayoutDashboard, color: '#10b981', action: 'list' },
    { key: 'addIncome', labelKey: 'addIncome', icon: Plus, color: '#059669', action: 'add' },
];

export function ExpensesDashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalExpenses: 0,
        totalIncomes: 0,
        balance: 0,
        monthlyExpenses: 0,
        monthlyIncomes: 0,
        expenseCount: 0,
        incomeCount: 0,
    });

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user])
    );

    const fetchData = async () => {
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
            setProfile(profileData);
            const companyId = profileData.company_id || user.id;

            // Get current month start date
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

            // Fetch all expenses
            const { data: expenses } = await supabase
                .from('expenses')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            // Calculate totals
            const totalExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.amount || 0), 0) || 0;

            // Calculate monthly expenses
            const monthlyExpenses = expenses?.filter(exp => exp.date >= monthStart)
                .reduce((sum, exp) => sum + Number(exp.amount || 0), 0) || 0;

            // Fetch invoices for income (paid invoices)
            const { data: paidInvoices } = await supabase
                .from('invoices')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('status', 'paid');

            const totalIncomes = paidInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;

            const monthlyIncomes = paidInvoices?.filter(inv => inv.issue_date >= monthStart)
                .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;

            setStats({
                totalExpenses,
                totalIncomes,
                balance: totalIncomes - totalExpenses,
                monthlyExpenses,
                monthlyIncomes,
                expenseCount: expenses?.length || 0,
                incomeCount: paidInvoices?.length || 0,
            });
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleAction = (action: ActionItem, type: 'expense' | 'income' | 'dashboard') => {
        switch (action.action) {
            case 'dashboard':
            case 'reports':
            case 'list':
                navigation.navigate('ExpensesList', { type });
                break;
            case 'add':
                // Both expense and income use ExpenseForm, just with different type param
                navigation.navigate('ExpenseForm', { type: type === 'income' ? 'income' : 'expense' });
                break;
        }
    };

    const renderActionCard = (item: ActionItem, onPress: () => void) => {
        const Icon = item.icon;
        const label = t(item.labelKey as any, language);

        return (
            <TouchableOpacity
                key={item.key}
                activeOpacity={0.8}
                onPress={onPress}
            >
                <Card style={[styles.actionCard, { borderLeftColor: item.color, borderLeftWidth: 4 }]}>
                    <View style={styles.actionCardContent}>
                        <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                            <Icon color={item.color} size={24} />
                        </View>
                        <View style={styles.actionCardInfo}>
                            <Text style={[styles.actionCardTitle, { color: textColor }]}>{label}</Text>
                        </View>
                        <ChevronRight color={mutedColor} size={20} />
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: textColor }]}>{t('expenses', language)}</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: `${primaryColor}15` }]}>
                    <Wallet color={primaryColor} size={24} />
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Stats */}
                <View style={styles.statsGrid}>
                    <Card style={[styles.statCard, { borderTopColor: '#ef4444', borderTopWidth: 4 }]}>
                        <View style={styles.statHeader}>
                            <TrendingDown color="#ef4444" size={20} />
                            <Text style={[styles.statLabel, { color: mutedColor }]}>{t('totalExpenses', language)}</Text>
                        </View>
                        <Text style={[styles.statValue, { color: '#ef4444' }]}>
                            {formatCurrency(stats.totalExpenses)}
                        </Text>
                        <Text style={[styles.statSubtext, { color: mutedColor }]}>
                            {t('thisMonth', language)}: {formatCurrency(stats.monthlyExpenses)}
                        </Text>
                    </Card>

                    <Card style={[styles.statCard, { borderTopColor: '#10b981', borderTopWidth: 4 }]}>
                        <View style={styles.statHeader}>
                            <TrendingUp color="#10b981" size={20} />
                            <Text style={[styles.statLabel, { color: mutedColor }]}>{t('totalIncomes', language)}</Text>
                        </View>
                        <Text style={[styles.statValue, { color: '#10b981' }]}>
                            {formatCurrency(stats.totalIncomes)}
                        </Text>
                        <Text style={[styles.statSubtext, { color: mutedColor }]}>
                            {t('thisMonth', language)}: {formatCurrency(stats.monthlyIncomes)}
                        </Text>
                    </Card>
                </View>

                {/* Balance Card */}
                <Card style={[styles.balanceCard, { backgroundColor: stats.balance >= 0 ? '#10b98115' : '#ef444415' }]}>
                    <View style={styles.balanceContent}>
                        <View>
                            <Text style={[styles.balanceLabel, { color: mutedColor }]}>{t('balance', language)}</Text>
                            <Text style={[styles.balanceValue, { color: stats.balance >= 0 ? '#10b981' : '#ef4444' }]}>
                                {formatCurrency(stats.balance)}
                            </Text>
                        </View>
                        <View style={[styles.balanceIcon, { backgroundColor: stats.balance >= 0 ? '#10b981' : '#ef4444' }]}>
                            {stats.balance >= 0 ?
                                <TrendingUp color="#fff" size={24} /> :
                                <TrendingDown color="#fff" size={24} />
                            }
                        </View>
                    </View>
                </Card>

                {/* Dashboard Section */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <BarChart3 color="#6366f1" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('expensesDashboard', language)}</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    {dashboardActions.map(action =>
                        renderActionCard(action, () => handleAction(action, 'dashboard'))
                    )}
                </View>

                {/* Track Expenses Section */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <ArrowUpCircle color="#ef4444" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('trackExpenses', language)}</Text>
                    </View>
                    <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>
                        {stats.expenseCount} {t('expenses', language).toLowerCase()}
                    </Text>
                </View>
                <View style={styles.grid}>
                    {expenseActions.map(action =>
                        renderActionCard(action, () => handleAction(action, 'expense'))
                    )}
                </View>

                {/* Track Incomes Section */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <ArrowDownCircle color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('trackIncomes', language)}</Text>
                    </View>
                    <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>
                        {stats.incomeCount} {t('invoices', language).toLowerCase()}
                    </Text>
                </View>
                <View style={styles.grid}>
                    {incomeActions.map(action =>
                        renderActionCard(action, () => handleAction(action, 'income'))
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16
    },
    title: { fontSize: 28, fontWeight: 'bold' },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },

    scroll: { flex: 1 },
    scrollContent: { padding: 16 },

    // Stats grid
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statSubtext: {
        fontSize: 11,
    },

    // Balance card
    balanceCard: {
        padding: 20,
        marginBottom: 16,
        borderRadius: 16,
    },
    balanceContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    balanceValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    balanceIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Section headers
    sectionHeader: {
        marginTop: 8,
        marginBottom: 12,
        paddingHorizontal: 4
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700'
    },
    sectionSubtitle: {
        fontSize: 13,
        marginLeft: 28,
    },

    // Grid
    grid: {
        gap: 12,
        marginBottom: 8,
    },

    // Action card styles
    actionCard: {
        padding: 16,
        borderRadius: 16,
    },
    actionCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionCardInfo: { flex: 1 },
    actionCardTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
});
