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
import { Trash2, Search, Users, DollarSign, TrendingUp, MapPin, Mail, Phone, FileText, Star, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, FAB, ScreenHeader } from '../../components/common';

import { Client } from '../../types';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';

interface ClientsScreenProps {
    navigation: any;
    showHeader?: boolean;
}

export function ClientsScreen({ navigation, showHeader = false }: ClientsScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'recent' | 'value'>('name');
    const [clientStats, setClientStats] = useState<{ [key: string]: number }>({});

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    // Derive cities for filtering
    const cities = ['Të gjitha', ...Array.from(new Set(clients.map(c => c.city).filter((c): c is string => !!c)))];

    // Stats calculation
    const stats = {
        totalClients: clients.length,
        totalRevenue: Object.values(clientStats).reduce((sum, val) => sum + val, 0),
        activeClients: clients.filter(c => clientStats[c.id] > 0).length,
        withDiscount: clients.filter(c => (c.discount_percent || 0) > 0).length,
    };

    useFocusEffect(
        useCallback(() => {
            fetchClients();
        }, [user])
    );

    const fetchClients = async () => {
        if (!user) return;
        try {
            const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).order('name');
            if (data) {
                setClients(data);
                applyFiltersAndSort(data, searchQuery, selectedFilter, sortBy);

                // Fetch revenue per client
                const { data: invoices } = await supabase
                    .from('invoices')
                    .select('client_id, total_amount')
                    .eq('user_id', user.id)
                    .eq('status', 'paid');

                if (invoices) {
                    const revenueMap: { [key: string]: number } = {};
                    invoices.forEach((inv: any) => {
                        if (inv.client_id) {
                            revenueMap[inv.client_id] = (revenueMap[inv.client_id] || 0) + Number(inv.total_amount || 0);
                        }
                    });
                    setClientStats(revenueMap);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const applyFiltersAndSort = (data: Client[], query: string, city: string | null, sort: string) => {
        let filtered = [...data];

        // Search
        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.phone?.includes(q) ||
                c.city?.toLowerCase().includes(q)
            );
        }

        // City filter
        if (city && city !== 'Të gjitha') {
            filtered = filtered.filter(c => c.city === city);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'value') return (clientStats[b.id] || 0) - (clientStats[a.id] || 0);
            return 0;
        });

        setFilteredClients(filtered);
    };

    useEffect(() => {
        applyFiltersAndSort(clients, searchQuery, selectedFilter, sortBy);
    }, [searchQuery, selectedFilter, sortBy, clients, clientStats]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchClients();
        setRefreshing(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert(t('delete', language), t('areYouSure', language) || 'Are you sure?', [
            { text: t('cancel', language), style: 'cancel' },
            {
                text: t('delete', language),
                style: 'destructive',
                onPress: async () => {
                    await supabase.from('clients').delete().eq('id', id);
                    fetchClients();
                },
            },
        ]);
    };

    const renderClient = (item: Client) => {
        const revenue = clientStats[item.id] || 0;
        const hasDiscount = (item.discount_percent || 0) > 0;
        const fullAddress = [item.address, item.city, item.country].filter(Boolean).join(', ');

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ClientForm', { clientId: item.id })}
            >
                <Card style={styles.clientCard}>
                    <View style={styles.clientHeader}>
                        <View style={styles.clientInfo}>
                            <View style={styles.nameRow}>
                                <Text style={[styles.clientName, { color: textColor }]}>{item.name}</Text>
                                {hasDiscount && (
                                    <View style={styles.discountBadge}>
                                        <Star color="#f59e0b" size={10} fill="#f59e0b" />
                                        <Text style={styles.discountText}>{item.discount_percent}%</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.contactRow}>
                                <Mail size={12} color={mutedColor} />
                                <Text style={[styles.contactText, { color: mutedColor }]}>{item.email || 'No email'}</Text>
                            </View>

                            {item.phone && (
                                <View style={styles.contactRow}>
                                    <Phone size={12} color={mutedColor} />
                                    <Text style={[styles.contactText, { color: mutedColor }]}>{item.phone}</Text>
                                </View>
                            )}

                            {fullAddress && (
                                <View style={styles.addressRow}>
                                    <MapPin size={12} color="#818cf8" />
                                    <Text style={[styles.addressText, { color: mutedColor }]} numberOfLines={1}>
                                        {fullAddress}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.clientActions}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('CustomerLedger', { clientId: item.id })}
                                style={styles.actionButton}
                            >
                                <FileText color={primaryColor} size={18} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
                                <Trash2 color="#ef4444" size={18} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.clientFooter}>
                        <View style={styles.revenueRow}>
                            <Text style={styles.revenueValue}>{formatCurrency(revenue)}</Text>
                            <Text style={[styles.revenueLabel, { color: mutedColor }]}>të ardhura</Text>
                        </View>
                        {item.city && (
                            <View style={styles.cityBadge}>
                                <MapPin color="#818cf8" size={10} />
                                <Text style={styles.cityText}>{item.city}</Text>
                            </View>
                        )}
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <ScreenHeader
                title={t('clients', language)}
                subtitle="Menaxhimi"
            />
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Client Stats HUD */}
                <View style={styles.statsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                        <Card style={styles.statCard}>
                            <Users color="#818cf8" size={20} />
                            <Text style={[styles.statValue, { color: textColor }]}>{stats.totalClients}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>{t('clients', language)}</Text>
                        </Card>
                        <Card style={styles.statCard}>
                            <DollarSign color="#10b981" size={20} />
                            <Text style={[styles.statValue, { color: textColor }]}>{formatCurrency(stats.totalRevenue)}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Të ardhura</Text>
                        </Card>
                        <Card style={styles.statCard}>
                            <TrendingUp color="#0ea5e9" size={20} />
                            <Text style={[styles.statValue, { color: textColor }]}>{stats.activeClients}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Aktivë</Text>
                        </Card>
                        <Card style={styles.statCard}>
                            <Star color="#f59e0b" size={20} />
                            <Text style={[styles.statValue, { color: textColor }]}>{stats.withDiscount}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Me zbritje</Text>
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
                                    ((selectedFilter === null && city === 'Të gjitha') || selectedFilter === city) && { backgroundColor: '#818cf8' }
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
                                        sortBy === s && { borderBottomColor: '#818cf8', borderBottomWidth: 2 }
                                    ]}
                                >
                                    <Text style={[
                                        styles.sortBtnText,
                                        { color: sortBy === s ? '#818cf8' : mutedColor }
                                    ]}>{s === 'name' ? 'EMRI' : 'VLERA'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {filteredClients.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Users color={mutedColor} size={48} opacity={0.2} />
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            {searchQuery ? 'Asnjë klient nuk u gjet' : 'Asnjë klient ende'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.clientList}>
                        {filteredClients.map(c => renderClient(c))}
                    </View>
                )}
            </ScrollView>

            <FAB onPress={() => navigation.navigate('ClientForm')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 100, paddingHorizontal: 20 },
    statsContainer: { paddingVertical: 16 },
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
    clientList: { paddingHorizontal: 20 },
    clientCard: { marginBottom: 12, padding: 16 },
    clientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    clientInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
    clientName: { fontSize: 16, fontWeight: '700' },
    discountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    discountText: { color: '#f59e0b', fontSize: 10, fontWeight: '700' },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    contactText: { fontSize: 12 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: 'rgba(129, 140, 248, 0.05)', padding: 6, borderRadius: 8 },
    addressText: { fontSize: 11, flex: 1 },
    clientActions: { flexDirection: 'row', gap: 4 },
    actionButton: { padding: 8 },
    clientFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    revenueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    revenueValue: { color: '#10b981', fontSize: 18, fontWeight: '800' },
    revenueLabel: { fontSize: 11, fontWeight: '600' },
    cityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(129, 140, 248, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    cityText: { color: '#818cf8', fontSize: 10, fontWeight: '700' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 16 },
    emptyText: { fontSize: 14, fontWeight: '500' },
});
