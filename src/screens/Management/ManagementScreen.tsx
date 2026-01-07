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
    Briefcase
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
            const { data: profileData } = await supabase.from('profiles').select('company_id, active_company_id').eq('id', user.id).single();
            const companyId = profileData?.active_company_id || profileData?.company_id || user.id;

            // Fetch clients count
            const { count: clientsCount } = await supabase
                .from('clients')
                .select('id', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            // Fetch products count and value
            const { data: products } = await supabase
                .from('products')
                .select('price, stock')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            const inventoryValue = products?.reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.stock || 0)), 0) || 0;

            // Fetch vendors count
            const { count: vendorsCount } = await supabase
                .from('vendors')
                .select('id', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            // Fetch revenue from invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select('total')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('status', 'paid');

            const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;

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
            <Card style={[styles.statCard, { backgroundColor: cardBg }]}>
                <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
                    <Icon color={color} size={20} />
                </View>
                <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: mutedColor }]}>{title}</Text>
            </Card>
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
                activeOpacity={0.85}
                onPress={onPress}
                style={styles.cardWrapper}
            >
                <Card style={[styles.card, { backgroundColor: cardBg, borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
                    <View style={styles.cardContent}>
                        <View style={[styles.leftAccent, { backgroundColor: color }]} />
                        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                            <Icon color={color} size={24} />
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
                            <Text style={[styles.cardDescription, { color: mutedColor }]}>{description}</Text>
                        </View>
                        <View style={styles.cardRight}>
                            {count !== undefined && (
                                <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
                                    <Text style={[styles.badgeText, { color }]}>{count}</Text>
                                </View>
                            )}
                            <ChevronRight color={mutedColor} size={18} />
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerSubtitle, { color: mutedColor }]}>Menaxhimi</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('management', language)}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.profileButton, { backgroundColor: cardBg, marginRight: 8 }]}>
                        <Briefcase color={primaryColor} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.profileButton, { backgroundColor: cardBg }]}>
                        <User color={primaryColor} size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
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
                <Text style={[styles.sectionTitle, { color: textColor }]}>Menaxho</Text>
                <View style={styles.section}>
                    {renderCard(
                        t('clients', language),
                        'Menaxho bazën e klientëve',
                        Users,
                        '#6366f1',
                        () => navigation.navigate('ClientsList'),
                        stats.totalClients
                    )}
                    {renderCard(
                        t('products', language),
                        'Inventari dhe katalogu i shërbimeve',
                        Package,
                        '#8b5cf6',
                        () => navigation.navigate('ProductsList'),
                        stats.totalProducts
                    )}
                    {renderCard(
                        t('vendors', language),
                        'Furnizuesit dhe partnerët',
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    profileButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    headerSubtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    scrollContent: { paddingBottom: 16 },
    statsContainer: { marginBottom: 20 },
    statsScroll: { paddingHorizontal: 16, gap: 12 },
    statCard: {
        width: 130,
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
    statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        paddingHorizontal: 16
    },
    section: { gap: 12, paddingHorizontal: 16 },
    cardWrapper: { marginBottom: 0 },
    card: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 0,
        overflow: 'hidden',
        borderWidth: 1,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    leftAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: { flex: 1, gap: 4 },
    cardTitle: { fontSize: 16, fontWeight: '600' },
    cardDescription: { fontSize: 13 },
    cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    badgeText: { fontSize: 13, fontWeight: '700' },
});
