import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { ShieldAlert, CheckCircle2 } from 'lucide-react-native';

export function ComplianceScreen({ navigation }: any) {
    const { isDark } = useTheme();

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const alerts = [
        { id: 1, title: 'Contract Expiring', desc: 'Ana Berisha - Ends in 15 days', type: 'warning' },
        { id: 2, title: 'Tax Document Missing', desc: 'Besnik Krasniqi - ID Copy required', type: 'error' },
        { id: 3, title: 'All Clear', desc: 'Payroll taxes filed for September', type: 'success' },
    ];

    const getIcon = (type: string) => {
        if (type === 'success') return <CheckCircle2 color="#10b981" size={24} />;
        return <ShieldAlert color={type === 'error' ? '#ef4444' : '#f59e0b'} size={24} />;
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Compliance</Text>
            </View>

            <FlatList
                data={alerts}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <Card style={[styles.card, { backgroundColor: cardBg, borderLeftColor: item.type === 'error' ? '#ef4444' : item.type === 'warning' ? '#f59e0b' : '#10b981' }]}>
                        <View style={styles.iconBox}>
                            {getIcon(item.type)}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.itemTitle, { color: textColor }]}>{item.title}</Text>
                            <Text style={[styles.itemDesc, { color: mutedColor }]}>{item.desc}</Text>
                        </View>
                    </Card>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    title: { fontSize: 24, fontWeight: '800' },
    list: { paddingHorizontal: 20 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, borderRadius: 16, borderLeftWidth: 4, gap: 16 },
    iconBox: { justifyContent: 'center' },
    itemTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    itemDesc: { fontSize: 13 }
});
