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
    FileText,
    Truck,
    Receipt,
    ShoppingCart,
    FileCheck,
    Tag,
    ArrowDownCircle,
    ArrowUpCircle,
    Plus,
    ChevronRight,
    Wallet,
    Scale,
    FileSignature,
    Handshake,
    ShieldCheck,
    BookOpen,
    Calendar,
    BarChart3,
    TrendingUp,
} from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { Profile } from '../../types';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';

const { width } = Dimensions.get('window');

interface DocumentType {
    key: string;
    labelKey: string;
    pluralKey: string;
    icon: any;
    color: string;
    type: string;
    subtype?: string;
    description?: string;
}

// Tab 1: Financat documents
const financeDocuments: DocumentType[] = [
    { key: 'deliveryNote', labelKey: 'deliveryNote', pluralKey: 'deliveryNotes', icon: Truck, color: '#3b82f6', type: 'invoice', subtype: 'delivery_note', description: 'Goods delivery without payment' },
    { key: 'regularInvoice', labelKey: 'regularInvoice', pluralKey: 'regularInvoices', icon: Receipt, color: '#6366f1', type: 'invoice', subtype: 'regular', description: 'Standard payment invoice' },
    { key: 'order', labelKey: 'order', pluralKey: 'orders', icon: ShoppingCart, color: '#8b5cf6', type: 'offer', subtype: 'order', description: 'Customer purchase order' },
    { key: 'proInvoice', labelKey: 'proInvoice', pluralKey: 'proInvoices', icon: FileCheck, color: '#a855f7', type: 'offer', subtype: 'pro_invoice', description: 'Preliminary invoice' },
    { key: 'offer', labelKey: 'offer', pluralKey: 'offers', icon: Tag, color: '#ec4899', type: 'offer', subtype: 'offer', description: 'Price quotation' },
    { key: 'incomePayment', labelKey: 'incomePayment', pluralKey: 'incomePayments', icon: ArrowDownCircle, color: '#10b981', type: 'payment', subtype: 'income', description: 'Record payment received' },
    { key: 'expense', labelKey: 'expense', pluralKey: 'expenses', icon: ArrowUpCircle, color: '#ef4444', type: 'expense', subtype: 'expense', description: 'Track business expenses' },
];

// Tab 2: Legal documents
const legalDocuments: DocumentType[] = [
    { key: 'employmentContract', labelKey: 'employmentContract', pluralKey: 'employmentContracts', icon: FileSignature, color: '#0891b2', type: 'contract', subtype: 'employment', description: 'Hire employees' },
    { key: 'collaborationContract', labelKey: 'collaborationContract', pluralKey: 'collaborationContracts', icon: Handshake, color: '#0d9488', type: 'contract', subtype: 'collaboration', description: 'Business partnerships' },
    { key: 'nda', labelKey: 'nda', pluralKey: 'ndas', icon: ShieldCheck, color: '#7c3aed', type: 'contract', subtype: 'nda', description: 'Confidentiality agreement' },
];

// Tab 3: Reports
const reportDocuments: DocumentType[] = [
    { key: 'salesBook', labelKey: 'salesBook', pluralKey: 'salesBooks', icon: BookOpen, color: '#f59e0b', type: 'report', subtype: 'sales_book', description: 'Sales ledger' },
    { key: 'dailyReport', labelKey: 'dailyReport', pluralKey: 'dailyReports', icon: Calendar, color: '#06b6d4', type: 'report', subtype: 'daily', description: 'Daily summary' },
];

type TabType = 'finances' | 'legal' | 'reports';

