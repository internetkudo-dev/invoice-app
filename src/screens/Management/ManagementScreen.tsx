import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/common';
import {
    Users,
    Package,
    Building2,
    ChevronRight,
    TrendingUp,
    DollarSign,
    User,
    Briefcase,
    LayoutGrid,
    Settings
} from 'lucide-react-native';
import { t } from '../../i18n';
import { supabase } from '../../api/supabase';
import { formatCurrency } from '../../utils/format';

export function ManagementScreen({ navigation }: any) {
    const { isDark, language, primaryColor } = useTheme();
    const { user } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalClients: 0,
        totalProducts: 0,
        totalVendors: 0,
        totalRevenue: 0,
        inventoryValue: 0,
    });

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [user])
    );

    const fetchStats = async () => {
        if (!user) return;
        try {
            // Fetch clients count
            const { count: clientsCount } = await supabase
                .from('clients')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // Fetch products count and value
            const { data: products } = await supabase
                .from('products')
                .select('unit_price, stock_quantity')
                .eq('user_id', user.id);

            const inventoryValue = products?.reduce((sum, p) => sum + (Number(p.unit_price || 0) * Number(p.stock_quantity || 0)), 0) || 0;

            // Fetch vendors count
            const { count: vendorsCount } = await supabase
                .from('vendors')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // Fetch revenue from invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select('total_amount')
                .eq('user_id', user.id)
                .eq('status', 'paid');

            const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;

            setStats({
                totalClients: clientsCount || 0,
                totalProducts: products?.length || 0,
                totalVendors: vendorsCount || 0,
                totalRevenue,
                inventoryValue,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
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

    const renderCard = (
        title: string,
        description: string,
        icon: any,
        color: string,
        onPress: () => void,
        count?: number
    ) => {
        const Icon = icon;
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
            >
                <View style={[styles.actionCard, { backgroundColor: cardBg }]}>
                    <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
                        <Icon color={color} size={22} />
                    </View>
                    <View style={styles.actionInfo}>
                        <Text style={[styles.actionTitle, { color: textColor }]}>{title}</Text>
                        <Text style={[styles.actionSubtitle, { color: mutedColor }]}>{description}</Text>
                    </View>
                    {count !== undefined && (
                        <View style={[styles.badge, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                            <Text style={[styles.badgeText, { color: '#6366f1' }]}>{count}</Text>
                        </View>
                    )}
                    <ChevronRight color={mutedColor} size={18} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerSubtitle, { color: mutedColor }]}>{t('management', language)}</Text>
                    <Text style={[styles.title, { color: textColor }]}>Overview</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'SettingsMain' })} style={[styles.iconButton, { backgroundColor: cardBg }]}>
                        <Settings color={isDark ? '#fff' : '#1e293b'} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Dashboard */}
                <View style={styles.statsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                        {renderStatCard('Klientë', stats.totalClients, Users, '#6366f1')}
                        {renderStatCard('Produkte', stats.totalProducts, Package, '#8b5cf6')}
                        {renderStatCard('Furnizues', stats.totalVendors, Building2, '#ec4899')}
                        {renderStatCard('Të ardhura', formatCurrency(stats.totalRevenue), TrendingUp, '#10b981')}
                        {renderStatCard('Inventari', formatCurrency(stats.inventoryValue), DollarSign, '#f59e0b')}
                    </ScrollView>
                </View>

                {/* Management Cards */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Modules</Text>
                <View style={styles.section}>
                    {renderCard(
                        t('clients', language),
                        'Manage your client base',
                        Users,
                        '#6366f1',
                        () => navigation.navigate('ClientsList'),
                        stats.totalClients
                    )}
                    {renderCard(
                        t('products', language),
                        'Inventory and service catalog',
                        Package,
                        '#8b5cf6',
                        () => navigation.navigate('ProductsList'),
                        stats.totalProducts
                    )}
                    {renderCard(
                        t('vendors', language),
                        'Suppliers and partners',
                        Building2,
                        '#ec4899',
                        () => navigation.navigate('VendorsList'),
                        stats.totalVendors
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerSubtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },

    scrollContent: { paddingBottom: 16 },

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

    // Section
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        paddingHorizontal: 20
    },
    section: { gap: 12, paddingHorizontal: 20 },

    // Action Cards
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
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
    badgeText: { fontSize: 12, fontWeight: 'bold' },
});
