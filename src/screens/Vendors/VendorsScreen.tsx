import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
    TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Search, Building2, Phone, Mail, MoreVertical, Trash2, Edit2, FileText } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { Vendor } from '../../types';
import { t } from '../../i18n';

export function VendorsScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useFocusEffect(
        useCallback(() => {
            fetchVendors();
        }, [user])
    );

    useEffect(() => {
        if (searchQuery) {
            const filtered = vendors.filter(v =>
                v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.phone?.includes(searchQuery)
            );
            setFilteredVendors(filtered);
        } else {
            setFilteredVendors(vendors);
        }
    }, [searchQuery, vendors]);

    const fetchVendors = async () => {
        if (!user) return;
        setLoading(true);

        const { data: profileData } = await supabase.from('profiles').select('company_id, active_company_id').eq('id', user.id).single();
        const companyId = profileData?.active_company_id || profileData?.company_id || user.id;

        const { data } = await supabase
            .from('vendors')
            .select('*')
            .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
            .order('name');

        if (data) {
            setVendors(data);
            setFilteredVendors(data);
        }
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchVendors();
        setRefreshing(false);
    };

    const handleDelete = (vendorId: string, vendorName: string) => {
        Alert.alert(
            t('delete', language),
            `Are you sure you want to delete "${vendorName}"?`,
            [
                { text: t('cancel', language), style: 'cancel' },
                {
                    text: t('delete', language),
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.from('vendors').delete().eq('id', vendorId);
                        fetchVendors();
                    }
                }
            ]
        );
    };

    const renderVendor = ({ item }: { item: Vendor }) => (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('VendorLedger', { vendorId: item.id })}
        >
            <Card style={[styles.vendorCard, { backgroundColor: cardBg }]}>
                <View style={styles.vendorHeader}>
                    <View style={[styles.avatarContainer, { backgroundColor: '#0891b220' }]}>
                        <Building2 color="#0891b2" size={24} />
                    </View>
                    <View style={styles.vendorInfo}>
                        <Text style={[styles.vendorName, { color: textColor }]}>{item.name}</Text>
                        {item.tax_id && (
                            <Text style={[styles.vendorDetail, { color: mutedColor }]}>
                                Tax ID: {item.tax_id}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                    >
                        <MoreVertical color={mutedColor} size={20} />
                    </TouchableOpacity>
                </View>

                {/* Contact details */}
                <View style={styles.contactRow}>
                    {item.email && (
                        <View style={styles.contactItem}>
                            <Mail color={mutedColor} size={14} />
                            <Text style={[styles.contactText, { color: mutedColor }]}>{item.email}</Text>
                        </View>
                    )}
                    {item.phone && (
                        <View style={styles.contactItem}>
                            <Phone color={mutedColor} size={14} />
                            <Text style={[styles.contactText, { color: mutedColor }]}>{item.phone}</Text>
                        </View>
                    )}
                </View>

                {/* Dropdown menu */}
                {activeMenu === item.id && (
                    <View style={[styles.dropdownMenu, { backgroundColor: cardBg, borderColor }]}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setActiveMenu(null);
                                navigation.navigate('VendorLedger', { vendorId: item.id });
                            }}
                        >
                            <FileText color={primaryColor} size={18} />
                            <Text style={[styles.menuText, { color: textColor }]}>{t('supplierCard', language)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setActiveMenu(null);
                                navigation.navigate('VendorForm', { vendorId: item.id });
                            }}
                        >
                            <Edit2 color="#10b981" size={18} />
                            <Text style={[styles.menuText, { color: textColor }]}>{t('edit', language)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setActiveMenu(null);
                                handleDelete(item.id, item.name);
                            }}
                        >
                            <Trash2 color="#ef4444" size={18} />
                            <Text style={[styles.menuText, { color: '#ef4444' }]}>{t('delete', language)}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>{t('vendors', language)}</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: primaryColor }]}
                    onPress={() => navigation.navigate('VendorForm')}
                >
                    <Plus color="#fff" size={20} />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor }]}>
                <Search color={mutedColor} size={20} />
                <TextInput
                    style={[styles.searchInput, { color: textColor }]}
                    placeholder={t('search', language)}
                    placeholderTextColor={mutedColor}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredVendors}
                keyExtractor={(item) => item.id}
                renderItem={renderVendor}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Building2 color={mutedColor} size={48} />
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            {loading ? 'Loading...' : t('noItemsYet', language)}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: { padding: 4 },
    title: { fontSize: 22, fontWeight: 'bold' },
    addButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 12 },
    searchInput: { flex: 1, fontSize: 16 },
    list: { padding: 16, paddingTop: 0 },
    vendorCard: { padding: 16, marginBottom: 12 },
    vendorHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    vendorInfo: { flex: 1 },
    vendorName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    vendorDetail: { fontSize: 13 },
    menuButton: { padding: 8 },
    contactRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 16 },
    contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    contactText: { fontSize: 13 },
    dropdownMenu: { position: 'absolute', right: 16, top: 56, borderRadius: 12, borderWidth: 1, padding: 8, zIndex: 100, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
    menuText: { fontSize: 14, fontWeight: '500' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
    emptyText: { fontSize: 16 },
});