export function FaturatScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [activeTab, setActiveTab] = useState<TabType>('finances');
    const [stats, setStats] = useState({
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
    });

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    const tabs: { key: TabType; labelKey: string; icon: any; color: string }[] = [
        { key: 'finances', labelKey: 'finances', icon: Wallet, color: '#6366f1' },
        { key: 'legal', labelKey: 'legal', icon: Scale, color: '#0891b2' },
        { key: 'reports', labelKey: 'reports', icon: BarChart3, color: '#f59e0b' },
    ];

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
            const companyId = profileData.active_company_id || profileData.company_id || user.id;

            // Fetch invoice counts by subtype
            const newCounts: Record<string, number> = {};

            // Regular invoices
            const { count: regularCount } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('type', 'invoice')
                .eq('subtype', 'regular');
            newCounts['regularInvoice'] = regularCount || 0;

            // Delivery notes
            const { count: deliveryCount } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('type', 'invoice')
                .eq('subtype', 'delivery_note');
            newCounts['deliveryNote'] = deliveryCount || 0;

            // All invoices for stats
            const { data: allInvoices } = await supabase
                .from('invoices')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('type', 'invoice');

            const totalAmount = allInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
            const paidAmount = allInvoices?.filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;

            setStats({
                totalInvoices: allInvoices?.length || 0,
                totalAmount,
                paidAmount,
                pendingAmount: totalAmount - paidAmount,
            });

            // Offers
            const { count: offerCount } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('type', 'offer')
                .eq('subtype', 'offer');
            newCounts['offer'] = offerCount || 0;

            // Orders
            const { count: orderCount } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('type', 'offer')
                .eq('subtype', 'order');
            newCounts['order'] = orderCount || 0;

            // Pro invoices
            const { count: proCount } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('type', 'offer')
                .eq('subtype', 'pro_invoice');
            newCounts['proInvoice'] = proCount || 0;

            // Expenses
            const { count: expenseCount } = await supabase
                .from('expenses')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);
            newCounts['expense'] = expenseCount || 0;

            // Contracts
            const { data: allContracts } = await supabase
                .from('contracts')
                .select('type')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

            if (allContracts) {
                newCounts['employmentContract'] = allContracts.filter(c => c.type === 'employment').length;
                newCounts['collaborationContract'] = allContracts.filter(c => c.type === 'service_agreement' || c.type === 'collaboration').length;
                newCounts['nda'] = allContracts.filter(c => c.type === 'nda').length;
            }

            setCounts(newCounts);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleCreateNew = (docType: DocumentType) => {
        if (docType.type === 'expense') {
            navigation.getParent()?.navigate('ExpensesTab', { screen: 'ExpenseForm' });
        } else if (docType.type === 'invoice' || docType.type === 'offer') {
            navigation.navigate('InvoiceForm', {
                type: docType.type,
                subtype: docType.subtype,
                documentKey: docType.key,
            });
        } else if (docType.type === 'contract') {
            navigation.navigate('ContractForm', { subtype: docType.subtype });
        } else if (docType.type === 'payment') {
            navigation.getParent()?.navigate('ExpensesTab', { screen: 'ExpensesList', params: { type: 'income' } });
        } else if (docType.type === 'report') {
            navigation.navigate('ReportPreview', { subtype: docType.subtype });
        }
    };

    const handleViewAll = (docType: DocumentType) => {
        if (docType.type === 'expense') {
            navigation.getParent()?.navigate('ExpensesTab', { screen: 'ExpensesList', params: { type: 'expense' } });
        } else if (docType.type === 'invoice') {
            navigation.navigate('InvoicesList', { tab: 'invoice', subtype: docType.subtype });
        } else if (docType.type === 'offer') {
            navigation.navigate('InvoicesList', { tab: 'offer', subtype: docType.subtype });
        } else if (docType.type === 'contract') {
            navigation.navigate('InvoicesList', { tab: 'contract', subtype: docType.subtype });
        } else if (docType.type === 'report') {
            navigation.navigate('ReportPreview', { subtype: docType.subtype });
        } else if (docType.type === 'payment') {
            navigation.getParent()?.navigate('ExpensesTab', { screen: 'ExpensesList', params: { type: 'income' } });
        }
    };

    const renderDocumentCard = (docType: DocumentType) => {
        const Icon = docType.icon;
        const count = counts[docType.key] || 0;
        const label = t(docType.labelKey as any, language);

        return (
            <TouchableOpacity
                key={docType.key}
                activeOpacity={0.85}
                onPress={() => handleCreateNew(docType)}
                style={styles.cardWrapper}
            >
                <Card style={styles.documentCard}>
                    {/* Color accent bar */}
                    <View style={[styles.cardAccent, { backgroundColor: docType.color }]} />

                    <View style={styles.cardContent}>
                        {/* Icon */}
                        <View style={[styles.iconContainer, { backgroundColor: `${docType.color}15` }]}>
                            <Icon color={docType.color} size={28} />
                        </View>

                        {/* Info */}
                        <View style={styles.cardInfo}>
                            <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>
                                {label}
                            </Text>
                            {docType.description && (
                                <Text style={[styles.cardDescription, { color: mutedColor }]} numberOfLines={1}>
                                    {docType.description}
                                </Text>
                            )}
                        </View>

                        {/* Count Badge & Arrow */}
                        <View style={styles.cardRight}>
                            {count > 0 && (
                                <View style={[styles.countBadge, { backgroundColor: `${docType.color}20` }]}>
                                    <Text style={[styles.countText, { color: docType.color }]}>{count}</Text>
                                </View>
                            )}
                            <ChevronRight color={mutedColor} size={20} />
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={[styles.quickActionBtn, { backgroundColor: docType.color }]}
                            onPress={() => handleCreateNew(docType)}
                        >
                            <Plus color="#fff" size={14} />
                            <Text style={styles.quickActionText}>{t('createNew', language)}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionBtn, styles.quickActionOutline, { borderColor: `${docType.color}40` }]}
                            onPress={() => handleViewAll(docType)}
                        >
                            <Text style={[styles.quickActionText, { color: docType.color }]}>
                                {t('viewAllItems', language)}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    const renderFinancesTab = () => (
        <>
            {/* Stats Summary */}
            <View style={styles.statsRow}>
                <Card style={[styles.statCard, { borderTopColor: '#6366f1', borderTopWidth: 3 }]}>
                    <TrendingUp color="#6366f1" size={18} />
                    <Text style={[styles.statValue, { color: textColor }]}>{formatCurrency(stats.totalAmount)}</Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Total</Text>
                </Card>
                <Card style={[styles.statCard, { borderTopColor: '#10b981', borderTopWidth: 3 }]}>
                    <ArrowDownCircle color="#10b981" size={18} />
                    <Text style={[styles.statValue, { color: '#10b981' }]}>{formatCurrency(stats.paidAmount)}</Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Paid</Text>
                </Card>
                <Card style={[styles.statCard, { borderTopColor: '#f59e0b', borderTopWidth: 3 }]}>
                    <ArrowUpCircle color="#f59e0b" size={18} />
                    <Text style={[styles.statValue, { color: '#f59e0b' }]}>{formatCurrency(stats.pendingAmount)}</Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Pending</Text>
                </Card>
            </View>

            {/* Invoices Section */}
            <View style={styles.sectionHeader}>
                <Receipt color="#6366f1" size={18} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>{t('invoices', language)}</Text>
            </View>
            {financeDocuments.slice(0, 2).map(doc => renderDocumentCard(doc))}

            {/* Offers Section */}
            <View style={styles.sectionHeader}>
                <Tag color="#ec4899" size={18} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>{t('offers', language)}</Text>
            </View>
            {financeDocuments.slice(2, 5).map(doc => renderDocumentCard(doc))}

            {/* Payments Section */}
            <View style={styles.sectionHeader}>
                <Wallet color="#10b981" size={18} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>{`${t('incomePayments', language)} & ${t('expenses', language)}`}</Text>
            </View>
            {financeDocuments.slice(5, 7).map(doc => renderDocumentCard(doc))}
        </>
    );

    const renderLegalTab = () => (
        <>
            <View style={styles.sectionHeader}>
                <FileSignature color="#0891b2" size={18} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>{t('contracts', language)}</Text>
            </View>
            {legalDocuments.map(doc => renderDocumentCard(doc))}
        </>
    );

    const renderReportsTab = () => (
        <>
            <View style={styles.sectionHeader}>
                <BarChart3 color="#f59e0b" size={18} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>{t('reports', language)}</Text>
            </View>
            {reportDocuments.map(doc => renderDocumentCard(doc))}
        </>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>{t('invoices', language)}</Text>
            </View>

            {/* Tab Bar */}
            <View style={[styles.tabBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const Icon = tab.icon;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tabItem,
                                isActive && { borderBottomColor: tab.color, borderBottomWidth: 3 }
                            ]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Icon color={isActive ? tab.color : mutedColor} size={20} />
                            <Text style={[
                                styles.tabLabel,
                                { color: isActive ? tab.color : mutedColor }
                            ]}>
                                {t(tab.labelKey as any, language)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} />}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'finances' && renderFinancesTab()}
                {activeTab === 'legal' && renderLegalTab()}
                {activeTab === 'reports' && renderReportsTab()}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
    },
    title: { fontSize: 28, fontWeight: 'bold' },

    // Tab bar
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    tabLabel: { fontSize: 13, fontWeight: '600' },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingTop: 8 },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        gap: 6,
    },
    statValue: { fontSize: 14, fontWeight: 'bold' },
    statLabel: { fontSize: 10 },

    // Section headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700' },

    // Document cards
    cardWrapper: { marginBottom: 12 },
    documentCard: {
        padding: 0,
        overflow: 'hidden',
        borderRadius: 16,
    },
    cardAccent: {
        height: 4,
        width: '100%',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 12,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    cardDescription: { fontSize: 12 },
    cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countText: { fontSize: 13, fontWeight: 'bold' },

    // Quick actions
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 14,
        gap: 10,
    },
    quickActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    quickActionOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    quickActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
