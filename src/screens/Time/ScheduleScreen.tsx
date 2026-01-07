import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button } from '../../components/common';
import { Calendar as CalendarIcon, Clock, Plus, ArrowLeft, RefreshCw, Users, User, Trash2 } from 'lucide-react-native';
import { supabase } from '../../api/supabase';

export function ScheduleScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [myShifts, setMyShifts] = useState<any[]>([]);
    const [teamShifts, setTeamShifts] = useState<any[]>([]);
    const [userEmployee, setUserEmployee] = useState<any>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    // Calendar logic
    const [selectedDate, setSelectedDate] = useState(new Date());
    const weekDays = [];
    for (let i = -3; i <= 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        weekDays.push(d);
    }

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Get active company
            const { data: profile } = await supabase
                .from('profiles')
                .select('active_company_id')
                .eq('id', user.id)
                .single();

            const companyId = profile?.active_company_id;

            if (companyId) {
                // Check employee record
                const { data: emp } = await supabase
                    .from('employees')
                    .select('id, company_id, role')
                    .eq('user_id', user.id)
                    .eq('company_id', companyId)
                    .single();

                if (emp) {
                    setUserEmployee(emp);
                    await Promise.all([
                        fetchMyShifts(emp.id),
                        emp.role !== 'employee' ? fetchTeamShifts(companyId) : Promise.resolve()
                    ]);
                } else {
                    // Fallback: Check if owner/admin via memberships
                    const { data: mem } = await supabase
                        .from('memberships')
                        .select('role')
                        .eq('user_id', user.id)
                        .eq('company_id', companyId)
                        .single();

                    if (mem && (mem.role === 'owner' || mem.role === 'admin')) {
                        // Create pseudo-employee for UI logic
                        const pseudoEmp = { id: user.id, company_id: companyId, role: mem.role };
                        setUserEmployee(pseudoEmp);
                        await fetchTeamShifts(companyId);
                        setActiveTab('team'); // Auto-switch to team view for owners without shifts
                    }
                }
            }
        }
        setLoading(false);
    };

    const fetchMyShifts = async (empId: string) => {
        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('employee_id', empId)
            .order('start_time', { ascending: true });

        if (!error) setMyShifts(data || []);
    };

    const fetchTeamShifts = async (companyId: string) => {
        const { data, error } = await supabase
            .from('shifts')
            .select(`
                *,
                employees (first_name, last_name)
            `)
            .eq('company_id', companyId)
            .order('start_time', { ascending: true });

        if (!error) setTeamShifts(data || []);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (userEmployee) {
            await Promise.all([
                fetchMyShifts(userEmployee.id),
                userEmployee.role !== 'employee' ? fetchTeamShifts(userEmployee.company_id) : Promise.resolve()
            ]);
        }
        setRefreshing(false);
    };

    const handleDeleteShift = async (id: string) => {
        Alert.alert(
            "Delete Shift",
            "Are you sure you want to delete this shift?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase.from('shifts').delete().eq('id', id);
                        if (!error) {
                            fetchTeamShifts(userEmployee.company_id);
                            fetchMyShifts(userEmployee.id);
                        }
                    }
                }
            ]
        );
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const filteredShifts = (activeTab === 'my' ? myShifts : teamShifts).filter(s =>
        isSameDay(new Date(s.start_time), selectedDate)
    );

    const renderShiftCard = (shift: any) => (
        <Card key={shift.id} style={[styles.shiftCard, { backgroundColor: cardBg, borderLeftColor: shift.color || primaryColor }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.shiftTitle, { color: textColor }]}>{shift.title}</Text>
                {activeTab === 'team' && (
                    <Text style={[styles.shiftRole, { color: mutedColor }]}>
                        {shift.employees?.first_name} {shift.employees?.last_name}
                    </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                    <Clock size={12} color={mutedColor} />
                    <Text style={{ color: mutedColor, fontSize: 12 }}>
                        {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.timeTag, { backgroundColor: (shift.color || primaryColor) + '15' }]}>
                    <Text style={{ color: shift.color || primaryColor, fontWeight: '700', fontSize: 12 }}>
                        {((new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / 3600000).toFixed(1)}h
                    </Text>
                </View>
                {userEmployee?.role !== 'employee' && activeTab === 'team' && (
                    <TouchableOpacity onPress={() => handleDeleteShift(shift.id)}>
                        <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                )}
            </View>
        </Card>
    );

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
                        <Text style={[styles.title, { color: textColor }]}>Orari i punës</Text>
                        <Text style={{ color: mutedColor, fontSize: 13 }}>
                            {selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                        </Text>
                    </View>
                </View>
                {userEmployee?.role !== 'employee' && (
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: primaryColor }]}
                        onPress={() => navigation.navigate('ShiftForm')}
                    >
                        <Plus color="#fff" size={24} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Calendar Strip */}
            <View style={styles.calendarStrip}>
                {weekDays.map((day) => {
                    const active = isSameDay(day, selectedDate);
                    return (
                        <TouchableOpacity
                            key={day.toISOString()}
                            onPress={() => setSelectedDate(day)}
                            style={[
                                styles.dayItem,
                                { backgroundColor: active ? primaryColor : (isDark ? '#1e293b' : '#fff') }
                            ]}
                        >
                            <Text style={[styles.dayName, { color: active ? '#fff' : mutedColor }]}>
                                {day.toLocaleDateString([], { weekday: 'short' })}
                            </Text>
                            <Text style={[styles.dayNum, { color: active ? '#fff' : textColor }]}>
                                {day.getDate()}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {userEmployee?.role !== 'employee' && (
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('my')}
                        style={[styles.tab, activeTab === 'my' && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
                    >
                        <User size={18} color={activeTab === 'my' ? primaryColor : mutedColor} />
                        <Text style={[styles.tabText, { color: activeTab === 'my' ? primaryColor : mutedColor }]}>My Shifts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('team')}
                        style={[styles.tab, activeTab === 'team' && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
                    >
                        <Users size={18} color={activeTab === 'team' ? primaryColor : mutedColor} />
                        <Text style={[styles.tabText, { color: activeTab === 'team' ? primaryColor : mutedColor }]}>Team View</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
                }
            >
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                    {isSameDay(selectedDate, new Date()) ? "Today's Shifts" : selectedDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                </Text>

                {filteredShifts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <CalendarIcon size={48} color={mutedColor} style={{ marginBottom: 12 }} />
                        <Text style={{ color: mutedColor, fontSize: 16 }}>No shifts scheduled for this day.</Text>
                    </View>
                ) : (
                    filteredShifts.map(renderShiftCard)
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800' },
    addButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    dayItem: { alignItems: 'center', padding: 10, borderRadius: 12, width: 48, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    dayName: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    dayNum: { fontSize: 16, fontWeight: '700' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
    tabText: { fontWeight: '600', fontSize: 14 },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    shiftCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, borderLeftWidth: 5 },
    shiftTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    shiftRole: { fontSize: 13, marginBottom: 4 },
    timeTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
});
