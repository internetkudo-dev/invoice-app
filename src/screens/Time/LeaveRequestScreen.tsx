import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { Calendar, CheckCircle2, XCircle, Clock, Plus } from 'lucide-react-native';

export function LeaveRequestScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const requestTypes = ['Vacation', 'Sick Leave', 'Personal', 'Unpaid'];
    const [selectedType, setSelectedType] = useState('Vacation');

    const history = [
        { id: 1, type: 'Vacation', dates: 'Aug 12 - Aug 15', status: 'approved', days: 4 },
        { id: 2, type: 'Sick Leave', dates: 'Sep 05', status: 'rejected', days: 1 },
        { id: 3, type: 'Personal', dates: 'Oct 20', status: 'pending', days: 1 }
    ];

    const getStatusColor = (status: string) => {
        if (status === 'approved') return '#10b981';
        if (status === 'rejected') return '#ef4444';
        return '#f59e0b';
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Leave Requests</Text>
            </View>

            {/* Tab Switcher */}
            <View style={[styles.tabContainer, { backgroundColor: cardBg }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'request' && { backgroundColor: primaryColor }]}
                    onPress={() => setActiveTab('request')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'request' ? '#fff' : mutedColor }]}>New Request</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && { backgroundColor: primaryColor }]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'history' ? '#fff' : mutedColor }]}>History</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {activeTab === 'request' ? (
                    <View style={{ gap: 20 }}>
                        <View>
                            <Text style={[styles.label, { color: mutedColor }]}>Leave Type</Text>
                            <View style={styles.typeGrid}>
                                {requestTypes.map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.typeButton,
                                            {
                                                backgroundColor: selectedType === type ? primaryColor + '20' : cardBg,
                                                borderColor: selectedType === type ? primaryColor : 'transparent',
                                                borderWidth: 1
                                            }
                                        ]}
                                        onPress={() => setSelectedType(type)}
                                    >
                                        <Text style={{ color: selectedType === type ? primaryColor : mutedColor, fontWeight: '600' }}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View>
                            <Text style={[styles.label, { color: mutedColor }]}>Duration</Text>
                            <Card style={[styles.dateCard, { backgroundColor: cardBg }]}>
                                <Calendar color={mutedColor} size={20} />
                                <Text style={{ color: textColor }}>Select Dates</Text>
                            </Card>
                        </View>

                        <View>
                            <Text style={[styles.label, { color: mutedColor }]}>Reason (Optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardBg, color: textColor }]}
                                placeholder="Write a note..."
                                placeholderTextColor={mutedColor}
                                multiline
                            />
                        </View>

                        <TouchableOpacity style={[styles.submitButton, { backgroundColor: primaryColor }]}>
                            <Text style={styles.submitText}>Submit Request</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        {history.map(item => (
                            <Card key={item.id} style={[styles.historyCard, { backgroundColor: cardBg }]}>
                                <View>
                                    <Text style={[styles.historyType, { color: textColor }]}>{item.type}</Text>
                                    <Text style={[styles.historyDate, { color: mutedColor }]}>{item.dates} ({item.days} days)</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                        {item.status.toUpperCase()}
                                    </Text>
                                </View>
                            </Card>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    title: { fontSize: 24, fontWeight: '800' },
    tabContainer: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 24 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
    tabText: { fontWeight: '600' },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, minWidth: '45%' },
    dateCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderRadius: 12 },
    input: { height: 100, borderRadius: 12, padding: 16, textAlignVertical: 'top' },
    submitButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16 },
    historyType: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    historyDate: { fontSize: 13 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700' }
});
