import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    Package,
    Users,
    Plus,
    LayoutDashboard,
    Archive,
    UserPlus,
    CreditCard,
    ChevronRight,
    Briefcase,
    BarChart3,
} from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { Profile } from '../../types';
import { t } from '../../i18n';

const { width } = Dimensions.get('window');

interface ActionItem {
    key: string;
    labelKey: string;
    icon: any;
    color: string;
    action: string;
    description?: string; // Added description
    params?: any;
}

// Products section items
const productActions: ActionItem[] = [
    { key: 'productsDashboard', labelKey: 'productsDashboard', icon: LayoutDashboard, color: '#6366f1', action: 'dashboard', description: 'View and manage inventory' },
    { key: 'addProduct', labelKey: 'addProduct', icon: Plus, color: '#10b981', action: 'add', description: 'Add new item to stock' },
    { key: 'inventory', labelKey: 'inventory', icon: Archive, color: '#f59e0b', action: 'inventory', description: 'Check low stock items' },
];

// Clients section items
const clientActions: ActionItem[] = [
    { key: 'clientsDashboard', labelKey: 'clientsDashboard', icon: LayoutDashboard, color: '#8b5cf6', action: 'dashboard', description: 'View client database' },
    { key: 'addCustomer', labelKey: 'addCustomer', icon: UserPlus, color: '#10b981', action: 'add', description: 'Register new client' },
    { key: 'customerCard', labelKey: 'customerCard', icon: CreditCard, color: '#ec4899', action: 'card', description: 'View client details' },
];

export function ManagementDashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        productCount: 0,
        clientCount: 0,
        lowStockCount: 0,
    });

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user])
    );

    const fetchData = async () => {
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
            setProfile(profileData);
            const companyId = profileData.company_id || user.id;

            // Fetch products count
            const { count: productCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            // Fetch clients count
            const { count: clientCount } = await supabase
                .from('clients')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            // Fetch low stock products
            const { data: products } = await supabase
                .from('products')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            const lowStockCount = products?.filter((p: any) =>
                p.track_stock && (p.stock_quantity || 0) <= (p.low_stock_threshold || 5)
            ).length || 0;

            setStats({
                productCount: productCount || 0,
                clientCount: clientCount || 0,
                lowStockCount,
            });
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleProductAction = (action: ActionItem) => {
        switch (action.action) {
            case 'dashboard':
                navigation.navigate('ManagementTabs', { activeTab: 'products' });
                break;
            case 'add':
                navigation.navigate('ProductForm');
                break;
            case 'inventory':
                navigation.navigate('ManagementTabs', { activeTab: 'products' });
                break;
        }
    };

    const handleClientAction = (action: ActionItem) => {
        switch (action.action) {
            case 'dashboard':
                navigation.navigate('ManagementTabs', { activeTab: 'clients' });
                break;
            case 'add':
                navigation.navigate('ClientForm');
                break;
            case 'card':
                navigation.navigate('ManagementTabs', { activeTab: 'clients' });
                break;
        }
    };

    const renderActionCard = (item: ActionItem, onPress: () => void, count?: number) => {
        const Icon = item.icon;
        const label = t(item.labelKey as any, language);

        return (
            <TouchableOpacity
                key={item.key}
                activeOpacity={0.8}
                onPress={onPress}
            >
                <View style={[styles.actionCard, { backgroundColor: cardBg }]}>
                    <View style={[styles.actionIcon, { backgroundColor: `${item.color}15` }]}>
                        <Icon color={item.color} size={22} />
                    </View>
                    <View style={styles.actionInfo}>
                        <Text style={[styles.actionTitle, { color: textColor }]}>{label}</Text>
                        <Text style={[styles.actionSubtitle, { color: mutedColor }]}>{item.description || 'Manage item'}</Text>
                    </View>
                    {count !== undefined && count > 0 && (
                        <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
                            <Text style={styles.badgeText}>{count}</Text>
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
                    <Text style={[styles.subtitle, { color: mutedColor }]}>Administration</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('management', language)}</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Row - Vertical Style */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: cardBg }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#6366f115' }]}>
                            <Package color="#6366f1" size={20} />
                        </View>
                        <Text style={[styles.statValue, { color: textColor }]}>{stats.productCount}</Text>
                        <Text style={[styles.statLabel, { color: mutedColor }]}>{t('products', language)}</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: cardBg }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#8b5cf615' }]}>
                            <Users color="#8b5cf6" size={20} />
                        </View>
                        <Text style={[styles.statValue, { color: textColor }]}>{stats.clientCount}</Text>
                        <Text style={[styles.statLabel, { color: mutedColor }]}>{t('clients', language)}</Text>
                    </View>
                </View>

                {/* Products Section */}
                <Text style={[styles.sectionTitle, { color: textColor, marginTop: 12, marginBottom: 12 }]}>
                    {t('products', language)}
                </Text>

                <View style={styles.grid}>
                    {productActions.map((action, index) =>
                        renderActionCard(
                            action,
                            () => handleProductAction(action),
                            action.action === 'inventory' ? stats.lowStockCount : undefined
                        )
                    )}
                </View>

                {/* Clients Section */}
                <Text style={[styles.sectionTitle, { color: textColor, marginTop: 24, marginBottom: 12 }]}>
                    {t('clients', language)}
                </Text>

                <View style={styles.grid}>
                    {clientActions.map((action, index) =>
                        renderActionCard(
                            action,
                            () => handleClientAction(action),
                            action.action === 'card' ? stats.clientCount : undefined
                        )
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 10,
    },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },

    scroll: { flex: 1 },
    scrollContent: { padding: 16 },

    // Stats row
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
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

    // Section headers
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

    // Grid
    grid: {
        gap: 10,
        marginBottom: 16,
    },

    // Action card styles
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
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
