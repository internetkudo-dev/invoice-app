import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, RefreshControl } from 'react-native';
import { ArrowLeft, Plus, Building, Check, Trash2, Building2 } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';
import { Company, Membership } from '../../types';
import { t } from '../../i18n';

export function ManageCompaniesScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');

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
            // Fetch memberships with company details
            const { data: members, error } = await supabase
                .from('memberships')
                .select('*, company:companies(*)')
                .eq('user_id', user.id);

            if (error) throw error;
            setMemberships(members || []);

            // Fetch active company from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('active_company_id')
                .eq('id', user.id)
                .single();

            if (profile?.active_company_id) {
                setActiveCompanyId(profile.active_company_id);
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = async (companyId: string) => {
        if (companyId === activeCompanyId) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ active_company_id: companyId })
                .eq('id', user?.id);

            if (error) throw error;
            setActiveCompanyId(companyId);
            Alert.alert('Success', 'Switched company successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newCompanyName.trim()) return;

        setLoading(true);
        try {
            // 1. Create company using RPC to avoid RLS race conditions
            const { data, error } = await supabase
                .rpc('create_company_and_owner', { p_company_name: newCompanyName });

            if (error) throw error;

            // The RPC returns { id, company_name }, we need to treat it as the company object
            const company = data as any;
            if (!company?.id) throw new Error("Failed to create company");

            // 3. Switch to new company
            await handleSwitch(company.id);

            setNewCompanyName('');
            setShowCreate(false);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Manage Companies</Text>
                <TouchableOpacity onPress={() => setShowCreate(!showCreate)}>
                    <Plus color={primaryColor} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
            >
                {showCreate && (
                    <Card style={styles.createCard}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Add New Company</Text>
                        <Input
                            label="Company Name"
                            value={newCompanyName}
                            onChangeText={setNewCompanyName}
                            placeholder="e.g. Acme Corp"
                        />
                        <View style={styles.createActions}>
                            <Button title="Cancel" variant="outline" onPress={() => setShowCreate(false)} style={{ flex: 1 }} />
                            <Button title="Create" onPress={handleCreate} loading={loading} style={{ flex: 1 }} />
                        </View>
                    </Card>
                )}

                <Text style={[styles.label, { color: mutedColor }]}>YOUR COMPANIES</Text>
                {memberships.map((membership) => {
                    const company = membership.company!;
                    const isActive = activeCompanyId === company.id;
                    return (
                        <TouchableOpacity
                            key={company.id}
                            activeOpacity={0.7}
                            onPress={() => handleSwitch(company.id)}
                        >
                            <Card style={[styles.companyCard, isActive && { borderColor: primaryColor, borderWidth: 2 }]}>
                                <View style={[styles.iconContainer, { backgroundColor: `${isActive ? primaryColor : '#64748b'}20` }]}>
                                    <Building2 color={isActive ? primaryColor : '#64748b'} size={24} />
                                </View>
                                <View style={styles.companyInfo}>
                                    <Text style={[styles.companyName, { color: textColor }]}>{company.company_name}</Text>
                                    <Text style={[styles.companyRole, { color: mutedColor }]}>Role: {membership.role}</Text>
                                </View>
                                {isActive && (
                                    <View style={[styles.activeBadge, { backgroundColor: primaryColor }]}>
                                        <Check color="#fff" size={14} />
                                    </View>
                                )}
                            </Card>
                        </TouchableOpacity>
                    );
                })}

                {memberships.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                        <Building color={mutedColor} size={48} />
                        <Text style={{ color: mutedColor, marginTop: 12 }}>No companies found.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: {},
    title: { fontSize: 20, fontWeight: 'bold' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },
    createCard: { padding: 16, marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    createActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    label: { fontSize: 12, fontWeight: 'bold', marginBottom: 12, marginHorizontal: 4 },
    companyCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 },
    iconContainer: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    companyInfo: { flex: 1 },
    companyName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    companyRole: { fontSize: 12, textTransform: 'capitalize' },
    activeBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
});
