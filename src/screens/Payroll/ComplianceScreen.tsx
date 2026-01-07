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
    const [alerts, setAlerts] = useState<any[]>([]);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        setLoading(true);
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
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAlerts();
        setRefreshing(false);
    };

    const getBorderColor = (type: string) => {
        if (type === 'error') return '#ef4444';
        if (type === 'warning') return '#f59e0b';
        return '#10b981';
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Compliance</Text>
                <View style={{ width: 40 }} />
            </View>

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
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { padding: 8 },
    title: { fontSize: 24, fontWeight: '800' },
    list: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 18, marginBottom: 16, borderRadius: 20, borderLeftWidth: 6, gap: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    itemDesc: { fontSize: 13, fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 20, marginBottom: 8 }
});
