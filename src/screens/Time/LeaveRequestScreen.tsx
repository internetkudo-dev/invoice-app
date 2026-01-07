import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button } from '../../components/common';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, Plus, ArrowLeft, RefreshCw, User, Users } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

export function LeaveRequestScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const [activeTab, setActiveTab] = useState<'request' | 'history' | 'team'>('request');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedType, setSelectedType] = useState('vacation');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Data State
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [teamRequests, setTeamRequests] = useState<any[]>([]);
    const [userEmployee, setUserEmployee] = useState<any>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const requestTypes = [
        { id: 'vacation', label: 'Vacation' },
        { id: 'sick', label: 'Sick Leave' },
        { id: 'personal', label: 'Personal' },
        { id: 'unpaid', label: 'Unpaid' }
    ];

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: emp } = await supabase
                .from('employees')
                .select('id, company_id, role')
                .eq('user_id', user.id)
                .single();

            if (emp) {
                setUserEmployee(emp);
                await Promise.all([
                    fetchMyRequests(emp.id),
                    emp.role !== 'employee' ? fetchTeamRequests(emp.company_id) : Promise.resolve()
                ]);
            }
        }
        setLoading(false);
    };

    const fetchMyRequests = async (empId: string) => {
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('employee_id', empId)
            .order('created_at', { ascending: false });

        if (!error) setMyRequests(data || []);
    };

    const fetchTeamRequests = async (companyId: string) => {
        const { data, error } = await supabase
            .from('leave_requests')
            .select(`
                *,
                employees (first_name, last_name, avatar_url)
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (!error) setTeamRequests(data || []);
    };

    const handleSubmit = async () => {
        if (!userEmployee) return;
        if (endDate < startDate) {
            Alert.alert("Invalid Dates", "End date cannot be before start date.");
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('leave_requests')
                .insert({
                    employee_id: userEmployee.id,
                    company_id: userEmployee.company_id,
                    leave_type: selectedType,
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    reason: reason,
                    status: 'pending'
                });

            if (error) throw error;

            Alert.alert("Success", "Leave request submitted successfully!");
            setReason('');
            setActiveTab('history');
            fetchMyRequests(userEmployee.id);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (requestId: string, newStatus: 'approved' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({
                    status: newStatus,
                    approved_by: (await supabase.auth.getUser()).data.user?.id
                })
                .eq('id', requestId);

            if (error) throw error;

            fetchTeamRequests(userEmployee.company_id);
            fetchMyRequests(userEmployee.id);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (userEmployee) {
            await Promise.all([
                fetchMyRequests(userEmployee.id),
                userEmployee.role !== 'employee' ? fetchTeamRequests(userEmployee.company_id) : Promise.resolve()
            ]);
        }
        setRefreshing(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#10b981';
            case 'rejected': return '#ef4444';
            default: return '#f59e0b';
        }
    };

    const renderRequestItem = (item: any, isTeam: boolean) => (
        <Card key={item.id} style={[styles.historyCard, { backgroundColor: cardBg }]}>
            <View style={{ flex: 1 }}>
                {isTeam && (
                    <Text style={[styles.employeeName, { color: textColor }]}>
                        {item.employees?.first_name} {item.employees?.last_name}
                    </Text>
                )}
                <Text style={[styles.historyType, { color: textColor, textTransform: 'capitalize' }]}>{item.leave_type}</Text>
                <Text style={[styles.historyDate, { color: mutedColor }]}>
                    {item.start_date} to {item.end_date}
                </Text>
                {item.reason ? (
                    <Text style={[styles.reasonText, { color: mutedColor }]} numberOfLines={1}>"{item.reason}"</Text>
                ) : null}
            </View>

            <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusTabText, { color: getStatusColor(item.status) }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>

                {isTeam && item.status === 'pending' && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => handleUpdateStatus(item.id, 'rejected')}
                            style={[styles.smallActionBtn, { backgroundColor: '#ef4444' }]}
                        >
                            <XCircle color="#fff" size={16} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleUpdateStatus(item.id, 'approved')}
                            style={[styles.smallActionBtn, { backgroundColor: '#10b981' }]}
                        >
                            <CheckCircle2 color="#fff" size={16} />
                        </TouchableOpacity>
                    </View>
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
                <Text style={[styles.title, { color: textColor }]}>Leave Requests</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tab Switcher */}
            <View style={[styles.tabContainer, { backgroundColor: cardBg }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'request' && { backgroundColor: primaryColor }]}
                    onPress={() => setActiveTab('request')}
                >
                    <Plus size={16} color={activeTab === 'request' ? '#fff' : mutedColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.tabText, { color: activeTab === 'request' ? '#fff' : mutedColor }]}>New</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && { backgroundColor: primaryColor }]}
                    onPress={() => setActiveTab('history')}
                >
                    <Clock size={16} color={activeTab === 'history' ? '#fff' : mutedColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.tabText, { color: activeTab === 'history' ? '#fff' : mutedColor }]}>Mine</Text>
                </TouchableOpacity>
                {userEmployee?.role !== 'employee' && (
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'team' && { backgroundColor: primaryColor }]}
                        onPress={() => setActiveTab('team')}
                    >
                        <Users size={16} color={activeTab === 'team' ? '#fff' : mutedColor} style={{ marginRight: 4 }} />
                        <Text style={[styles.tabText, { color: activeTab === 'team' ? '#fff' : mutedColor }]}>Team</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
                }
            >
                {activeTab === 'request' ? (
                    <View style={{ gap: 20 }}>
                        <View>
                            <Text style={[styles.label, { color: mutedColor }]}>Leave Type</Text>
                            <View style={styles.typeGrid}>
                                {requestTypes.map(type => (
                                    <TouchableOpacity
                                        key={type.id}
                                        style={[
                                            styles.typeButton,
                                            {
                                                backgroundColor: selectedType === type.id ? primaryColor + '20' : cardBg,
                                                borderColor: selectedType === type.id ? primaryColor : 'transparent',
                                                borderWidth: 1
                                            }
                                        ]}
                                        onPress={() => setSelectedType(type.id)}
                                    >
                                        <Text style={{ color: selectedType === type.id ? primaryColor : mutedColor, fontWeight: '600' }}>{type.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: mutedColor }]}>Start Date</Text>
                                <TouchableOpacity
                                    style={[styles.dateCard, { backgroundColor: cardBg }]}
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <CalendarIcon color={primaryColor} size={20} />
                                    <Text style={{ color: textColor }}>{startDate.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                                {showStartPicker && Platform.OS !== 'web' && (
                                    <DateTimePicker
                                        value={startDate}
                                        mode="date"
                                        onChange={(e, date) => {
                                            setShowStartPicker(false);
                                            if (date) setStartDate(date);
                                        }}
                                    />
                                )}
                                {showStartPicker && Platform.OS === 'web' && (
                                    <View style={{ padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
                                        <Text style={{ color: '#ef4444', fontSize: 12 }}>Picker not available on Web</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: mutedColor }]}>End Date</Text>
                                <TouchableOpacity
                                    style={[styles.dateCard, { backgroundColor: cardBg }]}
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <CalendarIcon color={primaryColor} size={20} />
                                    <Text style={{ color: textColor }}>{endDate.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                                {showEndPicker && Platform.OS !== 'web' && (
                                    <DateTimePicker
                                        value={endDate}
                                        mode="date"
                                        onChange={(e, date) => {
                                            setShowEndPicker(false);
                                            if (date) setEndDate(date);
                                        }}
                                    />
                                )}
                                {showEndPicker && Platform.OS === 'web' && (
                                    <View style={{ padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
                                        <Text style={{ color: '#ef4444', fontSize: 12 }}>Picker not available on Web</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View>
                            <Text style={[styles.label, { color: mutedColor }]}>Reason (Optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardBg, color: textColor }]}
                                placeholder="e.g. Family trip to Albania"
                                placeholderTextColor={mutedColor}
                                multiline
                                value={reason}
                                onChangeText={setReason}
                            />
                        </View>

                        <Button
                            title="Submit Request"
                            onPress={handleSubmit}
                            loading={submitting}
                        />
                    </View>
                ) : activeTab === 'history' ? (
                    <View style={{ gap: 12 }}>
                        {myRequests.length === 0 ? (
                            <Text style={{ color: mutedColor, textAlign: 'center', marginTop: 20 }}>No history found.</Text>
                        ) : (
                            myRequests.map(item => renderRequestItem(item, false))
                        )}
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        {teamRequests.length === 0 ? (
                            <Text style={{ color: mutedColor, textAlign: 'center', marginTop: 20 }}>No pending requests.</Text>
                        ) : (
                            teamRequests.map(item => renderRequestItem(item, true))
                        )}
                    </View>
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
    tabContainer: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
    tabText: { fontWeight: '700', fontSize: 13 },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, minWidth: '45%', alignItems: 'center' },
    dateCard: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderRadius: 12 },
    input: { height: 100, borderRadius: 12, padding: 16, textAlignVertical: 'top', fontSize: 15 },
    historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12 },
    employeeName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    historyType: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    historyDate: { fontSize: 13, marginBottom: 4 },
    reasonText: { fontSize: 12, fontStyle: 'italic' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusTabText: { fontSize: 11, fontWeight: '800' },
    smallActionBtn: { padding: 8, borderRadius: 10 },
    submitButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
