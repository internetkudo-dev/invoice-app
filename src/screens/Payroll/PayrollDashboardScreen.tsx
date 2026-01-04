import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { DollarSign, TrendingUp, Users } from 'lucide-react-native';
import { formatCurrency } from '../../utils/format';

export function PayrollDashboardScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const stats = {
        totalPayroll: 12450.00,
        employees: 8,
        pendingApprovals: 3
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Payroll</Text>
                <Text style={{ color: mutedColor }}>October 2024</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Main Stat */}
                <Card style={[styles.mainCard, { backgroundColor: primaryColor }]}>
                    <Text style={styles.mainLabel}>Total Estimated Payout</Text>
                    <Text style={styles.mainValue}>{formatCurrency(stats.totalPayroll)}</Text>
                    <View style={styles.mainFooter}>
                        <Text style={styles.mainFooterText}>Due: Oct 31, 2024</Text>
                    </View>
                </Card>

                {/* Sub Stats */}
                <View style={styles.grid}>
                    <Card style={[styles.statCard, { backgroundColor: cardBg }]}>
                        <Users color={primaryColor} size={24} />
                        <Text style={[styles.statValue, { color: textColor }]}>{stats.employees}</Text>
                        <Text style={[styles.statLabel, { color: mutedColor }]}>Active Staff</Text>
                    </Card>
                    <Card style={[styles.statCard, { backgroundColor: cardBg }]}>
                        <TrendingUp color="#f59e0b" size={24} />
                        <Text style={[styles.statValue, { color: textColor }]}>{stats.pendingApprovals}</Text>
                        <Text style={[styles.statLabel, { color: mutedColor }]}>Pending Reviews</Text>
                    </Card>
                </View>

                {/* Recent Processed */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Activity</Text>
                <Card style={[styles.listCard, { backgroundColor: cardBg }]}>
                    <View style={styles.listItem}>
                        <View style={styles.itemIcon}>
                            <DollarSign color="#fff" size={16} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.itemTitle, { color: textColor }]}>September Payroll Processed</Text>
                            <Text style={[styles.itemSub, { color: mutedColor }]}>Sep 30 • 8 Employees</Text>
                        </View>
                        <Text style={[styles.itemAmount, { color: textColor }]}>{formatCurrency(11200)}</Text>
                    </View>
                </Card>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    title: { fontSize: 24, fontWeight: '800' },
    content: { paddingHorizontal: 20 },
    mainCard: { padding: 24, borderRadius: 24, marginBottom: 20 },
    mainLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
    mainValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 16 },
    mainFooter: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    mainFooterText: { color: '#fff', fontWeight: '600', fontSize: 12 },
    grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: { flex: 1, padding: 16, borderRadius: 20, gap: 12 },
    statValue: { fontSize: 24, fontWeight: '700' },
    statLabel: { fontSize: 13 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    listCard: { padding: 16, borderRadius: 16 },
    listItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    itemIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
    itemTitle: { fontSize: 15, fontWeight: '600' },
    itemSub: { fontSize: 12 },
    itemAmount: { fontWeight: '700' }
});
