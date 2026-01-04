import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';

export function ScheduleScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeDay = 'Wed';

    const shifts = [
        { id: 1, title: 'Morning Shift', time: '09:00 - 17:00', role: 'Store Manager', color: '#6366f1' },
        { id: 2, title: 'Team Meeting', time: '14:00 - 15:00', role: 'All Staff', color: '#f59e0b' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Schedule</Text>
                <Text style={{ color: mutedColor }}>October 2024</Text>
            </View>

            {/* Calendar Strip */}
            <View style={styles.calendarStrip}>
                {weekDays.map((day, index) => (
                    <View
                        key={day}
                        style={[
                            styles.dayItem,
                            { backgroundColor: day === activeDay ? primaryColor : 'transparent' }
                        ]}
                    >
                        <Text style={[styles.dayName, { color: day === activeDay ? '#fff' : mutedColor }]}>{day}</Text>
                        <Text style={[styles.dayNum, { color: day === activeDay ? '#fff' : textColor }]}>{21 + index}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.content}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Today's Shifts</Text>
                {shifts.map(shift => (
                    <Card key={shift.id} style={[styles.shiftCard, { backgroundColor: cardBg, borderLeftColor: shift.color }]}>
                        <View>
                            <Text style={[styles.shiftTitle, { color: textColor }]}>{shift.title}</Text>
                            <Text style={[styles.shiftRole, { color: mutedColor }]}>{shift.role}</Text>
                        </View>
                        <View style={[styles.timeTag, { backgroundColor: shift.color + '15' }]}>
                            <Text style={{ color: shift.color, fontWeight: '600', fontSize: 13 }}>{shift.time}</Text>
                        </View>
                    </Card>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    title: { fontSize: 24, fontWeight: '800' },
    calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 30 },
    dayItem: { alignItems: 'center', padding: 10, borderRadius: 12, width: 44 },
    dayName: { fontSize: 12, marginBottom: 4 },
    dayNum: { fontSize: 16, fontWeight: '700' },
    content: { paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    shiftCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, borderLeftWidth: 4 },
    shiftTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    shiftRole: { fontSize: 13 },
    timeTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }
});
