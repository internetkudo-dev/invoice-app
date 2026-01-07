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
import { Trash2, Search, Building2, DollarSign, TrendingDown, MapPin, Mail, Phone, FileText, Edit2, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, FAB, ScreenHeader } from '../../components/common';

import { Vendor } from '../../types';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';

interface VendorsScreenProps {
    navigation: any;
    showHeader?: boolean;
}

export function VendorsScreen({ navigation, showHeader = false }: VendorsScreenProps) {
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

    // Derive cities for filtering
    const cities = ['Të gjitha', ...Array.from(new Set(vendors.map(v => v.address?.split(',').pop()?.trim()).filter((c): c is string => !!c)))];

    // Stats calculation
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
            const { data: profileData } = await supabase.from('profiles').select('company_id, active_company_id').eq('id', user.id).single();
            const companyId = profileData?.active_company_id || profileData?.company_id || user.id;

            const { data } = await supabase
                .from('vendors')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .order('name');

            if (data) {
                setVendors(data);
                applyFiltersAndSort(data, searchQuery, selectedFilter, sortBy);

                // Fetch expenses per vendor
                const { data: expenses } = await supabase
                    .from('expenses')
                    .select('vendor_id, amount')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

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
            console.error(err);
        }
    };

    const applyFiltersAndSort = (data: Vendor[], query: string, city: string | null, sort: string) => {
        let filtered = [...data];

        // Search
        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = filtered.filter(v =>
                v.name.toLowerCase().includes(q) ||
                v.email?.toLowerCase().includes(q) ||
                v.phone?.includes(q) ||
                v.tax_id?.toLowerCase().includes(q)
            );
        }

        // City filter
        if (city && city !== 'Të gjitha') {
            filtered = filtered.filter(v => v.address?.includes(city));
        }

        // Sort
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

    const renderVendor = (item: Vendor) => {
        const expenses = vendorStats[item.id] || 0;

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('VendorLedger', { vendorId: item.id })}
            >
                <Card style={styles.vendorCard}>
                    <View style={styles.vendorHeader}>
                        <View style={styles.vendorInfo}>
                            <View style={styles.nameRow}>
                                <View style={[styles.avatarContainer, { backgroundColor: '#0891b220' }]}>
                                    <Building2 color="#0891b2" size={20} />
                                </View>
                                <Text style={[styles.vendorName, { color: textColor }]}>{item.name}</Text>
                            </View>

                            {item.tax_id && (
                                <Text style={[styles.taxId, { color: mutedColor }]}>NUI: {item.tax_id}</Text>
                            )}

                            <View style={styles.contactRow}>
                                {item.email && (
                                    <View style={styles.contactItem}>
                                        <Mail size={12} color={mutedColor} />
                                        <Text style={[styles.contactText, { color: mutedColor }]}>{item.email}</Text>
                                    </View>
                                )}
                            </View>

                            {item.phone && (
                                <View style={styles.contactItem}>
                                    <Phone size={12} color={mutedColor} />
                                    <Text style={[styles.contactText, { color: mutedColor }]}>{item.phone}</Text>
                                </View>
                            )}

                            {item.address && (
                                <View style={styles.addressRow}>
                                    <MapPin size={12} color="#0891b2" />
                                    <Text style={[styles.addressText, { color: mutedColor }]} numberOfLines={1}>
                                        {item.address}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.vendorActions}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('VendorForm', { vendorId: item.id })}
                                style={styles.actionButton}
                            >
                                <Edit2 color={primaryColor} size={18} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('VendorLedger', { vendorId: item.id })}
                                style={styles.actionButton}
                            >
                                <FileText color="#0ea5e9" size={18} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.actionButton}>
                                <Trash2 color="#ef4444" size={18} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.vendorFooter}>
                        <View style={styles.expenseRow}>
                            <Text style={styles.expenseValue}>{formatCurrency(expenses)}</Text>
                            <Text style={[styles.expenseLabel, { color: mutedColor }]}>shpenzime</Text>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <ScreenHeader
                title={t('vendors', language)}
                subtitle="Menaxhimi"
            />
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Vendor Stats HUD */}
                <View style={styles.statsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                        <Card style={styles.statCard}>
                            <Building2 color="#0891b2" size={20} />
                            <Text style={[styles.statValue, { color: textColor }]}>{stats.totalVendors}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>{t('vendors', language)}</Text>
                        </Card>
                        <Card style={styles.statCard}>
                            <DollarSign color="#ef4444" size={20} />
                            <Text style={[styles.statValue, { color: textColor }]}>{formatCurrency(stats.totalExpenses)}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Shpenzime</Text>
                        </Card>
                        <Card style={styles.statCard}>
                            <TrendingDown color="#f59e0b" size={20} />
                            <Text style={[styles.statValue, { color: textColor }]}>{stats.activeVendors}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Aktivë</Text>
                        </Card>
                        <Card style={styles.statCard}>
                            <FileText color="#8b5cf6" size={20} />
                            <Text style={[styles.statValue, { color: textColor }]}>{stats.withTaxId}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Me NUI</Text>
                        </Card>
                    </ScrollView>
                </View>

                {/* Filters & Search Header */}
                <View style={{ backgroundColor: bgColor }}>
                    <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
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
                                <X color={mutedColor} size={20} />
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
                                    ((selectedFilter === null && city === 'Të gjitha') || selectedFilter === city) && { backgroundColor: '#0891b2' }
                                ]}
                            >
                                <Text style={[
                                    styles.filterText,
                                    { color: ((selectedFilter === null && city === 'Të gjitha') || selectedFilter === city) ? '#fff' : mutedColor }
                                ]}>{city}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.sortContainer}>
                        <Text style={[styles.tinyLabel, { color: mutedColor }]}>RENDIT SIPAS:</Text>
                        <View style={styles.sortButtons}>
                            {(['name', 'value'] as const).map(s => (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => setSortBy(s)}
                                    style={[
                                        styles.sortBtn,
                                        sortBy === s && { borderBottomColor: '#0891b2', borderBottomWidth: 2 }
                                    ]}
                                >
                                    <Text style={[
                                        styles.sortBtnText,
                                        { color: sortBy === s ? '#0891b2' : mutedColor }
                                    ]}>{s === 'name' ? 'EMRI' : 'VLERA'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {filteredVendors.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Building2 color={mutedColor} size={48} opacity={0.2} />
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            {searchQuery ? 'Asnjë furnizues nuk u gjet' : 'Asnjë furnizues ende'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.vendorList}>
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
    scrollContent: { paddingBottom: 100, paddingHorizontal: 20 },
    statsContainer: { paddingVertical: 10 },
    statsScroll: { gap: 12 },
    statCard: { width: 140, padding: 16, alignItems: 'center', gap: 6 },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 16, gap: 12 },
    searchInput: { flex: 1, fontSize: 16 },
    filterScroll: { gap: 8, marginBottom: 16 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    filterText: { fontSize: 12, fontWeight: '600' },
    sortContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    tinyLabel: { fontSize: 10, fontWeight: 'bold' },
    sortButtons: { flexDirection: 'row', gap: 16 },
    sortBtn: { paddingVertical: 4 },
    sortBtnText: { fontSize: 10, fontWeight: 'bold' },
    vendorList: { paddingHorizontal: 20 },
    vendorCard: { marginBottom: 12, padding: 16 },
    vendorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    vendorInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    avatarContainer: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    vendorName: { fontSize: 16, fontWeight: '700' },
    taxId: { fontSize: 11, marginBottom: 6 },
    contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
    contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    contactText: { fontSize: 12 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: 'rgba(8, 145, 178, 0.05)', padding: 6, borderRadius: 8 },
    addressText: { fontSize: 11, flex: 1 },
    vendorActions: { flexDirection: 'row', gap: 4 },
    actionButton: { padding: 8 },
    vendorFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    expenseRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    expenseValue: { color: '#ef4444', fontSize: 18, fontWeight: '800' },
    expenseLabel: { fontSize: 11, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 16 },
    emptyText: { fontSize: 14, fontWeight: '500' },
});
