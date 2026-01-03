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
    params?: any;
}

// Products section items
const productActions: ActionItem[] = [
    { key: 'productsDashboard', labelKey: 'productsDashboard', icon: LayoutDashboard, color: '#6366f1', action: 'dashboard' },
    { key: 'addProduct', labelKey: 'addProduct', icon: Plus, color: '#10b981', action: 'add' },
    { key: 'inventory', labelKey: 'inventory', icon: Archive, color: '#f59e0b', action: 'inventory' },
];

// Clients section items
const clientActions: ActionItem[] = [
    { key: 'clientsDashboard', labelKey: 'clientsDashboard', icon: LayoutDashboard, color: '#8b5cf6', action: 'dashboard' },
    { key: 'addCustomer', labelKey: 'addCustomer', icon: UserPlus, color: '#10b981', action: 'add' },
    { key: 'customerCard', labelKey: 'customerCard', icon: CreditCard, color: '#ec4899', action: 'card' },
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
                <Card style={[styles.actionCard, { borderLeftColor: item.color, borderLeftWidth: 4 }]}>
                    <View style={styles.actionCardContent}>
                        <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                            <Icon color={item.color} size={24} />
                        </View>
                        <View style={styles.actionCardInfo}>
                            <Text style={[styles.actionCardTitle, { color: textColor }]}>{label}</Text>
                            {count !== undefined && (
                                <Text style={[styles.actionCardCount, { color: mutedColor }]}>
                                    {count} {count === 1 ? 'item' : 'items'}
                                </Text>
                            )}
                        </View>
                        <ChevronRight color={mutedColor} size={20} />
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
                    <Text style={[styles.title, { color: textColor }]}>{t('management', language)}</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: `${primaryColor}15` }]}>
                    <Briefcase color={primaryColor} size={24} />
                </View>
            </View>

            {/* Stats Summary */}
            <View style={styles.statsRow}>
                <Card style={[styles.statCard, { flex: 1 }]}>
                    <View style={styles.statContent}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#6366f115' }]}>
                            <Package color="#6366f1" size={20} />
                        </View>
                        <View>
                            <Text style={[styles.statValue, { color: textColor }]}>{stats.productCount}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>{t('products', language)}</Text>
                        </View>
                    </View>
                </Card>
                <Card style={[styles.statCard, { flex: 1 }]}>
                    <View style={styles.statContent}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#8b5cf615' }]}>
                            <Users color="#8b5cf6" size={20} />
                        </View>
                        <View>
                            <Text style={[styles.statValue, { color: textColor }]}>{stats.clientCount}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>{t('clients', language)}</Text>
                        </View>
                    </View>
                </Card>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Products Section */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Package color="#6366f1" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('products', language)}</Text>
                    </View>
                    <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>
                        {stats.productCount} {t('products', language).toLowerCase()}
                    </Text>
                </View>
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
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Users color="#8b5cf6" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>{t('clients', language)}</Text>
                    </View>
                    <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>
                        {stats.clientCount} {t('clients', language).toLowerCase()}
                    </Text>
                </View>
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
        paddingBottom: 16
    },
    title: { fontSize: 28, fontWeight: 'bold' },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },

    // Stats row
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 8,
    },
    statCard: {
        padding: 16,
    },
    statContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
    },

    scroll: { flex: 1 },
    scrollContent: { padding: 16 },

    // Section headers
    sectionHeader: {
        marginTop: 8,
        marginBottom: 12,
        paddingHorizontal: 4
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700'
    },
    sectionSubtitle: {
        fontSize: 13,
        marginLeft: 28,
    },

    // Grid
    grid: {
        gap: 12,
        marginBottom: 16,
    },

    // Action card styles
    actionCard: {
        padding: 16,
        borderRadius: 16,
    },
    actionCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionCardInfo: { flex: 1 },
    actionCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2
    },
    actionCardCount: {
        fontSize: 13
    },
});
