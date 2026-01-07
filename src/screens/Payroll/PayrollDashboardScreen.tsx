import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button } from '../../components/common';
import { DollarSign, TrendingUp, Users, ArrowLeft, CheckCircle2, MoreHorizontal, Calendar, Play } from 'lucide-react-native';
import { formatCurrency } from '../../utils/format';
import { supabase } from '../../api/supabase';

export function PayrollDashboardScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [generating, setGenerating] = useState(false);

    const [stats, setStats] = useState({
        totalPayroll: 0,
        employees: 0,
        pendingApprovals: 0
    });

    const [recentPayrolls, setRecentPayrolls] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string>('employee');
    const [companyId, setCompanyId] = useState<string | null>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Get active company
            const { data: profile } = await supabase.from('profiles').select('active_company_id').eq('id', user.id).single();
            const activeCompanyId = profile?.active_company_id;

            if (activeCompanyId) {
                // Determine role
                let role = 'employee';
                let empId = '';

                // Check employee record
                const { data: emp } = await supabase
                    .from('employees')
                    .select('id, role')
                    .eq('user_id', user.id)
                    .eq('company_id', activeCompanyId)
                    .single();

                if (emp) {
                    role = emp.role;
                    empId = emp.id;
                } else {
                    // Check memberships (Owner case)
                    const { data: mem } = await supabase
                        .from('memberships')
                        .select('role')
                        .eq('user_id', user.id)
                        .eq('company_id', activeCompanyId)
                        .single();

                    if (mem && (mem.role === 'owner' || mem.role === 'admin')) {
                        role = mem.role;
                        // empId remains empty or specialized if needed, but for "admin/owner" view we just need companyId
                    }
                }

                setUserRole(role);
                setCompanyId(activeCompanyId);
                await fetchData(activeCompanyId, empId, role);
            }
        }
        setLoading(false);
    };

    const fetchData = async (compId: string, empId: string, role: string) => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

        const isoStart = startOfMonth.toISOString().split('T')[0];
        const isoEnd = endOfMonth.toISOString().split('T')[0];

        // Fetch payrolls for current period
        let query = supabase.from('payrolls').select('*, employees(first_name, last_name)');

        if (role === 'employee') {
            query = query.eq('employee_id', empId);
        } else {
            query = query.eq('company_id', compId);
        }

        const { data: payrolls, error } = await query
            .order('period_start', { ascending: false })
            .limit(20);

        if (!error && payrolls) {
            setRecentPayrolls(payrolls);

            const currentPayrolls = payrolls.filter(p => p.period_start === isoStart);
            const total = currentPayrolls.reduce((sum, p) => sum + parseFloat(p.total_payout || 0), 0);
            const pending = currentPayrolls.filter(p => p.status !== 'paid').length;

            if (role !== 'employee') {
                const { count } = await supabase.from('employees').select('id', { count: 'exact' }).eq('company_id', compId).eq('status', 'active');
                setStats({
                    totalPayroll: total,
                    employees: count || 0,
                    pendingApprovals: pending
                });
            } else {
                setStats({
                    totalPayroll: total,
                    employees: 1,
                    pendingApprovals: pending
                });
            }
        }
    };

    const handleGeneratePayroll = async () => {
        if (!companyId) return;
        setGenerating(true);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

        try {
            const { data, error } = await supabase.rpc('generate_company_payroll', {
                p_company_id: companyId,
                p_start_date: startOfMonth.toISOString().split('T')[0],
                p_end_date: endOfMonth.toISOString().split('T')[0]
            });

            if (error) throw error;

            Alert.alert("Success", `Generated ${data.generated_count} payroll records for ${currentMonth}.`);
            onRefresh();
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setGenerating(false);
        }
    };

    const markAsPaid = async (payrollId: string) => {
        try {
            const { error } = await supabase
                .from('payrolls')
                .update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] })
                .eq('id', payrollId);

            if (error) throw error;
            onRefresh();
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: emp } = await supabase
                .from('employees')
                .select('id, company_id, role')
                .eq('user_id', user.id)
                .single();
            if (emp) await fetchData(emp.company_id, emp.id, emp.role);
        }
        setRefreshing(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#10b981';
            case 'processed': return '#6366f1';
            default: return '#f59e0b';
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center' }]}>
                <ActivityIndicator color={primaryColor} size="large" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                        <ArrowLeft color={textColor} size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.title, { color: textColor }]}>Payroll</Text>
                        <Text style={{ color: mutedColor }}>{currentMonth}</Text>
                    </View>
                </View>
                {userRole !== 'employee' && (
                    <TouchableOpacity
                        style={[styles.genButton, { borderColor: primaryColor }]}
                        onPress={handleGeneratePayroll}
                        disabled={generating}
                    >
                        {generating ? <ActivityIndicator size="small" color={primaryColor} /> : <Play size={18} color={primaryColor} />}
                        <Text style={{ color: primaryColor, fontWeight: '700', fontSize: 13, marginLeft: 6 }}>Process</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
            >
                {/* Main Stat */}
                <Card style={[styles.mainCard, { backgroundColor: primaryColor }]}>
                    <Text style={styles.mainLabel}>{userRole === 'employee' ? 'My Next Payout' : 'Total Monthly Payout'}</Text>
                    <Text style={styles.mainValue}>{formatCurrency(stats.totalPayroll)}</Text>
                    <View style={styles.mainFooter}>
                        <Text style={styles.mainFooterText}>Status: {stats.pendingApprovals > 0 ? 'Pending' : 'Ready'}</Text>
                    </View>
                </Card>

                {/* Sub Stats */}
                <View style={styles.grid}>
                    <Card style={[styles.statCard, { backgroundColor: cardBg }]}>
                        <Users color={primaryColor} size={22} />
                        <Text style={[styles.statValue, { color: textColor }]}>{stats.employees}</Text>
                        <Text style={[styles.statLabel, { color: mutedColor }]}>Staff Count</Text>
                    </Card>
                    <Card style={[styles.statCard, { backgroundColor: cardBg }]}>
                        <TrendingUp color="#f59e0b" size={22} />
                        <Text style={[styles.statValue, { color: textColor }]}>{stats.pendingApprovals}</Text>
                        <Text style={[styles.statLabel, { color: mutedColor }]}>In Draft</Text>
                    </Card>
                </View>

                {/* History */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Payroll History</Text>
                {recentPayrolls.length === 0 ? (
                    <Text style={{ color: mutedColor, textAlign: 'center', marginTop: 20 }}>No payroll records found.</Text>
                ) : (
                    recentPayrolls.map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            onPress={() => userRole !== 'employee' && navigation.navigate('PayrollDetail', { payroll: p })}
                            disabled={userRole === 'employee'}
                        >
                            <Card style={[styles.listCard, { backgroundColor: cardBg }]}>
                                <View style={styles.listItem}>
                                    <View style={[styles.itemIcon, { backgroundColor: getStatusColor(p.status) }]}>
                                        <DollarSign color="#fff" size={16} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.itemTitle, { color: textColor }]}>
                                            {userRole === 'employee' ? `Payroll ${new Date(p.period_start).toLocaleDateString([], { month: 'short' })}` : `${p.employees?.first_name} ${p.employees?.last_name}`}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Calendar size={12} color={mutedColor} />
                                            <Text style={[styles.itemSub, { color: mutedColor }]}>
                                                {p.period_start} to {p.period_end}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.itemAmount, { color: textColor }]}>{formatCurrency(p.total_payout)}</Text>
                                        {userRole !== 'employee' && p.status !== 'paid' ? (
                                            <TouchableOpacity onPress={() => markAsPaid(p.id)}>
                                                <Text style={{ color: primaryColor, fontSize: 12, fontWeight: '700', marginTop: 4 }}>Mark as Paid</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <Text style={{ color: getStatusColor(p.status), fontSize: 11, fontWeight: '800', marginTop: 4, textTransform: 'uppercase' }}>
                                                {p.status}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800' },
    genButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    mainCard: { padding: 24, borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
    mainLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 6, fontWeight: '600' },
    mainValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginBottom: 12 },
    mainFooter: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    mainFooterText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: { flex: 1, padding: 16, borderRadius: 20, gap: 8 },
    statValue: { fontSize: 22, fontWeight: '700' },
    statLabel: { fontSize: 12, fontWeight: '600' },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    listCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
    listItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    itemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    itemTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    itemSub: { fontSize: 11 },
    itemAmount: { fontWeight: '800', fontSize: 15 }
});
