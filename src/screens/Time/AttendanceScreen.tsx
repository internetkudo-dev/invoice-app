import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button } from '../../components/common';
import { MapPin, Clock, LogIn, LogOut, ArrowLeft, RefreshCw, Users, User } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import * as Location from 'expo-location';

export function AttendanceScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [teamLogs, setTeamLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [punching, setPunching] = useState(false);
    const [userEmployee, setUserEmployee] = useState<any>(null);
    const [location, setLocation] = useState<any>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    useEffect(() => {
        fetchInitialData();
        requestLocationPermission();
    }, []);

    const requestLocationPermission = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        } catch (e) { }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: emp } = await supabase
                .from('employees')
                .select('id, company_id, role, first_name, last_name')
                .eq('user_id', user.id)
                .single();

            if (emp) {
                setUserEmployee(emp);
                await Promise.all([
                    fetchCurrentStatus(emp.id),
                    fetchRecentLogs(emp.id),
                    emp.role !== 'employee' ? fetchTeamLogs(emp.company_id) : Promise.resolve()
                ]);
            }
        }
        setLoading(false);
    };

    const fetchCurrentStatus = async (empId: string) => {
        const { data } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', empId)
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            setIsCheckedIn(true);
            setCurrentSession(data);
        } else {
            setIsCheckedIn(false);
            setCurrentSession(null);
        }
    };

    const fetchRecentLogs = async (empId: string) => {
        const { data } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', empId)
            .order('check_in', { ascending: false })
            .limit(15);
        setRecentLogs(data || []);
    };

    const fetchTeamLogs = async (companyId: string) => {
        const { data } = await supabase
            .from('attendance_records')
            .select(`
                *,
                employees (first_name, last_name, avatar_url)
            `)
            .eq('company_id', companyId)
            .order('check_in', { ascending: false })
            .limit(30);
        setTeamLogs(data || []);
    };

    const handlePunch = async () => {
        if (!userEmployee) return;
        setPunching(true);
        try {
            let currentLoc = null;
            try {
                let { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                }
            } catch (e) { }

            if (isCheckedIn && currentSession) {
                const { error } = await supabase
                    .from('attendance_records')
                    .update({
                        check_out: new Date().toISOString(),
                        location_lat: currentLoc?.coords.latitude || currentSession.location_lat,
                        location_lng: currentLoc?.coords.longitude || currentSession.location_lng
                    })
                    .eq('id', currentSession.id);
                if (error) throw error;
                Alert.alert("Success", "Checked out successfully!");
            } else {
                const { error } = await supabase
                    .from('attendance_records')
                    .insert({
                        employee_id: userEmployee.id,
                        company_id: userEmployee.company_id,
                        check_in: new Date().toISOString(),
                        location_lat: currentLoc?.coords.latitude,
                        location_lng: currentLoc?.coords.longitude,
                        status: 'present'
                    });
                if (error) throw error;
                Alert.alert("Success", "Checked in successfully!");
            }
            await fetchCurrentStatus(userEmployee.id);
            await fetchRecentLogs(userEmployee.id);
            if (userEmployee.role !== 'employee') await fetchTeamLogs(userEmployee.company_id);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setPunching(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (userEmployee) {
            await Promise.all([
                fetchCurrentStatus(userEmployee.id),
                fetchRecentLogs(userEmployee.id),
                userEmployee.role !== 'employee' ? fetchTeamLogs(userEmployee.company_id) : Promise.resolve()
            ]);
        }
        setRefreshing(false);
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const renderLogItem = ({ item, showEmployee }: any) => (
        <Card style={[styles.logItem, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={[styles.dot, { backgroundColor: item.check_out ? '#10b981' : '#f59e0b' }]} />
                <View style={{ flex: 1 }}>
                    {showEmployee && (
                        <Text style={[styles.logEmployee, { color: textColor }]}>
                            {item.employees?.first_name} {item.employees?.last_name}
                        </Text>
                    )}
                    <Text style={[styles.logTime, { color: mutedColor }]}>
                        {formatTime(item.check_in)} - {formatTime(item.check_out)}
                    </Text>
                </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{formatDate(item.check_in)}</Text>
                {item.total_hours && (
                    <Text style={{ color: mutedColor, fontSize: 11 }}>{parseFloat(item.total_hours).toFixed(1)} hrs</Text>
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Prezenca</Text>
                <View style={{ width: 40 }} />
            </View>

            {userEmployee?.role !== 'employee' && (
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('my')}
                        style={[styles.tab, activeTab === 'my' && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
                    >
                        <User size={18} color={activeTab === 'my' ? primaryColor : mutedColor} />
                        <Text style={[styles.tabText, { color: activeTab === 'my' ? primaryColor : mutedColor }]}>My Time</Text>
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
                {activeTab === 'my' ? (
                    <>
                        <Card style={[styles.punchCard, { backgroundColor: cardBg }]}>
                            <View style={styles.locationTag}>
                                <MapPin size={14} color={primaryColor} />
                                <Text style={{ color: primaryColor, fontSize: 12, fontWeight: '600' }}>
                                    {location ? 'Location Active' : 'Location Pending'}
                                </Text>
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
                                disabled={punching}
                                style={[
                                    styles.punchButton,
                                    {
                                        backgroundColor: isCheckedIn ? '#ef4444' : '#10b981',
                                        shadowColor: isCheckedIn ? '#ef4444' : '#10b981',
                                        opacity: punching ? 0.7 : 1
                                    }
                                ]}
                            >
                                {punching ? (
                                    <ActivityIndicator color="#fff" size="large" />
                                ) : (
                                    <>
                                        {isCheckedIn ? <LogOut size={40} color="#fff" /> : <LogIn size={40} color="#fff" />}
                                        <Text style={styles.punchButtonText}>
                                            {isCheckedIn ? "PUNCH OUT" : "PUNCH IN"}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {isCheckedIn && currentSession && (
                                <Text style={[styles.statusText, { color: mutedColor }]}>
                                    Checked In at {formatTime(currentSession.check_in)}
                                </Text>
                            )}
                        </Card>

                        <Text style={[styles.sectionTitle, { color: textColor }]}>My Recent Activity</Text>
                        {recentLogs.length === 0 ? (
                            <Text style={{ color: mutedColor, textAlign: 'center', marginTop: 20 }}>No logs found.</Text>
                        ) : (
                            recentLogs.map((log) => (
                                <View key={log.id}>
                                    {renderLogItem({ item: log, showEmployee: false })}
                                </View>
                            ))
                        )}
                    </>
                ) : (
                    <>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Team Logs (Last 30)</Text>
                        {teamLogs.length === 0 ? (
                            <Text style={{ color: mutedColor, textAlign: 'center', marginTop: 20 }}>No team logs found.</Text>
                        ) : (
                            teamLogs.map((log) => (
                                <View key={log.id}>
                                    {renderLogItem({ item: log, showEmployee: true })}
                                </View>
                            ))
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { padding: 8 },
    title: { fontSize: 24, fontWeight: '800' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
    tabText: { fontWeight: '600', fontSize: 14 },
    content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
    punchCard: { alignItems: 'center', padding: 24, borderRadius: 24, marginBottom: 24 },
    locationTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
    TimeDisplay: { fontSize: 44, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
    DateDisplay: { fontSize: 15, marginBottom: 30 },
    punchButton: {
        width: 160, height: 160, borderRadius: 80,
        alignItems: 'center', justifyContent: 'center',
        shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
        gap: 8
    },
    punchButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
    statusText: { marginTop: 20, fontSize: 13, fontWeight: '600' },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    logItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, marginBottom: 10, borderRadius: 16 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    logEmployee: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    logTime: { fontSize: 12 },
});
