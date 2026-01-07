import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button, Card, LoadingOverlay } from '../../components/common';
import { supabase } from '../../api/supabase';
import { ArrowLeft, Clock, Calendar as CalendarIcon, User } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export function ShiftFormScreen({ navigation, route }: any) {
    const { isDark, primaryColor } = useTheme();
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [color, setColor] = useState('#6366f1');

    const [employees, setEmployees] = useState<any[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const inputBorder = isDark ? '#334155' : '#e2e8f0';

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('active_company_id').eq('id', user.id).single();
            const companyId = profile?.active_company_id;

            if (!companyId) return;

            const { data } = await supabase
                .from('employees')
                .select('id, first_name, last_name')
                .eq('company_id', companyId)
                .eq('status', 'active');

            setEmployees(data || []);
        }
    };

    const handleSave = async () => {
        if (!title || !selectedEmployeeId) {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('active_company_id').eq('id', user?.id).single();
            const companyId = profile?.active_company_id;

            if (!companyId) throw new Error("No active company found. Please select a company in settings.");

            // Combine date and time
            const startStr = `${startDate.toISOString().split('T')[0]}T${startTime.toTimeString().split(' ')[0]}`;
            const endStr = `${startDate.toISOString().split('T')[0]}T${endTime.toTimeString().split(' ')[0]}`;

            const { error } = await supabase
                .from('shifts')
                .insert({
                    employee_id: selectedEmployeeId,
                    company_id: companyId,
                    title: title,
                    start_time: new Date(startStr).toISOString(),
                    end_time: new Date(endStr).toISOString(),
                    color: color
                });

            if (error) throw error;

            Alert.alert("Success", "Shift assigned successfully.");
            navigation.goBack();
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <LoadingOverlay visible={loading} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Assign Shift</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={[styles.formCard, { backgroundColor: cardBg }]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: mutedColor }]}>Shift Title</Text>
                        <TextInput
                            style={[styles.input, { borderColor: inputBorder, color: textColor }]}
                            placeholder="e.g. Morning Shift"
                            placeholderTextColor={mutedColor}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: mutedColor }]}>Employee</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                            {employees.map(emp => (
                                <TouchableOpacity
                                    key={emp.id}
                                    onPress={() => setSelectedEmployeeId(emp.id)}
                                    style={[
                                        styles.empChip,
                                        {
                                            backgroundColor: selectedEmployeeId === emp.id ? primaryColor : (isDark ? '#334155' : '#f1f5f9'),
                                            borderColor: selectedEmployeeId === emp.id ? primaryColor : inputBorder
                                        }
                                    ]}
                                >
                                    <User size={14} color={selectedEmployeeId === emp.id ? '#fff' : mutedColor} />
                                    <Text style={{ color: selectedEmployeeId === emp.id ? '#fff' : textColor, fontWeight: '600' }}>
                                        {emp.first_name} {emp.last_name[0]}.
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: mutedColor }]}>Date</Text>
                        <TouchableOpacity style={[styles.datePickerBtn, { borderColor: inputBorder }]} onPress={() => setShowDatePicker(true)}>
                            <CalendarIcon size={18} color={primaryColor} />
                            <Text style={{ color: textColor }}>{startDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        {showDatePicker && Platform.OS !== 'web' && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                onChange={(e, d) => { setShowDatePicker(false); if (d) setStartDate(d); }}
                            />
                        )}
                        {showDatePicker && Platform.OS === 'web' && (
                            <View style={{ padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
                                <Text style={{ color: '#ef4444', fontSize: 12 }}>DatePicker not available on Web</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.label, { color: mutedColor }]}>From</Text>
                            <TouchableOpacity style={[styles.datePickerBtn, { borderColor: inputBorder }]} onPress={() => setShowStartTimePicker(true)}>
                                <Clock size={18} color={primaryColor} />
                                <Text style={{ color: textColor }}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                            </TouchableOpacity>
                            {showStartTimePicker && Platform.OS !== 'web' && (
                                <DateTimePicker
                                    value={startTime}
                                    mode="time"
                                    is24Hour={true}
                                    onChange={(e, d) => { setShowStartTimePicker(false); if (d) setStartTime(d); }}
                                />
                            )}
                            {showStartTimePicker && Platform.OS === 'web' && (
                                <Text style={{ color: '#ef4444', fontSize: 10, marginTop: 4 }}>TimePicker N/A (Web)</Text>
                            )}
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.label, { color: mutedColor }]}>To</Text>
                            <TouchableOpacity style={[styles.datePickerBtn, { borderColor: inputBorder }]} onPress={() => setShowEndTimePicker(true)}>
                                <Clock size={18} color={primaryColor} />
                                <Text style={{ color: textColor }}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                            </TouchableOpacity>
                            {showEndTimePicker && Platform.OS !== 'web' && (
                                <DateTimePicker
                                    value={endTime}
                                    mode="time"
                                    is24Hour={true}
                                    onChange={(e, d) => { setShowEndTimePicker(false); if (d) setEndTime(d); }}
                                />
                            )}
                            {showEndTimePicker && Platform.OS === 'web' && (
                                <Text style={{ color: '#ef4444', fontSize: 10, marginTop: 4 }}>TimePicker N/A (Web)</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: mutedColor }]}>Label Color</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            {colors.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    onPress={() => setColor(c)}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: textColor }
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                </Card>

                <Button
                    title="Assign Shift"
                    onPress={handleSave}
                    style={{ marginTop: 20 }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backButton: { padding: 8 },
    title: { fontSize: 20, fontWeight: '700' },
    content: { padding: 20 },
    formCard: { padding: 20, borderRadius: 16, gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { height: 48, borderBottomWidth: 1, fontSize: 16, paddingHorizontal: 4 },
    empChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
    datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 10 },
    colorCircle: { width: 32, height: 32, borderRadius: 16 },
});
