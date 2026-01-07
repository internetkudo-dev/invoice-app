import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
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
    };
}

export function JoinRequestsScreen({ navigation }: any) {
    const { isDark, primaryColor, language } = useTheme();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState<JoinRequest[]>([]);

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

                // Get user emails for each request
                const requestsWithUsers = await Promise.all(
                    (memberships || []).map(async (m) => {
                        const { data: userData } = await supabase.auth.admin.getUserById(m.user_id);
                        return {
                            ...m,
                            user: { email: userData?.user?.email || 'Unknown' }
                        };
                    })
                );

                setRequests(memberships || []);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleApprove = async (requestId: string) => {
        Alert.alert(
            'Approve Request',
            'This user will gain access to your company data.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const { error } = await supabase
                                .from('memberships')
                                .update({ status: 'active', role: 'employee' })
                                .eq('id', requestId);

                            if (error) throw error;
                            Alert.alert('Success', 'Request approved!');
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

    const renderRequest = ({ item }: { item: JoinRequest }) => (
        <Card style={[styles.requestCard, { backgroundColor: cardBg }]}>
            <View style={styles.requestInfo}>
                <View style={[styles.avatar, { backgroundColor: `${primaryColor}20` }]}>
                    <User color={primaryColor} size={20} />
                </View>
                <View style={styles.requestDetails}>
                    <Text style={[styles.email, { color: textColor }]}>
                        {item.user?.email || `User ${item.user_id.substring(0, 8)}...`}
                    </Text>
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
                    style={[styles.actionBtn, { backgroundColor: '#10b98115' }]}
                    onPress={() => handleApprove(item.id)}
                >
                    <Check color="#10b981" size={20} />
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
    email: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
});
