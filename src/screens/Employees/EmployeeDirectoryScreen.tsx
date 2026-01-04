import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button, Card } from '../../components/common';
import { Search, Plus, User, Phone, Mail, MoreVertical } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { t } from '../../i18n';

export function EmployeeDirectoryScreen({ navigation }: any) {
    const { isDark, primaryColor, language } = useTheme();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Admin & Tab State
    const [activeTab, setActiveTab] = useState<'active' | 'requests'>('active');
    const [isAdmin, setIsAdmin] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    useEffect(() => {
        checkUserRole();
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [activeTab]);

    const checkUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Check if user is owner of company OR has admin role
            const { data } = await supabase
                .from('employees')
                .select('role')
                .eq('user_id', user.id)
                .single();

            if (data?.role === 'admin' || data?.role === 'manager') {
                setIsAdmin(true);
            }
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });

            if (activeTab === 'requests') {
                query = query.eq('status', 'pending');
            } else {
                query = query.neq('status', 'pending');
            }

            const { data, error } = await query;
            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.log('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        const { error } = await supabase.from('employees').update({ status: 'active' }).eq('id', id);
        if (!error) fetchEmployees();
    };

    const handleReject = async (id: string) => {
        const { error } = await supabase.from('employees').delete().eq('id', id); // Or set to terminated
        if (!error) fetchEmployees();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return '#10b981';
            case 'onboarding': return '#3b82f6';
            case 'on_leave': return '#f59e0b';
            case 'terminated': return '#ef4444';
            case 'pending': return '#818cf8';
            default: return '#94a3b8';
        }
    };

    const renderItem = ({ item }: any) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('EmployeeForm', { id: item.id })}
            style={{ marginBottom: 12 }}
        >
            <Card style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        {item.avatar_url ? (
                            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: primaryColor + '20' }]}>
                                <Text style={[styles.avatarInitials, { color: primaryColor }]}>
                                    {item.first_name[0]}{item.last_name[0]}
                                </Text>
                            </View>
                        )}
                        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.name, { color: textColor }]}>{item.first_name} {item.last_name}</Text>
                        <Text style={[styles.role, { color: mutedColor }]}>{item.job_title || item.role}</Text>
                    </View>

                    {activeTab === 'requests' ? (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => handleReject(item.id)} style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleApprove(item.id)} style={[styles.actionBtn, { backgroundColor: '#10b981' }]}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={{ padding: 4 }}>
                            <MoreVertical color={mutedColor} size={20} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />

                <View style={styles.cardFooter}>
                    <View style={styles.contactItem}>
                        <Mail size={14} color={mutedColor} />
                        <Text style={[styles.contactText, { color: mutedColor }]}>{item.email || 'No email'}</Text>
                    </View>
                    <View style={styles.contactItem}>
                        <Phone size={14} color={mutedColor} />
                        <Text style={[styles.contactText, { color: mutedColor }]}>{item.phone || 'No phone'}</Text>
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    {/* Add Back Icon logic if needed, or rely on stack header */}
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Team Directory</Text>
                <View style={{ width: 40 }} />
            </View>

            {isAdmin && (
                <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 }}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('active')}
                        style={[styles.tab, activeTab === 'active' && { backgroundColor: primaryColor + '20' }]}
                    >
                        <Text style={{ color: activeTab === 'active' ? primaryColor : mutedColor, fontWeight: '600' }}>Active Team</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('requests')}
                        style={[styles.tab, activeTab === 'requests' && { backgroundColor: primaryColor + '20' }]}
                    >
                        <Text style={{ color: activeTab === 'requests' ? primaryColor : mutedColor, fontWeight: '600' }}>Join Requests</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.searchContainer}>

                <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
                    <Search color={mutedColor} size={20} />
                    <TextInput
                        placeholder="Search employees..."
                        placeholderTextColor={mutedColor}
                        style={[styles.input, { color: textColor }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: primaryColor }]}
                    onPress={() => navigation.navigate('EmployeeForm')}
                >
                    <Plus color="#fff" size={24} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={employees}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backButton: { padding: 8 },
    title: { fontSize: 20, fontWeight: '700' },
    searchContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, gap: 8 },
    input: { flex: 1, fontSize: 15 },
    addButton: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { padding: 16, borderRadius: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { position: 'relative' },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    avatarInitials: { fontSize: 18, fontWeight: '700' },
    statusIndicator: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
    name: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    role: { fontSize: 13 },
    divider: { height: 1, marginVertical: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    contactText: { fontSize: 12 },
    tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10 },
    actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, justifyContent: 'center' }
});
