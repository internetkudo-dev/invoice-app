import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { MapPin, Clock, LogIn, LogOut, HISTORY } from 'lucide-react-native';
import { supabase } from '../../api/supabase';

export function AttendanceScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const handlePunch = async () => {
        // Placeholder for Geolocation check
        const isWithinRange = true; // navigator.geolocation...

        if (!isWithinRange) {
            Alert.alert("Location Error", "You are not within the office premises.");
            return;
        }

        const newStatus = !isCheckedIn;
        setIsCheckedIn(newStatus);
        setLastAction(new Date().toLocaleTimeString());

        // Save to DB (mock)
        Alert.alert(
            newStatus ? "Checked In!" : "Checked Out!",
            `Successfully logged at ${new Date().toLocaleTimeString()}`
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Time & Attendance</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Punch Card */}
                <Card style={[styles.punchCard, { backgroundColor: cardBg }]}>
                    <View style={styles.locationTag}>
                        <MapPin size={14} color={primaryColor} />
                        <Text style={{ color: primaryColor, fontSize: 12, fontWeight: '600' }}>Office HQ (Geofence Active)</Text>
                    </View>

                    <Text style={[styles.TimeDisplay, { color: textColor }]}>
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.DateDisplay, { color: mutedColor }]}>
                        {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePunch}
                        style={[
                            styles.punchButton,
                            {
                                backgroundColor: isCheckedIn ? '#ef4444' : '#10b981',
                                shadowColor: isCheckedIn ? '#ef4444' : '#10b981',
                            }
                        ]}
                    >
                        {isCheckedIn ? <LogOut size={40} color="#fff" /> : <LogIn size={40} color="#fff" />}
                        <Text style={styles.punchButtonText}>
                            {isCheckedIn ? "PUNCH OUT" : "PUNCH IN"}
                        </Text>
                    </TouchableOpacity>

                    {lastAction && (
                        <Text style={[styles.statusText, { color: mutedColor }]}>
                            Last action: {isCheckedIn ? 'In' : 'Out'} at {lastAction}
                        </Text>
                    )}
                </Card>

                {/* Recent Logs (Placeholder) */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Activity</Text>
                {[1, 2, 3].map((i) => (
                    <Card key={i} style={[styles.logItem, { backgroundColor: cardBg }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.dot, { backgroundColor: i === 1 ? '#10b981' : '#ef4444' }]} />
                            <View>
                                <Text style={[styles.logTitle, { color: textColor }]}>{i === 1 ? 'Check In' : 'Check Out'}</Text>
                                <Text style={[styles.logTime, { color: mutedColor }]}>09:00 AM • On Time</Text>
                            </View>
                        </View>
                        <Text style={{ color: mutedColor, fontSize: 12 }}>Today</Text>
                    </Card>
                ))}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    title: { fontSize: 28, fontWeight: '800' },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    punchCard: { alignItems: 'center', padding: 32, borderRadius: 24, marginBottom: 32 },
    locationTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 24 },
    TimeDisplay: { fontSize: 48, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
    DateDisplay: { fontSize: 16, marginBottom: 40 },
    punchButton: {
        width: 180, height: 180, borderRadius: 90,
        alignItems: 'center', justifyContent: 'center',
        shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
        gap: 12
    },
    punchButtonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
    statusText: { marginTop: 24, fontSize: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    logItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 10, borderRadius: 16 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    logTitle: { fontSize: 15, fontWeight: '600' },
    logTime: { fontSize: 13 }
});
