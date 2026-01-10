import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    StyleSheet,
    TextInput,
} from 'react-native';
import { Trash2, Search, Building2, DollarSign, TrendingDown, MapPin, Mail, Phone, FileText, Edit2, X, Plus } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, FAB } from '../../components/common';

import { Vendor } from '../../types';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';

interface VendorsScreenProps {
    navigation: any;
    showHeader?: boolean;
}

export function VendorsScreen({ navigation }: VendorsScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'recent' | 'value'>('name');
    const [vendorStats, setVendorStats] = useState<{ [key: string]: number }>({});

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#1e293b' : '#ffffff';

    const cities = ['Të gjitha', ...Array.from(new Set(vendors.map(v => v.address?.split(',').pop()?.trim()).filter((c): c is string => !!c)))];

    const stats = {
        totalVendors: vendors.length,
        totalExpenses: Object.values(vendorStats).reduce((sum, val) => sum + val, 0),
        activeVendors: vendors.filter(v => vendorStats[v.id] > 0).length,
        withTaxId: vendors.filter(v => !!v.tax_id).length,
    };

    useFocusEffect(
        useCallback(() => {
            fetchVendors();
        }, [user])
    );

    const fetchVendors = async () => {
        if (!user) return;
        try {
            console.log('Step 1: Fetching profile...');
            const { data: profileData, error: profileError } = await supabase.from('profiles').select('company_id, active_company_id').eq('id', user.id).single();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                return;
            }

            const companyId = profileData?.active_company_id || profileData?.company_id || user.id;
            console.log('Step 2: Fetching vendors with companyId:', companyId);

            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            if (error) {
                console.error('Error fetching vendors:', error);
                Alert.alert(t('error', language), t('loadError', language));
                return;
            }

            console.log('Step 3: Vendors fetched, count:', data?.length);
            if (data) {
                setVendors(data);

                console.log('Step 4: Fetching expenses...');
                const { data: expenses, error: expenseError } = await supabase
                    .from('expenses')
                    .select('vendor_id, amount')
                    .eq('user_id', user.id);

                if (expenseError) {
                    console.error('Expenses fetch error:', expenseError);
                }

                if (expenses) {
                    const expenseMap: { [key: string]: number } = {};
                    expenses.forEach((exp: any) => {
                        if (exp.vendor_id) {
                            expenseMap[exp.vendor_id] = (expenseMap[exp.vendor_id] || 0) + Number(exp.amount || 0);
                        }
                    });
                    setVendorStats(expenseMap);
                }
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        }
    };

    const applyFiltersAndSort = (data: Vendor[], query: string, city: string | null, sort: string) => {
        let filtered = [...data];

        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = filtered.filter(v =>
                (v.name || '').toLowerCase().includes(q) ||
                (v.email || '').toLowerCase().includes(q) ||
                (v.phone || '').includes(q) ||
                (v.tax_id || '').toLowerCase().includes(q)
            );
        }

        if (city && city !== 'Të gjitha') {
            filtered = filtered.filter(v => v.address?.includes(city));
        }

        filtered.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'value') return (vendorStats[b.id] || 0) - (vendorStats[a.id] || 0);
            return 0;
        });

        setFilteredVendors(filtered);
    };

    useEffect(() => {
        applyFiltersAndSort(vendors, searchQuery, selectedFilter, sortBy);
    }, [searchQuery, selectedFilter, sortBy, vendors, vendorStats]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchVendors();
        setRefreshing(false);
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(t('delete', language), `${t('areYouSure', language) || 'Are you sure?'} "${name}"`, [
            { text: t('cancel', language), style: 'cancel' },
            {
                text: t('delete', language),
                style: 'destructive',
                onPress: async () => {
                    await supabase.from('vendors').delete().eq('id', id);
                    fetchVendors();
                },
            },
        ]);
    };

    const renderStatCard = (title: string, value: string | number, icon: any, color: string) => {
        const Icon = icon;
        return (
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
                <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
                    <Icon color={color} size={20} />
                </View>
                <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: mutedColor }]}>{title}</Text>
            </View>
        );
    };

    const renderVendor = (item: Vendor) => {
        const expenses = vendorStats[item.id] || 0;

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('VendorLedger', { vendorId: item.id })}
            >
                <View style={[styles.vendorCard, { backgroundColor: cardBg }]}>
                    <View style={styles.vendorHeader}>
                        <View style={styles.vendorInfo}>
                            <View style={styles.nameRow}>
                                <View style={[styles.avatarContainer, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.1)' }]}>
                                    <Building2 color="#0ea5e9" size={20} />
                                </View>
                                <View>
                                    <Text style={[styles.vendorName, { color: textColor }]}>{item.name}</Text>
                                    {item.tax_id && (
                                        <Text style={[styles.taxId, { color: mutedColor }]}>{item.tax_id}</Text>
                                    )}
                                </View>
                            </View>

                            <View style={styles.contactDetails}>
                                {item.email && (
                                    <View style={styles.contactItem}>
                                        <Mail size={12} color={mutedColor} />
                                        <Text style={[styles.contactText, { color: mutedColor }]}>{item.email}</Text>
                                    </View>
                                )}
                                {item.phone && (
                                    <View style={styles.contactItem}>
                                        <Phone size={12} color={mutedColor} />
                                        <Text style={[styles.contactText, { color: mutedColor }]}>{item.phone}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteButton}>
                            <Trash2 color={mutedColor} size={18} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.vendorFooter}>
                        <View style={styles.expenseRow}>
                            <Text style={[styles.expenseValue, { color: '#ef4444' }]}>{formatCurrency(expenses)}</Text>
                            <Text style={[styles.expenseLabel, { color: mutedColor }]}>shpenzime</Text>
                        </View>
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('VendorForm', { vendorId: item.id })}
                                style={[styles.miniBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                            >
                                <Edit2 color={textColor} size={16} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{t('management', language)}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('vendors', language)}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: cardBg }]}
                    onPress={() => navigation.navigate('VendorForm')}
                >
                    <Plus color={primaryColor} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats */}
                <View style={styles.statsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                        {renderStatCard(t('vendors', language), stats.totalVendors, Building2, '#818cf8')}
                        {renderStatCard(t('expenses', language), formatCurrency(stats.totalExpenses), TrendingDown, '#ef4444')}
                        {renderStatCard(t('taxRegistered', language), stats.withTaxId, FileText, '#10b981')}
                    </ScrollView>
                </View>

                {/* Filters */}
                <View>
                    <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
                        <Search color={mutedColor} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder={t('search', language)}
                            placeholderTextColor={mutedColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X color={mutedColor} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {cities.map((city, idx) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => setSelectedFilter(city === 'Të gjitha' ? null : city)}
                                style={[
                                    styles.filterChip,
                                    { backgroundColor: cardBg },
                                    ((selectedFilter === null && city === 'Të gjitha') || selectedFilter === city) && { backgroundColor: primaryColor }
                                ]}
                            >
                                <Text style={[
                                    styles.filterText,
                                    { color: ((selectedFilter === null && city === 'Të gjitha') || selectedFilter === city) ? '#fff' : mutedColor }
                                ]}>{city}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {filteredVendors.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Building2 color={mutedColor} size={48} opacity={0.2} />
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            {searchQuery ? t('noVendorsFound', language) : t('noVendorsYet', language)}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {filteredVendors.map(v => renderVendor(v))}
                    </View>
                )}
            </ScrollView>

            <FAB onPress={() => navigation.navigate('VendorForm')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    addButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    scrollContent: { paddingBottom: 100 },

    // Stats
    statsContainer: { marginBottom: 24 },
    statsScroll: { paddingHorizontal: 20, gap: 12 },
    statCard: {
        minWidth: 140,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    statLabel: { fontSize: 11, fontWeight: '500' },

    // Search & Filters
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginBottom: 16, gap: 12 },
    searchInput: { flex: 1, fontSize: 16 },

    filterScroll: { paddingHorizontal: 20, marginBottom: 16, gap: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    filterText: { fontSize: 13, fontWeight: '600' },

    listContainer: { paddingHorizontal: 20, gap: 12 },

    vendorCard: { padding: 16, borderRadius: 16 },
    vendorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    vendorInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    avatarContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    vendorName: { fontSize: 16, fontWeight: '700' },
    taxId: { fontSize: 12 },

    contactDetails: { flexDirection: 'row', gap: 12, marginLeft: 56 },
    contactItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    contactText: { fontSize: 12 },
    deleteButton: { padding: 4 },

    vendorFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    expenseRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    expenseLabel: { fontSize: 11, fontWeight: '600' },
    expenseValue: { fontSize: 16, fontWeight: '700' },

    actionRow: { flexDirection: 'row', gap: 8 },
    miniBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 16 },
    emptyText: { fontSize: 15, fontWeight: '500' },
});
