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
import { TrendingUp, Clock, CheckCircle, AlertCircle, FileText, Users, Package, QrCode, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, StatusBadge } from '../../components/common';
import { Invoice, Profile, Client } from '../../types';

const { width } = Dimensions.get('window');

export function DashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const [stats, setStats] = useState({
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        invoiceCount: 0,
        clientCount: 0,
        productCount: 0,
        thisMonth: 0,
        lastMonth: 0,
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
        if (profileData) setProfile(profileData);

        const { data: invoicesData } = await supabase
            .from('invoices')
            .select('*, client:clients(name)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        const { data: clientsData } = await supabase.from('clients').select('*').eq('user_id', user.id);
        const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

        if (clientsData) setClients(clientsData);

        if (invoicesData) {
            setInvoices(invoicesData);

            const total = invoicesData.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
            const paid = invoicesData.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
            const pending = invoicesData.filter((inv) => inv.status === 'sent' || inv.status === 'draft').reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
            const overdue = invoicesData.filter((inv) => inv.status === 'overdue').reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

            // This month's revenue
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

            const thisMonth = invoicesData
                .filter((inv) => inv.status === 'paid' && inv.issue_date >= thisMonthStart.split('T')[0])
                .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

            const lastMonth = invoicesData
                .filter((inv) => inv.status === 'paid' && inv.issue_date >= lastMonthStart.split('T')[0] && inv.issue_date <= lastMonthEnd.split('T')[0])
                .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

            setStats({
                total,
                paid,
                pending,
                overdue,
                invoiceCount: invoicesData.length,
                clientCount: clientsData?.length || 0,
                productCount: productCount || 0,
                thisMonth,
                lastMonth,
            });
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: profile?.currency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const getGrowthPercent = () => {
        if (stats.lastMonth === 0) return stats.thisMonth > 0 ? 100 : 0;
        return Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100);
    };

    const recentInvoices = invoices.slice(0, 5);

    // Top clients by revenue
    const topClients = invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((acc: any, inv: any) => {
            const name = inv.client?.name || 'Unknown';
            acc[name] = (acc[name] || 0) + Number(inv.total_amount);
            return acc;
        }, {});

    const topClientsList = Object.entries(topClients)
        .map(([name, total]) => ({ name, total: total as number }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
            >
                <View style={styles.headerRow}>
                    <Text style={[styles.header, { color: textColor }]}>Dashboard</Text>
                    <TouchableOpacity
                        style={[styles.scanButton, { backgroundColor: cardBg }]}
                        onPress={() => navigation.navigate('Invoices', { screen: 'QRScanner' })}
                    >
                        <QrCode color="#818cf8" size={22} />
                    </TouchableOpacity>
                </View>

                {/* Revenue Card */}
                <Card style={styles.revenueCard}>
                    <Text style={[styles.revenueLabel, { color: mutedColor }]}>Total Revenue</Text>
                    <Text style={styles.revenueAmount}>{formatCurrency(stats.total)}</Text>
                    <View style={styles.revenueRow}>
                        <View style={styles.revenueChange}>
                            <Text style={[styles.changeText, { color: getGrowthPercent() >= 0 ? '#10b981' : '#ef4444' }]}>
                                {getGrowthPercent() >= 0 ? '↑' : '↓'} {Math.abs(getGrowthPercent())}%
                            </Text>
                            <Text style={[styles.changeLabel, { color: mutedColor }]}>vs last month</Text>
                        </View>
                        <Text style={[styles.thisMonth, { color: '#818cf8' }]}>{formatCurrency(stats.thisMonth)} this month</Text>
                    </View>
                </Card>

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                    <TouchableOpacity style={[styles.quickStat, { backgroundColor: cardBg }]} onPress={() => navigation.navigate('Invoices')}>
                        <FileText color="#818cf8" size={24} />
                        <Text style={[styles.quickStatValue, { color: textColor }]}>{stats.invoiceCount}</Text>
                        <Text style={[styles.quickStatLabel, { color: mutedColor }]}>Invoices</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickStat, { backgroundColor: cardBg }]} onPress={() => navigation.navigate('Clients')}>
                        <Users color="#10b981" size={24} />
                        <Text style={[styles.quickStatValue, { color: textColor }]}>{stats.clientCount}</Text>
                        <Text style={[styles.quickStatLabel, { color: mutedColor }]}>Clients</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickStat, { backgroundColor: cardBg }]} onPress={() => navigation.navigate('Products')}>
                        <Package color="#f59e0b" size={24} />
                        <Text style={[styles.quickStatValue, { color: textColor }]}>{stats.productCount}</Text>
                        <Text style={[styles.quickStatLabel, { color: mutedColor }]}>Products</Text>
                    </TouchableOpacity>
                </View>

                {/* Status Cards */}
                <View style={styles.statusGrid}>
                    <View style={[styles.statusCard, { backgroundColor: cardBg }]}>
                        <View style={[styles.statusIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <CheckCircle color="#10b981" size={20} />
                        </View>
                        <Text style={[styles.statusValue, { color: '#10b981' }]}>{formatCurrency(stats.paid)}</Text>
                        <Text style={[styles.statusLabel, { color: mutedColor }]}>Paid</Text>
                    </View>
                    <View style={[styles.statusCard, { backgroundColor: cardBg }]}>
                        <View style={[styles.statusIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                            <Clock color="#f59e0b" size={20} />
                        </View>
                        <Text style={[styles.statusValue, { color: '#f59e0b' }]}>{formatCurrency(stats.pending)}</Text>
                        <Text style={[styles.statusLabel, { color: mutedColor }]}>Pending</Text>
                    </View>
                    <View style={[styles.statusCard, { backgroundColor: cardBg }]}>
                        <View style={[styles.statusIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <AlertCircle color="#ef4444" size={20} />
                        </View>
                        <Text style={[styles.statusValue, { color: '#ef4444' }]}>{formatCurrency(stats.overdue)}</Text>
                        <Text style={[styles.statusLabel, { color: mutedColor }]}>Overdue</Text>
                    </View>
                </View>

                {/* Top Clients */}
                {topClientsList.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Top Clients</Text>
                        <Card>
                            {topClientsList.map((client, index) => (
                                <View key={client.name} style={[styles.topClientRow, index < topClientsList.length - 1 && styles.topClientBorder]}>
                                    <View style={styles.topClientInfo}>
                                        <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#f59e0b' : '#334155' }]}>
                                            <Text style={styles.rankText}>{index + 1}</Text>
                                        </View>
                                        <Text style={[styles.topClientName, { color: textColor }]}>{client.name}</Text>
                                    </View>
                                    <Text style={styles.topClientAmount}>{formatCurrency(client.total)}</Text>
                                </View>
                            ))}
                        </Card>
                    </>
                )}

                {/* Recent Invoices */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Invoices</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Invoices')}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>
                <Card>
                    {recentInvoices.length === 0 ? (
                        <Text style={[styles.emptyText, { color: mutedColor }]}>No invoices yet</Text>
                    ) : (
                        recentInvoices.map((invoice, index) => (
                            <TouchableOpacity
                                key={invoice.id}
                                style={[styles.invoiceItem, index < recentInvoices.length - 1 && styles.invoiceItemBorder]}
                                onPress={() => navigation.navigate('Invoices', { screen: 'InvoiceDetail', params: { invoiceId: invoice.id } })}
                            >
                                <View style={styles.invoiceInfo}>
                                    <Text style={[styles.invoiceNumber, { color: textColor }]}>{invoice.invoice_number}</Text>
                                    <Text style={[styles.invoiceClient, { color: mutedColor }]}>{(invoice as any).client?.name || 'No client'}</Text>
                                </View>
                                <View style={styles.invoiceRight}>
                                    <Text style={styles.invoiceAmount}>{formatCurrency(Number(invoice.total_amount))}</Text>
                                    <StatusBadge status={invoice.status} />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingTop: 56, paddingBottom: 32 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    header: { fontSize: 32, fontWeight: 'bold' },
    scanButton: { padding: 12, borderRadius: 12 },
    revenueCard: { marginBottom: 20, backgroundColor: '#6366f1', borderColor: '#818cf8' },
    revenueLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
    revenueAmount: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginVertical: 8 },
    revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    revenueChange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    changeText: { fontSize: 14, fontWeight: '600' },
    changeLabel: { color: 'rgba(255,255,255,0.6)' },
    thisMonth: { fontSize: 13 },
    quickStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quickStat: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 16 },
    quickStatValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
    quickStatLabel: { fontSize: 12, marginTop: 2 },
    statusGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statusCard: { flex: 1, padding: 14, borderRadius: 14 },
    statusIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statusValue: { fontSize: 15, fontWeight: 'bold' },
    statusLabel: { fontSize: 11, marginTop: 2 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '600' },
    seeAllText: { color: '#818cf8', fontWeight: '600' },
    topClientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    topClientBorder: { borderBottomWidth: 1, borderBottomColor: '#334155' },
    topClientInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rankBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rankText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    topClientName: { fontSize: 15, fontWeight: '500' },
    topClientAmount: { color: '#818cf8', fontWeight: '600' },
    emptyText: { textAlign: 'center', padding: 24 },
    invoiceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    invoiceItemBorder: { borderBottomWidth: 1, borderBottomColor: '#334155' },
    invoiceInfo: { flex: 1 },
    invoiceNumber: { fontWeight: '600', marginBottom: 2 },
    invoiceClient: { fontSize: 13 },
    invoiceRight: { alignItems: 'flex-end', gap: 4 },
    invoiceAmount: { color: '#818cf8', fontWeight: '600' },
});
