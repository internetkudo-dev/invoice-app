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
import { Briefcase, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Users, Package, FileText, BarChart2, QrCode, AlertTriangle, Calendar, Clock, Receipt, ScanLine, User, Settings, ChevronRight, ShoppingCart, CreditCard, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, StatusBadge, Button, FAB } from '../../components/common';
import { Invoice, Profile, Client, Expense } from '../../types';
import { formatCurrency } from '../../utils/format';
import { stripeService } from '../../services/stripeService';
import { t } from '../../i18n';

const { width } = Dimensions.get('window');

export function DashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [monthlyStats, setMonthlyStats] = useState<{ month: string; revenue: number; expenses: number }[]>([]);
    const [mostSoldProduct, setMostSoldProduct] = useState<{ name: string; quantity: number } | null>(null);
    const [topClients, setTopClients] = useState<{ name: string; total: number }[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
    const [todayStats, setTodayStats] = useState({
        revenue: 0,
        invoiceCount: 0,
        expenseCount: 0,
        expenseTotal: 0,
    });

    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        invoiceCount: 0,
        clientCount: 0,
        productCount: 0,
        growth: 0,
    });

    const [stripeSummary, setStripeSummary] = useState({
        totalSales: 0,
        totalNet: 0,
        totalPayouts: 0,
        pendingPayouts: 0,
        isConnected: false
    });
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<{ month: string; revenue: number; expenses: number } | null>(null);

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
            const companyId = profileData.active_company_id || profileData.company_id || user.id;

            const { data: invoicesData } = await supabase
                .from('invoices')
                .select(`*, client:clients(name), items:invoice_items(*)`)
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .order('created_at', { ascending: false });

            const { data: expensesData } = await supabase
                .from('expenses')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            const { data: clientsData } = await supabase
                .from('clients')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            const { data: allProducts } = await supabase
                .from('products')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            if (allProducts) {
                const lowStock = allProducts.filter(p => (p as any).track_stock && ((p as any).stock_quantity || 0) <= ((p as any).low_stock_threshold || 5));
                setLowStockProducts(lowStock);
            }

            // Fetch Stripe summary
            const stripeStatus = await stripeService.checkConnectionStatus(user.id);
            if (stripeStatus.connected) {
                const summary = await stripeService.getDashboardSummary(user.id, companyId);
                setStripeSummary({
                    totalSales: summary.totalSales,
                    totalNet: summary.totalNet,
                    totalPayouts: summary.totalPayouts,
                    pendingPayouts: summary.pendingPayouts,
                    isConnected: true
                });
            } else {
                setStripeSummary(prev => ({ ...prev, isConnected: false }));
            }

            if (invoicesData && expensesData) {
                setInvoices(invoicesData);

                // Today's stats
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const todayInvoices = (invoicesData as any[]).filter(inv => {
                    const invDate = new Date(inv.issue_date);
                    invDate.setHours(0, 0, 0, 0);
                    return invDate.getTime() === today.getTime();
                });

                const todayExpenses = (expensesData as any[]).filter(exp => {
                    const expDate = new Date(exp.date);
                    expDate.setHours(0, 0, 0, 0);
                    return expDate.getTime() === today.getTime();
                });

                setTodayStats({
                    revenue: todayInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
                    invoiceCount: todayInvoices.length,
                    expenseCount: todayExpenses.length,
                    expenseTotal: todayExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0),
                });

                const revenue = (invoicesData as any[]).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
                const expenses = (expensesData as any[]).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
                const paid = (invoicesData as any[]).filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
                const pending = (invoicesData as any[]).filter((inv) => inv.status === 'sent' || inv.status === 'draft').reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
                const overdue = (invoicesData as any[]).filter((inv) => inv.status === 'overdue').reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

                // Chart data: Last 6 months
                const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const last6Months = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const monthIdx = d.getMonth();
                    const year = d.getFullYear();

                    const rev = (invoicesData as any[]).filter(inv => {
                        const invDate = new Date(inv.issue_date);
                        return invDate.getMonth() === monthIdx && invDate.getFullYear() === year;
                    }).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

                    const exp = (expensesData as any[]).filter(e => {
                        const eDate = new Date(e.date);
                        return eDate.getMonth() === monthIdx && eDate.getFullYear() === year;
                    }).reduce((sum, e) => sum + Number(e.amount || 0), 0);

                    last6Months.push({ month: monthsNames[monthIdx], revenue: rev, expenses: exp });
                }
                setMonthlyStats(last6Months);
                // Select the last month by default (current month)
                if (last6Months.length > 0) {
                    setSelectedMonth(last6Months[last6Months.length - 1]);
                }

                // Most sold products
                const productSales: any = {};
                (invoicesData as any[]).forEach(inv => {
                    (inv.items || []).forEach((it: any) => {
                        productSales[it.description] = (productSales[it.description] || 0) + Number(it.quantity);
                    });
                });
                const sortedProducts = Object.entries(productSales).sort((a: any, b: any) => b[1] - a[1]);
                if (sortedProducts.length > 0) setMostSoldProduct({ name: sortedProducts[0][0], quantity: sortedProducts[0][1] as number });

                // Top clients
                const clientSales: any = {};
                (invoicesData as any[]).forEach(inv => {
                    const name = inv.client?.name || 'Unknown';
                    clientSales[name] = (clientSales[name] || 0) + Number(inv.total_amount);
                });
                const sortedClients = Object.entries(clientSales).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
                setTopClients(sortedClients.map(c => ({ name: c[0], total: c[1] as number })));

                setStats({
                    totalRevenue: revenue,
                    totalExpenses: expenses,
                    netProfit: revenue - expenses,
                    paid,
                    pending,
                    overdue,
                    invoiceCount: invoicesData.length,
                    clientCount: clientsData?.length || 0,
                    productCount: allProducts?.length || 0,
                    growth: 12.5, // Placeholder
                });
            }
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const maxVal = Math.max(...monthlyStats.map(m => Math.max(m.revenue, m.expenses)), 100); // Minimum 100 to avoid div by zero issues visually

    const renderStatCard = (title: string, value: string | number, icon: any, color: string) => {
        const Icon = icon;

        // Simple heuristic: if value is a string and contains currency symbols
        const isMoney = (typeof value === 'string' && (value.includes('€') || value.includes('$') || value.includes('£') || value.includes('Lek')));
        const finalValue = (isPrivacyMode && isMoney) ? '****' : value;

        return (
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
                <View style={[styles.statIcon, { backgroundColor: color + '15', alignSelf: 'flex-start' }]}>
                    <Icon color={color} size={20} />
                </View>
                <View style={{ marginTop: 12 }}>
                    <Text style={[styles.statValue, { color: textColor }]}>{finalValue}</Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>{title}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{t('welcomeBack', language)},</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={[styles.title, { color: textColor }]}>{profile?.company_name || 'My Business'}</Text>
                        <TouchableOpacity onPress={() => setIsPrivacyMode(!isPrivacyMode)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            {isPrivacyMode ? (
                                <EyeOff color={mutedColor} size={20} />
                            ) : (
                                <Eye color={mutedColor} size={20} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'SettingsMain' })} style={[styles.iconButton, { backgroundColor: cardBg }]}>
                        <Settings color={isDark ? '#fff' : '#1e293b'} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />}
            >
                {/* Unified Stats Row - similar to HR Dashboard */}
                <View style={styles.statsRow}>
                    {renderStatCard(t('todayRevenue', language), formatCurrency(todayStats.revenue), TrendingUp, '#6366f1')}
                    {renderStatCard(t('todayInvoices', language), todayStats.invoiceCount, Receipt, '#10b981')}
                    {renderStatCard(t('pending', language), formatCurrency(stats.pending), Clock, '#f59e0b')}
                </View>

                {/* Secondary Stats Row - for better overview */}
                <View style={[styles.statsRow, { marginTop: 0 }]}>
                    {renderStatCard(t('totalRevenue', language), formatCurrency(stats.totalRevenue), Wallet, primaryColor)}
                    {renderStatCard(t('paid', language), formatCurrency(stats.paid), Calendar, '#10b981')}
                    {renderStatCard(t('overdue', language), formatCurrency(stats.overdue), AlertTriangle, '#ef4444')}
                </View>

                {/* Stripe HUD */}
                {stripeSummary.isConnected && (
                    <View style={{ marginTop: 8 }}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Settings', { screen: 'StripeDashboard' })}
                            activeOpacity={0.7}
                        >
                            <Card style={[styles.stripeHudCard, { backgroundColor: cardBg }]}>
                                <View style={styles.stripeHudHeader}>
                                    <View style={styles.stripeHudTitleRow}>
                                        <CreditCard color={primaryColor} size={18} />
                                        <Text style={[styles.stripeHudTitle, { color: mutedColor }]}>{t('stripeNetVolume', language)}</Text>
                                    </View>
                                    <ChevronRight color={mutedColor} size={20} />
                                </View>
                                <Text style={[styles.stripeHudValue, { color: textColor }]}>{isPrivacyMode ? '****' : formatCurrency(stripeSummary.totalNet)}</Text>
                                <View style={[styles.stripeHudStats, { borderTopColor: borderColor }]}>
                                    <View style={styles.stripeHudStatItem}>
                                        <Text style={[styles.stripeHudStatLabel, { color: mutedColor }]}>{t('payouts', language)}</Text>
                                        <Text style={[styles.stripeHudStatValue, { color: textColor }]}>{isPrivacyMode ? '****' : formatCurrency(stripeSummary.totalPayouts)}</Text>
                                    </View>
                                    <View style={[styles.stripeHudStatDivider, { backgroundColor: borderColor }]} />
                                    <View style={styles.stripeHudStatItem}>
                                        <Text style={[styles.stripeHudStatLabel, { color: mutedColor }]}>{t('pending', language)}</Text>
                                        <Text style={[styles.stripeHudStatValue, { color: textColor }]}>{isPrivacyMode ? '****' : formatCurrency(stripeSummary.pendingPayouts)}</Text>
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Section 2: Performance Chart */}
                <View style={[styles.sectionHeader, { marginTop: 12 }]}>
                    <View style={styles.sectionTitleRow}>
                        <BarChart2 color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('performance', language)}</Text>
                    </View>
                </View>

                {monthlyStats.length > 0 && (
                    <>
                        <Card style={[styles.chartCard, { overflow: 'hidden' }]}>
                            {/* Grid Lines */}
                            <View style={styles.chartGrid}>
                                {[1, 0.66, 0.33, 0].map((val, idx) => (
                                    <View key={idx} style={styles.gridLineContainer}>
                                        <Text style={[styles.gridLabel, { color: mutedColor }]}>
                                            {formatCurrency(maxVal * val).split('.')[0]}
                                        </Text>
                                        <View style={[styles.gridLine, { backgroundColor: borderColor }]} />
                                    </View>
                                ))}
                            </View>

                            {/* Chart Bars */}
                            <View style={styles.chartContainer}>
                                {monthlyStats.map((m, i) => {
                                    const isSelected = selectedMonth?.month === m.month;
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.chartCol, isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: 8 }]}
                                            onPress={() => setSelectedMonth(m)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.barContainer}>
                                                <View style={[styles.bar, { height: (Math.max((m.revenue / maxVal) * 100, 4) + '%') as any, backgroundColor: primaryColor, opacity: isSelected ? 1 : 0.7 }]} />
                                                <View style={[styles.bar, { height: (Math.max((m.expenses / maxVal) * 100, 4) + '%') as any, backgroundColor: '#f43f5e', marginLeft: 4, opacity: isSelected ? 1 : 0.7 }]} />
                                            </View>
                                            <Text style={[styles.chartLabel, { color: isSelected ? textColor : mutedColor, fontWeight: isSelected ? '700' : '500' }]}>{m.month}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </Card>

                        {/* Selected Month Detail */}
                        {selectedMonth && (
                            <View style={styles.statsRow}>
                                <View style={[styles.statCard, { backgroundColor: cardBg, padding: 12 }]}>
                                    <Text style={[styles.statLabel, { color: mutedColor }]}>In</Text>
                                    <Text style={[styles.statValue, { color: '#10b981', fontSize: 16 }]}>{isPrivacyMode ? '****' : formatCurrency(selectedMonth.revenue)}</Text>
                                </View>
                                <View style={[styles.statCard, { backgroundColor: cardBg, padding: 12 }]}>
                                    <Text style={[styles.statLabel, { color: mutedColor }]}>Out</Text>
                                    <Text style={[styles.statValue, { color: '#ef4444', fontSize: 16 }]}>{isPrivacyMode ? '****' : formatCurrency(selectedMonth.expenses)}</Text>
                                </View>
                                <View style={[styles.statCard, { backgroundColor: cardBg, padding: 12 }]}>
                                    <Text style={[styles.statLabel, { color: mutedColor }]}>Net</Text>
                                    <Text style={[styles.statValue, { color: selectedMonth.revenue >= selectedMonth.expenses ? primaryColor : '#ef4444', fontSize: 16 }]}>
                                        {isPrivacyMode ? '****' : formatCurrency(selectedMonth.revenue - selectedMonth.expenses)}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </>
                )}

                {/* Section 3: Recent Invoices */}
                <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                    <View style={styles.sectionTitleRow}>
                        <FileText color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('recentInvoices', language)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('InvoicesTab', { screen: 'AllInvoices', params: { type: 'invoice' } })}>
                        <Text style={{ color: primaryColor, fontWeight: '600' }}>{t('viewAll', language)}</Text>
                    </TouchableOpacity>
                </View>

                <Card style={styles.recentCard}>
                    {invoices.slice(0, 5).map((inv, index) => (
                        <TouchableOpacity
                            key={inv.id}
                            style={[
                                styles.invoiceItem,
                                { borderBottomColor: borderColor },
                                index === Math.min(invoices.length - 1, 4) && { borderBottomWidth: 0 }
                            ]}
                            onPress={() => navigation.navigate('InvoicesTab', { screen: 'InvoiceDetail', params: { invoiceId: inv.id } })}
                        >
                            <View style={styles.invoiceInfo}>
                                <Text style={[styles.invoiceNumber, { color: textColor }]}>{inv.invoice_number}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={[styles.clientName, { color: mutedColor }]}>{(inv as any).client?.name || 'Quick Invoice'}</Text>
                                    <Text style={[styles.clientName, { color: mutedColor, fontSize: 11 }]}>
                                        • {inv.items?.length || 0} {t('items', language).toLowerCase()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.invoiceRight}>
                                <Text style={[styles.invoiceAmount, { color: textColor }]}>{isPrivacyMode ? '****' : formatCurrency(inv.total_amount)}</Text>
                                <StatusBadge status={inv.status} />
                            </View>
                        </TouchableOpacity>
                    ))}
                    {invoices.length === 0 && <Text style={[styles.emptyText, { color: mutedColor }]}>{t('noInvoices', language)}</Text>}
                </Card>

                {/* Section 5: Profile & Settings Shortcuts */}
                <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                    <View style={styles.sectionTitleRow}>
                        <User color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('profile', language)}</Text>
                    </View>
                </View>

                <View style={{ gap: 12, marginBottom: 24 }}>
                    <Button
                        title={t('settings', language) || 'Settings'}
                        variant="shortcut"
                        icon={Settings}
                        onPress={() => navigation.navigate('Settings', { screen: 'SettingsMain' })}
                    />
                    {stripeSummary.isConnected && (
                        <Button
                            title="Stripe Dashboard"
                            variant="shortcut"
                            icon={CreditCard}
                            onPress={() => navigation.navigate('Settings', { screen: 'StripeDashboard' })}
                        />
                    )}
                </View>

                {/* Online Sales Section */}
                <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                    <View style={styles.sectionTitleRow}>
                        <ShoppingCart color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('onlineSales', language)}</Text>
                    </View>
                </View>

                {/* Low Stock Alerts */}
                {lowStockProducts.length > 0 && (
                    <Card style={[styles.alertCard, { backgroundColor: isDark ? '#451a03' : '#fff7ed' }]}>
                        <View style={styles.row}>
                            <AlertTriangle color="#f97316" size={20} />
                            <Text style={[styles.alertTitle, { color: isDark ? '#fb923c' : '#9a3412' }]}>{t('stockAlert', language)}</Text>
                        </View>
                        {lowStockProducts.slice(0, 2).map((p, i) => (
                            <Text key={i} style={[styles.alertText, { color: isDark ? '#fdba74' : '#c2410c' }]}>{p.name}: {p.stock_quantity} {t('remaining', language)}</Text>
                        ))}
                    </Card>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>

            <FAB
                onPress={() => navigation.navigate('InvoicesTab', { screen: 'InvoiceForm' })}
                actions={[
                    { label: t('newInvoice', language), icon: FileText, color: primaryColor, onPress: () => navigation.navigate('InvoicesTab', { screen: 'InvoiceForm' }) },
                    { label: t('addExpense', language), icon: Wallet, color: '#ef4444', onPress: () => navigation.navigate('ExpensesTab', { screen: 'ExpenseForm' }) },
                    { label: t('newClient', language), icon: Users, color: '#10b981', onPress: () => navigation.navigate('Management', { screen: 'ClientForm' }) },
                    { label: t('newProduct', language), icon: Package, color: '#f59e0b', onPress: () => navigation.navigate('Management', { screen: 'ProductForm' }) },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },

    // Section header styles
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold' },

    // Stats Grid similar to HR
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 11, fontWeight: '600' },

    // Chart styles
    chartCard: { padding: 16, marginBottom: 16, borderRadius: 16 },
    chartGrid: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        bottom: 40, // leave space for labels
        justifyContent: 'space-between',
        zIndex: 0,
    },
    gridLineContainer: { flexDirection: 'row', alignItems: 'center' },
    gridLabel: { width: 30, fontSize: 9, marginRight: 8, textAlign: 'right' },
    gridLine: { flex: 1, height: 1, opacity: 0.5 },

    chartContainer: {
        height: 180,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingLeft: 40, // Space for grid labels
        paddingTop: 10,
        zIndex: 1,
    },
    chartCol: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', paddingTop: 10, paddingBottom: 0 },
    barContainer: { height: '85%', justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end' },
    bar: { width: 12, borderRadius: 6 },
    chartLabel: { fontSize: 10, marginTop: 8, fontWeight: '600' },
    chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, fontWeight: '500' },

    // Recent invoices
    recentCard: { padding: 8, borderRadius: 16, marginBottom: 16 },
    invoiceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
    invoiceInfo: { flex: 1 },
    invoiceNumber: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    clientName: { fontSize: 13 },
    invoiceRight: { alignItems: 'flex-end' },
    invoiceAmount: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    emptyText: { textAlign: 'center', padding: 20, fontStyle: 'italic' },

    // Alerts
    alertCard: { padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#f97316', borderRadius: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    alertTitle: { fontWeight: 'bold' },
    alertText: { fontSize: 13 },

    // Stripe HUD
    stripeHudCard: {
        padding: 20,
        borderRadius: 18,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    stripeHudHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    stripeHudTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stripeHudTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    stripeHudValue: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 16,
    },
    stripeHudStats: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingTop: 16,
    },
    stripeHudStatItem: {
        flex: 1,
    },
    stripeHudStatLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    stripeHudStatValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    stripeHudStatDivider: {
        width: 1,
        height: 24,
        marginHorizontal: 20,
    },
});
