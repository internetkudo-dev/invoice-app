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
import { Briefcase, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Users, Package, FileText, BarChart2, QrCode, AlertTriangle } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, StatusBadge, Button, FAB } from '../../components/common';
import { Invoice, Profile, Client, Expense } from '../../types';
import { formatCurrency } from '../../utils/format';
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

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

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

            if (invoicesData && expensesData) {
                setInvoices(invoicesData);

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
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('QRScanner')} style={[styles.profileButton, { backgroundColor: cardBg, marginRight: 8 }]}>
                        <QrCode color={primaryColor} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.profileButton, { backgroundColor: cardBg }]}>
                        <Briefcase color={primaryColor} size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />}
            >
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard title={t('totalRevenue', language)} value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} color="#6366f1" growth={stats.growth} isDark={isDark} />
                    <StatCard title={t('netProfit', language)} value={formatCurrency(stats.netProfit)} icon={Wallet} color="#10b981" isDark={isDark} />
                </View>

                {/* Performance Chart */}
                <Card style={styles.chartCard}>
                    <View style={styles.cardHeader}>
                        <BarChart2 color={primaryColor} size={20} />
                        <Text style={[styles.cardTitle, { color: textColor }]}>Performance</Text>
                    </View>
                    <View style={styles.chartContainer}>
                        {monthlyStats.map((m, i) => (
                            <View key={i} style={styles.chartCol}>
                                <View style={styles.barContainer}>
                                    <View style={[styles.bar, { height: (m.revenue / maxVal) * 100, backgroundColor: primaryColor }]} />
                                    <View style={[styles.bar, { height: (m.expenses / maxVal) * 100, backgroundColor: '#f43f5e', marginLeft: 2 }]} />
                                </View>
                                <Text style={[styles.chartLabel, { color: mutedColor }]}>{m.month}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.chartLegend}>
                        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: primaryColor }]} /><Text style={[styles.legendText, { color: mutedColor }]}>{t('totalRevenue', language).split(' ')[1]}</Text></View>
                        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#f43f5e' }]} /><Text style={[styles.legendText, { color: mutedColor }]}>{t('expenses', language)}</Text></View>
                    </View>
                </Card>

                {/* Status Section */}
                <View style={styles.statusRow}>
                    <StatusItem label={t('paid', language)} value={formatCurrency(stats.paid)} color="#10b981" bgColor="#10b98120" />
                    <StatusItem label={t('pending', language)} value={formatCurrency(stats.pending)} color="#f59e0b" bgColor="#f59e0b20" />
                    <StatusItem label={t('overdue', language)} value={formatCurrency(stats.overdue)} color="#ef4444" bgColor="#ef444420" />
                </View>

                {/* Low Stock Alerts */}
                {lowStockProducts.length > 0 && (
                    <Card style={[styles.alertCard, { backgroundColor: '#fff7ed' }]}>
                        <View style={styles.row}>
                            <AlertTriangle color="#f97316" size={20} />
                            <Text style={styles.alertTitle}>Stock Alert</Text>
                        </View>
                        {lowStockProducts.slice(0, 2).map((p, i) => (
                            <Text key={i} style={styles.alertText}>{p.name}: {p.stock_quantity} remaining</Text>
                        ))}
                    </Card>
                )}

                {/* Recent Invoices */}
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>{t('invoices', language)}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('InvoicesTab')}>
                        <Text style={{ color: primaryColor, fontWeight: '600' }}>{t('viewAll', language)}</Text>
                    </TouchableOpacity>
                </View>

                <Card style={styles.recentCard}>
                    {invoices.slice(0, 5).map((inv) => (
                        <TouchableOpacity key={inv.id} style={styles.invoiceItem} onPress={() => navigation.navigate('InvoicesTab', { screen: 'InvoiceDetail', params: { invoiceId: inv.id } })}>
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
                    {invoices.length === 0 && <Text style={[styles.emptyText, { color: mutedColor }]}>No invoices yet</Text>}
                </Card>
            </ScrollView>

            <FAB
                onPress={() => navigation.navigate('InvoicesTab', { screen: 'InvoiceForm' })}
                actions={[
                    { label: t('newInvoice', language), icon: FileText, color: primaryColor, onPress: () => navigation.navigate('InvoicesTab', { screen: 'InvoiceForm' }) },
                    { label: 'New Expense', icon: Wallet, color: '#ef4444', onPress: () => navigation.navigate('Management', { screen: 'ExpenseForm' }) },
                    { label: t('newClient', language), icon: Users, color: '#10b981', onPress: () => navigation.navigate('Management', { screen: 'ManagementTabs', params: { activeTab: 'clients', openForm: true } }) },
                    { label: t('newProduct', language), icon: Package, color: '#f59e0b', onPress: () => navigation.navigate('Management', { screen: 'ManagementTabs', params: { activeTab: 'products', openForm: true } }) },
                ]}
            />
        </View>
    );
}

function StatCard({ title, value, icon, color, growth, isDark }: any) {
    return (
        <Card style={[styles.statCard, { flex: 1 }]}>
            <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
                {React.createElement(icon, { color, size: 20 })}
            </View>
            <Text style={[styles.statTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>{title}</Text>
            <Text style={[styles.statValue, { color: isDark ? '#fff' : '#1e293b' }]}>{value}</Text>
            {!!growth && (
                <View style={styles.growthContainer}>
                    <ArrowUpRight color="#10b981" size={12} />
                    <Text style={styles.growthText}>{growth}% from last month</Text>
                </View>
            )}
        </Card>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    welcome: { fontSize: 14, fontWeight: '500' },
    companyName: { fontSize: 24, fontWeight: 'bold' },
    profileButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statCard: { padding: 16 },
    statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    statTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    growthContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    growthText: { color: '#10b981', fontSize: 10, fontWeight: '600', marginLeft: 2 },
    chartCard: { padding: 16, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    chartContainer: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 20 },
    chartCol: { alignItems: 'center', flex: 1 },
    barContainer: { height: '100%', justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end' },
    bar: { width: 8, borderRadius: 4 },
    chartLabel: { fontSize: 10, marginTop: 8, fontWeight: '600' },
    chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, fontWeight: '500' },
    statusRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statusItem: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
    statusLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
    statusValue: { fontSize: 13, fontWeight: 'bold' },
    alertCard: { padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#f97316' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    alertTitle: { color: '#9a3412', fontWeight: 'bold' },
    alertText: { color: '#c2410c', fontSize: 13 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold' },
    recentCard: { padding: 8 },
    invoiceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    invoiceInfo: { flex: 1 },
    invoiceNumber: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    clientName: { fontSize: 13 },
    invoiceRight: { alignItems: 'flex-end' },
    invoiceAmount: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    emptyText: { textAlign: 'center', padding: 20, fontStyle: 'italic' },
});
