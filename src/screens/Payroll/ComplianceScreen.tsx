import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { ShieldAlert, CheckCircle2, ArrowLeft, RefreshCw, AlertTriangle, FileText, Clock } from 'lucide-react-native';
import { supabase } from '../../api/supabase';

export function ComplianceScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [compliances, setCompliances] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'alerts' | 'records'>('records');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const primaryColorWithOpacity = primaryColor + '20';

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchData();
        });
        return unsubscribe;
    }, [navigation]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchAlerts(), fetchCompliances()]);
        setLoading(false);
    };

    const fetchCompliances = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Simpler fetch based on profile company linkage
        // Assuming current user has access to company compliances
        const { data: profile } = await supabase.from('profiles').select('active_company_id, company_id').eq('id', user.id).single();
        const companyId = profile?.active_company_id || profile?.company_id;

        if (companyId) {
            const { data } = await supabase
                .from('compliances')
                .select('*')
                .eq('company_id', companyId)
                .order('due_date', { ascending: true });

            if (data) setCompliances(data);
        }
    };

    const fetchAlerts = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: emp } = await supabase
                .from('employees')
                .select('company_id')
                .eq('user_id', user.id)
                .single();

            if (emp) {
                const compId = emp.company_id;
                const newAlerts = [];

                // 1. Check for pending leave requests
                const { count: leaveCount } = await supabase
                    .from('leave_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', compId)
                    .eq('status', 'pending');

                if (leaveCount && leaveCount > 0) {
                    newAlerts.push({
                        id: 'leave',
                        title: 'Pending Leave Requests',
                        desc: `${leaveCount} requests waiting for approval`,
                        type: 'warning',
                        icon: <Clock size={20} color="#f59e0b" />
                    });
                }

                // 2. Check for draft payrolls
                const { count: payrollCount } = await supabase
                    .from('payrolls')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', compId)
                    .eq('status', 'draft');

                if (payrollCount && payrollCount > 0) {
                    newAlerts.push({
                        id: 'payroll',
                        title: 'Pending Payroll',
                        desc: `${payrollCount} payroll records need processing`,
                        type: 'error',
                        icon: <AlertTriangle size={20} color="#ef4444" />
                    });
                }

                // 3. Count employees
                const { count: empCount } = await supabase
                    .from('employees')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', compId)
                    .eq('status', 'active');

                newAlerts.push({
                    id: 'staff',
                    title: 'System Health',
                    desc: `${empCount} Active employees tracked correctly`,
                    type: 'success',
                    icon: <CheckCircle2 size={20} color="#10b981" />
                });

                setAlerts(newAlerts);
            }
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const getBorderColor = (type: string) => {
        if (type === 'error' || type === 'expired') return '#ef4444';
        if (type === 'warning' || type === 'pending') return '#f59e0b';
        return '#10b981';
    };

    const renderComplianceItem = ({ item }: any) => {
        const statusColor = getBorderColor(item.status);
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ComplianceForm', { complianceId: item.id })}
            >
                <Card style={[styles.card, { backgroundColor: cardBg, borderLeftColor: statusColor }]}>
                    <View style={[styles.iconBox, { backgroundColor: statusColor + '15' }]}>
                        <FileText size={20} color={statusColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: textColor }]}>{item.title}</Text>
                        <Text style={[styles.itemDesc, { color: mutedColor }]}>
                            {item.status.toUpperCase()} • Due: {item.due_date || 'N/A'}
                        </Text>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing && alerts.length === 0 && compliances.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center' }]}>
                <ActivityIndicator color={primaryColor} size="large" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Compliance</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: primaryColor + '20' }]}
                    onPress={() => navigation.navigate('ComplianceForm')}
                >
                    <Text style={{ color: primaryColor, fontWeight: '700', fontSize: 24 }}>+</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'records' && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
                    onPress={() => setActiveTab('records')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'records' ? primaryColor : mutedColor }]}>Records</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'alerts' && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
                    onPress={() => setActiveTab('alerts')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'alerts' ? primaryColor : mutedColor }]}>System Alerts</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'records' ? (
                <FlatList
                    data={compliances}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FileText color={mutedColor} size={48} opacity={0.5} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Records</Text>
                            <Text style={{ color: mutedColor }}>Add compliance documents to track them here.</Text>
                        </View>
                    }
                    renderItem={renderComplianceItem}
                />
            ) : (
                <FlatList
                    data={alerts}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <CheckCircle2 color="#10b981" size={60} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>All Systems Clear</Text>
                            <Text style={{ color: mutedColor }}>No compliance alerts at this time.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <Card style={[styles.card, { backgroundColor: cardBg, borderLeftColor: getBorderColor(item.type) }]}>
                            <View style={[styles.iconBox, { backgroundColor: getBorderColor(item.type) + '15' }]}>
                                {item.icon}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.itemTitle, { color: textColor }]}>{item.title}</Text>
                                <Text style={[styles.itemDesc, { color: mutedColor }]}>{item.desc}</Text>
                            </View>
                        </Card>
                    )}
                />
            )}
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { padding: 8 },
    addButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '800' },
    tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 24 },
    tab: { paddingVertical: 8 },
    tabText: { fontSize: 16, fontWeight: '600' },
    list: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 18, marginBottom: 16, borderRadius: 20, borderLeftWidth: 6, gap: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    itemDesc: { fontSize: 13, fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700' }
});
