import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import {
    Users,
    Package,
    Receipt,
    Building2,
    Briefcase,
    Clock,
    Calendar,
    DollarSign,
    FileText,
    Shield,
    UserCheck,
    UserPlus,
    ChevronRight,
    LayoutGrid,
    FileLock
} from 'lucide-react-native';
import { t } from '../../i18n';

type ManagementTabType = 'operations' | 'hr' | 'time' | 'finance';

export function ManagementScreen({ navigation }: any) {
    const { isDark, primaryColor, language } = useTheme();
    const [activeTab, setActiveTab] = useState<ManagementTabType>('operations');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    const tabs: { key: ManagementTabType; label: string; icon: any; color: string }[] = [
        { key: 'operations', label: 'Operations', icon: LayoutGrid, color: '#6366f1' },
        { key: 'hr', label: 'Core HR', icon: Users, color: '#ec4899' },
        { key: 'time', label: 'Time', icon: Clock, color: '#f59e0b' },
        { key: 'finance', label: 'Finance', icon: DollarSign, color: '#10b981' },
    ];

    const renderCard = (
        title: string,
        description: string,
        icon: any,
        color: string,
        onPress: () => void,
        badge?: string
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
                            {badge && (
                                <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Text style={[styles.badgeText, { color: textColor }]}>{badge}</Text>
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
                <Text style={[styles.headerSubtitle, { color: mutedColor }]}>Management & HR</Text>
                <Text style={[styles.title, { color: textColor }]}>{t('management', language)}</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabBarContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        const Icon = tab.icon;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[
                                    styles.tabItem,
                                    isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }
                                ]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <Icon color={isActive ? tab.color : mutedColor} size={18} />
                                <Text
                                    style={[
                                        styles.tabLabel,
                                        { color: isActive ? textColor : mutedColor, fontWeight: isActive ? '700' : '500' }
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                                {isActive && <View style={[styles.tabIndicator, { backgroundColor: tab.color }]} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {activeTab === 'operations' && (
                    <View style={styles.section}>
                        {renderCard(
                            t('clients', language),
                            'Manage your customer database',
                            Users,
                            '#6366f1',
                            () => navigation.navigate('ClientsList'), // Changed to explicit navigation
                            'Active'
                        )}
                        {renderCard(
                            t('products', language),
                            'Inventory and service catalog',
                            Package,
                            '#8b5cf6',
                            () => navigation.navigate('ProductsList')
                        )}
                        {renderCard(
                            t('vendors', language),
                            'Suppliers and partners',
                            Building2,
                            '#ec4899',
                            () => navigation.navigate('VendorsList')
                        )}
                        {renderCard(
                            t('expenses', language),
                            'Track business expenses',
                            Receipt,
                            '#f43f5e',
                            () => navigation.navigate('ExpenseForm') // Or ExpensesList
                        )}
                    </View>
                )}

                {activeTab === 'hr' && (
                    <View style={styles.section}>
                        {renderCard(
                            'Employee Directory',
                            'Staff profiles and roles',
                            UserCheck,
                            '#0ea5e9',
                            () => navigation.navigate('EmployeeDirectory') // New Screen
                        )}
                        {renderCard(
                            'Digital Vault',
                            'Contracts and sensitive docs',
                            FileLock,
                            '#6366f1',
                            () => navigation.navigate('EmployeeVault') // New Screen
                        )}
                        {renderCard(
                            'Onboarding',
                            'New hire checklist',
                            UserPlus,
                            '#10b981',
                            () => { } // Placeholder
                        )}
                    </View>
                )}

                {activeTab === 'time' && (
                    <View style={styles.section}>
                        {renderCard(
                            'Attendance',
                            'Punch In/Out and logs',
                            Clock,
                            '#f59e0b',
                            () => navigation.navigate('Attendance') // New Screen
                        )}
                        {renderCard(
                            'Leave Requests',
                            'Vacation and sick leave',
                            Calendar,
                            '#f97316',
                            () => navigation.navigate('LeaveRequests') // New Screen
                        )}
                        {renderCard(
                            'Shift Schedule',
                            'Weekly rostering',
                            Briefcase,
                            '#8b5cf6',
                            () => navigation.navigate('Schedule') // New Screen
                        )}
                    </View>
                )}

                {activeTab === 'finance' && (
                    <View style={styles.section}>
                        {renderCard(
                            'Payroll Dashboard',
                            'Calculate monthly payouts',
                            DollarSign,
                            '#10b981',
                            () => navigation.navigate('Payroll') // New Screen
                        )}
                        {renderCard(
                            'Compliance',
                            'Contract expiries and tax',
                            Shield,
                            '#ef4444',
                            () => navigation.navigate('Compliance') // New Screen
                        )}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    headerSubtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    tabBarContainer: { paddingBottom: 10 },
    tabBar: { paddingHorizontal: 16, gap: 10, paddingBottom: 5 },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabLabel: { fontSize: 13 },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        width: 16,
        borderRadius: 2,
        left: '50%',
        marginLeft: -8,
    },
    scrollContent: { padding: 16 },
    section: { gap: 12 },
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
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '600' },
});
