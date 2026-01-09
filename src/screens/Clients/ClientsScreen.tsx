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
import { Card, FAB } from '../../components/common';

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
    const inputBg = isDark ? '#1e293b' : '#ffffff';

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
                <View style={[styles.clientCard, { backgroundColor: cardBg }]}>
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
                            <Text style={[styles.revenueValue, { color: primaryColor }]}>{formatCurrency(revenue)}</Text>
                            <Text style={[styles.revenueLabel, { color: mutedColor }]}>të ardhura</Text>
                        </View>
                        {item.city && (
                            <View style={[styles.cityBadge, { backgroundColor: `${primaryColor}15` }]}>
                                <MapPin color={primaryColor} size={10} />
                                <Text style={[styles.cityText, { color: primaryColor }]}>{item.city}</Text>
                            </View>
                        )}
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
                    <Text style={[styles.title, { color: textColor }]}>{t('clients', language)}</Text>
                </View>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => navigation.navigate('ClientForm')}>
                    <Users color={primaryColor} size={20} />
                </TouchableOpacity>
            </View>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Stats */}
                <View style={styles.statsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                        {renderStatCard(t('clients', language), stats.totalClients, Users, '#818cf8')}
                        {renderStatCard('Të ardhura', formatCurrency(stats.totalRevenue), DollarSign, '#10b981')}
                        {renderStatCard('Aktivë', stats.activeClients, TrendingUp, '#0ea5e9')}
                    </ScrollView>
                </View>

                {/* Filters & Search */}
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

                    <View style={styles.sortContainer}>
                        <Text style={[styles.tinyLabel, { color: mutedColor }]}>RENDIT SIPAS:</Text>
                        <View style={styles.sortButtons}>
                            {(['name', 'value'] as const).map(s => (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => setSortBy(s)}
                                    style={[
                                        styles.sortBtn,
                                        sortBy === s && { borderBottomColor: primaryColor, borderBottomWidth: 2 }
                                    ]}
                                >
                                    <Text style={[
                                        styles.sortBtnText,
                                        { color: sortBy === s ? primaryColor : mutedColor }
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

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

    // Search & Filter
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginBottom: 16, gap: 12 },
    searchInput: { flex: 1, fontSize: 16 },

    filterScroll: { gap: 8, marginBottom: 16, paddingHorizontal: 20 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    filterText: { fontSize: 13, fontWeight: '600' },

    sortContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 20 },
    tinyLabel: { fontSize: 11, fontWeight: '700', opacity: 0.7 },
    sortButtons: { flexDirection: 'row', gap: 16 },
    sortBtn: { paddingVertical: 4 },
    sortBtnText: { fontSize: 12, fontWeight: '700' },

    // List
    clientList: { paddingHorizontal: 20, gap: 12 },
    clientCard: { padding: 16, borderRadius: 16 },
    clientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    clientInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
    clientName: { fontSize: 16, fontWeight: '700' },
    discountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    discountText: { color: '#f59e0b', fontSize: 10, fontWeight: '700' },

    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    contactText: { fontSize: 13 },

    clientActions: { flexDirection: 'row', gap: 4 },
    actionButton: { padding: 8 },

    clientFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
    revenueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    revenueValue: { fontSize: 16, fontWeight: '800' },
    revenueLabel: { fontSize: 11, fontWeight: '600' },
    cityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    cityText: { fontSize: 10, fontWeight: '700' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 16 },
    emptyText: { fontSize: 14, fontWeight: '500' },
});
