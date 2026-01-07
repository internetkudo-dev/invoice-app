import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../../components/common';
import {
    Users, UserPlus, UserCheck, ClipboardList, Copy, RefreshCw,
    ChevronRight, Shield, FileText, Clock, Calendar, CalendarCheck, DollarSign, Wallet, ShieldCheck, User, Briefcase
} from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import * as Clipboard from 'expo-clipboard';
import { t } from '../../i18n';

export function HRDashboardScreen({ navigation }: any) {
    const { isDark, primaryColor, language } = useTheme();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Get user's profile and company
            const { data: profile } = await supabase
                .from('profiles')
                .select('active_company_id, company_id')
                .eq('id', user.id)
                .single();

            const companyId = profile?.active_company_id || profile?.company_id;

            // Check if user is owner
            const { data: membership } = await supabase
                .from('memberships')
                .select('role')
                .eq('user_id', user.id)
                .eq('company_id', companyId)
                .single();

            setIsOwner(membership?.role === 'owner' || membership?.role === 'admin');

            // Get company invite token
            if (companyId) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('invite_token')
                    .eq('id', companyId)
                    .single();
                setInviteToken(company?.invite_token);
            }

            // Get employee stats
            const { data: employees } = await supabase
                .from('employees')
                .select('id, status')
                .eq('company_id', companyId);

            if (employees) {
                setStats({
                    total: employees.length,
                    active: employees.filter(e => e.status === 'active').length,
                    pending: employees.filter(e => e.status === 'onboarding').length
                });
            }

            // Get pending join requests
            if (membership?.role === 'owner') {
                const { data: pending } = await supabase
                    .from('memberships')
                    .select('id')
                    .eq('company_id', companyId)
                    .eq('status', 'pending');
                setPendingCount(pending?.length || 0);
            }

        } catch (error) {
            console.error('Error fetching HR data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const generateToken = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('active_company_id')
                .eq('id', user.id)
                .single();

            if (profile?.active_company_id) {
                const { data, error } = await supabase.rpc('generate_company_invite_token', {
                    company_uuid: profile.active_company_id
                });

                if (error) throw error;
                setInviteToken(data);
                Alert.alert('Success', 'New invite token generated!');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToken = async () => {
        if (inviteToken) {
            await Clipboard.setStringAsync(inviteToken);
            Alert.alert('Copied', 'Invite token copied to clipboard. Share this with new employees.');
        }
    };

    const renderStatCard = (title: string, value: number, icon: any, color: string) => {
        const Icon = icon;
        return (
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
                <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                    <Icon color={color} size={20} />
                </View>
                <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: mutedColor }]}>{title}</Text>
            </View>
        );
    };

    const renderActionCard = (
        title: string,
        subtitle: string,
        icon: any,
        color: string,
        onPress: () => void,
        badge?: number
    ) => {
        const Icon = icon;
        return (
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: cardBg }]} onPress={onPress}>
                <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
                    <Icon color={color} size={22} />
                </View>
                <View style={styles.actionInfo}>
                    <Text style={[styles.actionTitle, { color: textColor }]}>{title}</Text>
                    <Text style={[styles.actionSubtitle, { color: mutedColor }]}>{subtitle}</Text>
                </View>
                {badge !== undefined && badge > 0 && (
                    <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                )}
                <ChevronRight color={mutedColor} size={18} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>Human Resources</Text>
                    <Text style={[styles.title, { color: textColor }]}>HR Dashboard</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.profileButton, { backgroundColor: cardBg, marginRight: 8 }]}>
                        <Briefcase color={isDark ? '#fff' : '#1e293b'} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.profileButton, { backgroundColor: cardBg }]}>
                        <User color={isDark ? '#fff' : '#1e293b'} size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            >
                {/* Stats Row */}
                <View style={styles.statsRow}>
                    {renderStatCard('Total', stats.total, Users, '#6366f1')}
                    {renderStatCard('Active', stats.active, UserCheck, '#10b981')}
                    {renderStatCard('Onboarding', stats.pending, Clock, '#f59e0b')}
                </View>

                {/* Invite Token Card - Owner Only */}
                {isOwner && (
                    <Card style={[styles.tokenCard, { backgroundColor: cardBg }]}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Workspace Invite Token</Text>
                        <Text style={[styles.hint, { color: mutedColor }]}>
                            Share this token with employees to invite them to your workspace.
                        </Text>

                        <View style={styles.tokenRow}>
                            <View style={[styles.tokenBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                                <Text style={[styles.tokenText, { color: textColor }]} numberOfLines={1}>
                                    {inviteToken || 'No token generated'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.tokenBtn, { backgroundColor: primaryColor }]}
                                onPress={copyToken}
                                disabled={!inviteToken}
                            >
                                <Copy color="#fff" size={18} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tokenBtn, { backgroundColor: '#10b981' }]}
                                onPress={generateToken}
                            >
                                <RefreshCw color="#fff" size={18} />
                            </TouchableOpacity>
                        </View>
                    </Card>
                )}

                {/* Actions */}
                <Text style={[styles.sectionTitle, { color: textColor, marginTop: 24, marginBottom: 12 }]}>
                    Quick Actions
                </Text>

                {renderActionCard(
                    'Employee Directory',
                    'View and manage all employees',
                    Users,
                    '#6366f1',
                    () => navigation.navigate('EmployeeDirectory')
                )}

                {isOwner && renderActionCard(
                    'Add New Employee',
                    'Create employee profile',
                    UserPlus,
                    '#10b981',
                    () => navigation.navigate('EmployeeForm')
                )}

                {isOwner && renderActionCard(
                    'Join Requests',
                    'Review pending requests',
                    ClipboardList,
                    '#f59e0b',
                    () => navigation.navigate('JoinRequests'),
                    pendingCount
                )}

                {renderActionCard(
                    'Employee Contracts',
                    'Manage employment contracts',
                    FileText,
                    '#8b5cf6',
                    () => navigation.navigate('EmployeeVault')
                )}

                {/* Time Management Section */}
                <Text style={[styles.sectionTitle, { color: textColor, marginTop: 24, marginBottom: 12 }]}>
                    Koha & Prezenca
                </Text>

                {renderActionCard(
                    'Prezenca',
                    'Mbikëqyr prezencën e punëtorëve',
                    Clock,
                    '#0891b2',
                    () => navigation.navigate('Attendance')
                )}

                {renderActionCard(
                    'Kërkesa për leje',
                    'Kërko dhe menaxho pushime',
                    CalendarCheck,
                    '#10b981',
                    () => navigation.navigate('LeaveRequests')
                )}

                {renderActionCard(
                    'Orari i turneve',
                    'Planifiko oraret e punës',
                    Calendar,
                    '#f59e0b',
                    () => navigation.navigate('Schedule')
                )}

                {/* Finance Section */}
                <Text style={[styles.sectionTitle, { color: textColor, marginTop: 24, marginBottom: 12 }]}>
                    Financa & Pagat
                </Text>

                {renderActionCard(
                    'Pagat',
                    'Menaxho listëpagesa dhe bonuse',
                    DollarSign,
                    '#6366f1',
                    () => navigation.navigate('Payroll')
                )}

                {renderActionCard(
                    'Komplianca',
                    'Dokumentet ligjore dhe raportet',
                    ShieldCheck,
                    '#ec4899',
                    () => navigation.navigate('Compliance')
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    profileButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    statValue: { fontSize: 24, fontWeight: 'bold' },
    statLabel: { fontSize: 12 },
    tokenCard: { padding: 16, borderRadius: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    hint: { fontSize: 13, marginBottom: 12 },
    tokenRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    tokenBox: { flex: 1, padding: 12, borderRadius: 10 },
    tokenText: { fontSize: 13, fontFamily: 'monospace' },
    tokenBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        marginBottom: 10,
        gap: 14
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionInfo: { flex: 1 },
    actionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    actionSubtitle: { fontSize: 13 },
    badge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
