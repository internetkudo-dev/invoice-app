import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, TextInput } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../../components/common';
import { ChevronLeft, User, Check, X, Clock, Mail } from 'lucide-react-native';
import { supabase } from '../../api/supabase';

interface JoinRequest {
    id: string;
    user_id: string;
    status: string;
    created_at: string;
    user?: {
        email: string;
        name?: string;
    };
}

export function JoinRequestsScreen({ navigation }: any) {
    const { isDark, primaryColor, language } = useTheme();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState<JoinRequest[]>([]);

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', role: 'employee' });

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Get user's company
            const { data: profile } = await supabase
                .from('profiles')
                .select('active_company_id')
                .eq('id', user.id)
                .single();

            if (profile?.active_company_id) {
                // Get pending memberships
                const { data: memberships, error } = await supabase
                    .from('memberships')
                    .select('id, user_id, status, created_at')
                    .eq('company_id', profile.active_company_id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Get user emails from profiles
                const userIds = memberships.map(m => m.user_id);
                const { data: userProfiles } = await supabase
                    .from('profiles')
                    .select('id, email, first_name, last_name')
                    .in('id', userIds);

                const profileMap = new Map(userProfiles?.map(p => [p.id, p]));

                const requestsWithUsers = memberships.map(m => {
                    const profile = profileMap.get(m.user_id);
                    return {
                        ...m,
                        user: {
                            email: profile?.email || 'Unknown',
                            name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : undefined
                        }
                    };
                });

                setRequests(requestsWithUsers);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const openEditModal = (request: JoinRequest) => {
        setSelectedRequest(request);
        // split name if available
        const names = (request.user?.name || '').split(' ');
        setEditForm({
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
            role: 'employee'
        });
        setEditModalVisible(true);
    };

    const handleApproveWithEdit = async () => {
        if (!selectedRequest) return;
        setLoading(true);
        try {
            // 1. Update Membership
            const { error: memError } = await supabase
                .from('memberships')
                .update({ status: 'active', role: editForm.role })
                .eq('id', selectedRequest.id);

            if (memError) throw memError;

            // 2. Update Employee Record
            const { error: empError } = await supabase
                .from('employees')
                .update({
                    status: 'active',
                    first_name: editForm.firstName,
                    last_name: editForm.lastName,
                    role: editForm.role
                })
                .eq('user_id', selectedRequest.user_id);

            if (empError) console.error("Error updating employee:", empError);

            // 3. Update Profile Name (optional but good for consistency)
            await supabase.from('profiles').update({
                first_name: editForm.firstName,
                last_name: editForm.lastName
            }).eq('id', selectedRequest.user_id);

            Alert.alert('Success', 'User approved and updated successfully.');
            setEditModalVisible(false);
            fetchRequests();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (requestId: string) => {
        Alert.alert(
            'Reject Request',
            'This user will not be able to join your company.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const { error } = await supabase
                                .from('memberships')
                                .update({ status: 'rejected' })
                                .eq('id', requestId);

                            if (error) throw error;
                            Alert.alert('Done', 'Request rejected');
                            fetchRequests();
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderEditModal = () => (
        <Modal visible={editModalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                    <Text style={[styles.modalTitle, { color: textColor }]}>Approve & Edit</Text>

                    <Text style={[styles.label, { color: mutedColor }]}>First Name</Text>
                    <TextInput
                        style={[styles.input, { color: textColor, borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}
                        value={editForm.firstName}
                        onChangeText={(t) => setEditForm(prev => ({ ...prev, firstName: t }))}
                    />

                    <Text style={[styles.label, { color: mutedColor }]}>Last Name</Text>
                    <TextInput
                        style={[styles.input, { color: textColor, borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}
                        value={editForm.lastName}
                        onChangeText={(t) => setEditForm(prev => ({ ...prev, lastName: t }))}
                    />

                    <Text style={[styles.label, { color: mutedColor }]}>Role</Text>
                    <View style={[styles.roleSelector, { flexDirection: 'row', gap: 8 }]}>
                        {['employee', 'manager', 'admin'].map(r => (
                            <TouchableOpacity
                                key={r}
                                onPress={() => setEditForm(prev => ({ ...prev, role: r }))}
                                style={[
                                    styles.roleOption,
                                    editForm.role === r ? { backgroundColor: primaryColor } : { backgroundColor: isDark ? '#334155' : '#e2e8f0' }
                                ]}
                            >
                                <Text style={{ color: editForm.role === r ? '#fff' : mutedColor }}>
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.modalActions}>
                        <Button title="Cancel" onPress={() => setEditModalVisible(false)} style={{ flex: 1, backgroundColor: mutedColor }} />
                        <Button title="Confirm Approval" onPress={handleApproveWithEdit} style={{ flex: 1 }} />
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderRequest = ({ item }: { item: JoinRequest }) => (
        <Card style={[styles.requestCard, { backgroundColor: cardBg }]}>
            <View style={styles.requestInfo}>
                <View style={[styles.avatar, { backgroundColor: `${primaryColor}20` }]}>
                    <User color={primaryColor} size={20} />
                </View>
                <View style={styles.requestDetails}>
                    <Text style={[styles.email, { color: textColor }]}>
                        {item.user?.name || item.user?.email || 'Unknown'}
                    </Text>
                    <Text style={[styles.meta, { color: mutedColor, fontSize: 11 }]}>{item.user?.email}</Text>
                    <View style={styles.metaRow}>
                        <Clock color={mutedColor} size={12} />
                        <Text style={[styles.meta, { color: mutedColor }]}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#10b98115', width: 'auto', paddingHorizontal: 12 }]}
                    onPress={() => openEditModal(item)}
                >
                    <Text style={{ color: '#10b981', fontWeight: 'bold' }}>Review</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#ef444415' }]}
                    onPress={() => handleReject(item.id)}
                >
                    <X color="#ef4444" size={20} />
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Join Requests</Text>
                <View style={{ width: 24 }} />
            </View>

            {requests.length === 0 && !loading ? (
                <View style={styles.emptyState}>
                    <Mail color={mutedColor} size={48} />
                    <Text style={[styles.emptyText, { color: mutedColor }]}>
                        No pending requests
                    </Text>
                    <Text style={[styles.emptyHint, { color: mutedColor }]}>
                        Share your invite token with employees to receive join requests.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRequest}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} />
                    }
                />
            )}
            {renderEditModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16
    },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700' },
    list: { padding: 16 },
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 14,
        marginBottom: 12
    },
    requestInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    requestDetails: { flex: 1 },
    email: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    meta: { fontSize: 12 },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32
    },
    emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
    emptyHint: { fontSize: 14, textAlign: 'center', marginTop: 8 },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24
    },
    modalContent: {
        padding: 24,
        borderRadius: 16,
        gap: 12
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    label: { fontSize: 12, fontWeight: '600', marginTop: 8 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 14
    },
    roleSelector: { marginVertical: 8 },
    roleOption: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16
    }
});
