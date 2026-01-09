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
import { Briefcase, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Users, Package, FileText, BarChart2, QrCode, AlertTriangle, Calendar, Clock, Receipt, ScanLine, User, Settings, ChevronRight, ShoppingCart, CreditCard } from 'lucide-react-native';
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

    const maxVal = Math.max(...monthlyStats.map(m => Math.max(m.revenue, m.expenses)), 1);

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.welcome, { color: mutedColor }]}>{t('welcomeBack', language)},</Text>
                    <Text style={[styles.companyName, { color: textColor }]}>{profile?.company_name || 'My Business'}</Text>
                </View>
                {/* Actions removed from top right as they are now shortcuts below */}
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />}
            >
                {/* Section 1: Daily Reports */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Calendar color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('dailyReports', language)}</Text>
                    </View>
                </View>

                <View style={[styles.dailyReportsGrid, { gap: 12 }]}>
                    <Card style={[styles.dailyCard, { borderLeftColor: primaryColor, borderLeftWidth: 4 }]}>
                        <View style={styles.dailyCardContent}>
                            <View style={[styles.dailyIconContainer, { backgroundColor: `${primaryColor}15` }]}>
                                <TrendingUp color={primaryColor} size={24} />
                            </View>
                            <View>
                                <Text style={[styles.dailyCardLabel, { color: mutedColor }]}>{t('todayRevenue', language)}</Text>
                                <Text style={[styles.dailyCardValue, { color: textColor }]}>{formatCurrency(todayStats.revenue)}</Text>
                            </View>
                        </View>
                    </Card>

                    <Card style={[styles.dailyCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
                        <View style={styles.dailyCardContent}>
                            <View style={[styles.dailyIconContainer, { backgroundColor: '#10b98115' }]}>
                                <Receipt color="#10b981" size={24} />
                            </View>
                            <View>
                                <Text style={[styles.dailyCardLabel, { color: mutedColor }]}>{t('todayInvoices', language)}</Text>
                                <Text style={[styles.dailyCardValue, { color: textColor }]}>{todayStats.invoiceCount}</Text>
                            </View>
                        </View>
                    </Card>
                </View>

                {/* Status Row */}
                <View style={styles.statusRow}>
                    <StatusItem label={t('paid', language)} value={formatCurrency(stats.paid)} color="#10b981" bgColor="#10b98120" />
                    <StatusItem label={t('pending', language)} value={formatCurrency(stats.pending)} color="#f59e0b" bgColor="#f59e0b20" />
                    <StatusItem label={t('overdue', language)} value={formatCurrency(stats.overdue)} color="#ef4444" bgColor="#ef444420" />
                </View>

                {/* Stripe HUD */}
                {stripeSummary.isConnected && (
                    <View style={{ marginTop: 8 }}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Settings', { screen: 'StripeDashboard' })}
                            activeOpacity={0.7}
                        >
                            <Card style={[styles.stripeHudCard, { backgroundColor: '#6366f1' }]}>
                                <View style={styles.stripeHudHeader}>
                                    <View style={styles.stripeHudTitleRow}>
                                        <CreditCard color="#fff" size={18} />
                                        <Text style={styles.stripeHudTitle}>Stripe Net Volume</Text>
                                    </View>
                                    <ChevronRight color="rgba(255,255,255,0.7)" size={20} />
                                </View>
                                <Text style={styles.stripeHudValue}>{formatCurrency(stripeSummary.totalNet)}</Text>
                                <View style={styles.stripeHudStats}>
                                    <View style={styles.stripeHudStatItem}>
                                        <Text style={styles.stripeHudStatLabel}>Payouts</Text>
                                        <Text style={styles.stripeHudStatValue}>{formatCurrency(stripeSummary.totalPayouts)}</Text>
                                    </View>
                                    <View style={styles.stripeHudStatDivider} />
                                    <View style={styles.stripeHudStatItem}>
                                        <Text style={styles.stripeHudStatLabel}>Pending</Text>
                                        <Text style={styles.stripeHudStatValue}>{formatCurrency(stripeSummary.pendingPayouts)}</Text>
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Section 2: Performance Chart */}
                <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                    <View style={styles.sectionTitleRow}>
                        <BarChart2 color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('performance', language)}</Text>
                    </View>
                </View>

                <Card style={styles.chartCard}>
                    <View style={styles.chartContainer}>
                        {monthlyStats.map((m, i) => (
                            <View key={i} style={styles.chartCol}>
                                <View style={styles.barContainer}>
                                    <View style={[styles.bar, { height: Math.max((m.revenue / maxVal) * 100, 4), backgroundColor: primaryColor }]} />
                                    <View style={[styles.bar, { height: Math.max((m.expenses / maxVal) * 100, 4), backgroundColor: '#f43f5e', marginLeft: 2 }]} />
                                </View>
                                <Text style={[styles.chartLabel, { color: mutedColor }]}>{m.month}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.chartLegend}>
                        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: primaryColor }]} /><Text style={[styles.legendText, { color: mutedColor }]}>{t('totalRevenue', language).split(' ')[1] || t('totalRevenue', language)}</Text></View>
                        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#f43f5e' }]} /><Text style={[styles.legendText, { color: mutedColor }]}>{t('expenses', language)}</Text></View>
                    </View>
                </Card>

                {/* Section 3: Recent Invoices */}
                <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                    <View style={styles.sectionTitleRow}>
                        <FileText color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('recentInvoices', language)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('InvoicesTab')}>
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
                                <Text style={[styles.clientName, { color: mutedColor }]}>{(inv as any).client?.name || 'Quick Invoice'}</Text>
                            </View>
                            <View style={styles.invoiceRight}>
                                <Text style={[styles.invoiceAmount, { color: textColor }]}>{formatCurrency(inv.total_amount)}</Text>
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
                        title={t('profileDashboard', language)}
                        variant="shortcut"
                        icon={User}
                        onPress={() => navigation.navigate('Profile')}
                    />
                    <Button
                        title={t('appSettings', language)}
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
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Online Sales</Text>
                    </View>
                </View>


                {/* Low Stock Alerts */}
                {lowStockProducts.length > 0 && (
                    <Card style={[styles.alertCard, { backgroundColor: isDark ? '#451a03' : '#fff7ed' }]}>
                        <View style={styles.row}>
                            <AlertTriangle color="#f97316" size={20} />
                            <Text style={[styles.alertTitle, { color: isDark ? '#fb923c' : '#9a3412' }]}>Stock Alert</Text>
                        </View>
                        {lowStockProducts.slice(0, 2).map((p, i) => (
                            <Text key={i} style={[styles.alertText, { color: isDark ? '#fdba74' : '#c2410c' }]}>{p.name}: {p.stock_quantity} remaining</Text>
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

function StatusItem({ label, value, color, bgColor }: any) {
    return (
        <View style={[styles.statusItem, { backgroundColor: bgColor }]}>
            <Text style={[styles.statusLabel, { color }]}>{label}</Text>
            <Text style={[styles.statusValue, { color }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    welcome: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    companyName: { fontSize: 28, fontWeight: 'bold' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },

    // Section header styles
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold' },

    // Daily Reports styles
    dailyReportsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    dailyCard: { flex: 1, padding: 16, borderRadius: 16 },
    dailyCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dailyIconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dailyCardInfo: { flex: 1 },
    dailyCardLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
    dailyCardValue: { fontSize: 20, fontWeight: 'bold' },

    // Status row
    statusRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statusItem: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
    statusLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
    statusValue: { fontSize: 13, fontWeight: 'bold' },

    // Chart styles
    chartCard: { padding: 16, marginBottom: 16, borderRadius: 16 },
    chartContainer: { height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 20 },
    chartCol: { alignItems: 'center', flex: 1 },
    barContainer: { height: '100%', justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end' },
    bar: { width: 10, borderRadius: 5 },
    chartLabel: { fontSize: 10, marginTop: 8, fontWeight: '600' },
    chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
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

    // Scan invoice card
    scanCard: { padding: 20, borderRadius: 16, marginBottom: 16 },
    scanCardContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    scanIconContainer: { width: 72, height: 72, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    scanCardInfo: { flex: 1 },
    scanCardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    scanCardDescription: { fontSize: 13, lineHeight: 18 },
    scanArrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    // Alerts
    alertCard: { padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#f97316', borderRadius: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    alertTitle: { fontWeight: 'bold' },
    alertText: { fontSize: 13 },

    // Profile section
    profileGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    profileCard: { padding: 14, borderRadius: 14, flex: 1 },
    profileCardContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    profileIconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    profileCardTitle: { flex: 1, fontSize: 13, fontWeight: '600' },

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
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.9,
    },
    stripeHudValue: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 16,
    },
    stripeHudStats: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
        paddingTop: 16,
    },
    stripeHudStatItem: {
        flex: 1,
    },
    stripeHudStatLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginBottom: 4,
    },
    stripeHudStatValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    stripeHudStatDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 20,
    },

    // Online Sales section
    onlineSalesCard: { padding: 16, borderRadius: 14, marginBottom: 16 },
    onlineSalesContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    onlineSalesIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    onlineSalesInfo: { flex: 1 },
    onlineSalesTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    onlineSalesDesc: { fontSize: 13 },
});
