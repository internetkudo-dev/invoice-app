import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button, Card, LoadingOverlay } from '../../components/common';
import { supabase } from '../../api/supabase';
import { t } from '../../i18n';
import { ChevronLeft } from 'lucide-react-native';

export function EmployeeFormScreen({ navigation, route }: any) {
    const { isDark, primaryColor, language } = useTheme();
    const [loading, setLoading] = useState(false);
    const [permissions, setPermissions] = useState<any>({
        view_payroll: false,
        manage_schedule: false,
        approve_leaves: false,
        view_directory: true
    });
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('employees').select('role').eq('user_id', user.id).single();
            if (data?.role === 'admin' || data?.role === 'owner') {
                setIsAdmin(true);
            }
        }
    };

    const togglePermission = (key: string) => {
        setPermissions((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    // ... existing imports/state ...

    const renderPermissions = () => (
        <View style={{ marginTop: 16 }}>
            <Text style={[styles.label, { color: labelColor, marginBottom: 8 }]}>Access Permissions</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Object.keys(permissions).map((key) => (
                    <TouchableOpacity
                        key={key}
                        onPress={() => togglePermission(key)}
                        style={[
                            styles.optionChip,
                            {
                                backgroundColor: permissions[key] ? primaryColor : (isDark ? '#334155' : '#e2e8f0'),
                                flexDirection: 'row', alignItems: 'center', gap: 6
                            }
                        ]}
                    >
                        <Text style={{
                            color: permissions[key] ? '#fff' : (isDark ? '#cbd5e1' : '#475569'),
                            textTransform: 'capitalize',
                            fontSize: 13,
                            fontWeight: '500'
                        }}>
                            {key.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    // ... inside render ... 
    // Add {isAdmin && renderPermissions()} after salary input or role select


    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [department, setDepartment] = useState('');
    const [status, setStatus] = useState('active'); // active, onboarding, terminated, on_leave
    const [role, setRole] = useState('employee'); // admin, manager, employee
    const [salary, setSalary] = useState('');

    const isEditing = route.params?.id;

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const inputBorder = isDark ? '#334155' : '#e2e8f0';

    useEffect(() => {
        if (isEditing) {
            fetchEmployeeDetails();
        }
    }, [isEditing]);

    const fetchEmployeeDetails = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', isEditing)
            .single();

        if (data) {
            setFirstName(data.first_name);
            setLastName(data.last_name);
            setEmail(data.email || '');
            setPhone(data.phone || '');
            setJobTitle(data.job_title || '');
            setDepartment(data.department || '');
            setStatus(data.status || 'active');
            setRole(data.role || 'employee');
            setSalary(data.base_salary ? data.base_salary.toString() : '');
            if (data.permissions) {
                setPermissions((prev: any) => ({ ...prev, ...data.permissions }));
            }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!firstName || !lastName) {
            Alert.alert('Error', 'First Name and Last Name are required.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Find current user's profile to get company_id
            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
            const companyId = profile?.company_id || user.id; // Fallback to user ID if self-employed

            const payload = {
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                job_title: jobTitle,
                department,
                status,
                role,
                base_salary: parseFloat(salary) || 0,
                company_id: companyId,
                permissions: permissions,
                updated_at: new Date(),
            };

            let error;
            if (isEditing) {
                const { error: updateError } = await supabase
                    .from('employees')
                    .update(payload)
                    .eq('id', isEditing);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('employees')
                    .insert([{ ...payload, created_at: new Date() }]);
                error = insertError;
            }

            if (error) throw error;

            Alert.alert('Success', `Employee ${isEditing ? 'updated' : 'added'} successfully.`);
            navigation.goBack();

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (label: string, value: string, setValue: (s: string) => void, placeholder: string, keyboardType: any = 'default') => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
            <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor: inputBorder, color: textColor }]}
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                keyboardType={keyboardType}
            />
        </View>
    );

    const renderSelect = (label: string, value: string, setValue: (s: string) => void, options: string[]) => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt}
                        onPress={() => setValue(opt)}
                        style={[
                            styles.optionChip,
                            {
                                backgroundColor: value === opt ? primaryColor : (isDark ? '#334155' : '#e2e8f0'),
                            }
                        ]}
                    >
                        <Text style={{
                            color: value === opt ? '#fff' : (isDark ? '#cbd5e1' : '#475569'),
                            textTransform: 'capitalize',
                            fontSize: 13,
                            fontWeight: '500'
                        }}>
                            {opt.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <LoadingOverlay visible={loading} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>
                    {isEditing ? 'Edit Employee' : 'Add New Employee'}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={[styles.formCard, { backgroundColor: cardBg }]}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            {renderInput('First Name', firstName, setFirstName, 'Jane')}
                        </View>
                        <View style={{ flex: 1 }}>
                            {renderInput('Last Name', lastName, setLastName, 'Doe')}
                        </View>
                    </View>

                    {renderInput('Job Title', jobTitle, setJobTitle, 'e.g. Sales Manager')}
                    {renderInput('Department', department, setDepartment, 'e.g. Sales')}

                    {renderInput('Email (Optional)', email, setEmail, 'jane@company.com', 'email-address')}
                    {renderInput('Phone (Optional)', phone, setPhone, '+383...', 'phone-pad')}

                    {renderSelect('Status', status, setStatus, ['active', 'onboarding', 'on_leave', 'terminated'])}
                    {renderSelect('System Role', role, setRole, ['employee', 'manager', 'admin'])}

                    {renderInput('Base Salary (Monthly)', salary, setSalary, '0.00', 'numeric')}

                    {isAdmin && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={[styles.label, { color: labelColor, marginBottom: 8 }]}>Access Permissions</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {Object.keys(permissions).map((key) => (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() => togglePermission(key)}
                                        style={[
                                            styles.optionChip,
                                            {
                                                backgroundColor: permissions[key] ? primaryColor : (isDark ? '#334155' : '#e2e8f0'),
                                                flexDirection: 'row', alignItems: 'center', gap: 6
                                            }
                                        ]}
                                    >
                                        <Text style={{
                                            color: permissions[key] ? '#fff' : (isDark ? '#cbd5e1' : '#475569'),
                                            textTransform: 'capitalize',
                                            fontSize: 13,
                                            fontWeight: '500'
                                        }}>
                                            {key.replace('_', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </Card>

                <Button
                    title="Save Employee"
                    onPress={handleSave}
                    style={{ marginTop: 20 }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
    backButton: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700' },
    content: { padding: 20 },
    formCard: { padding: 20, borderRadius: 16, gap: 16 },
    inputGroup: { gap: 6 },
    label: { fontSize: 13, fontWeight: '500' },
    input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, fontSize: 15 },
    optionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
});
