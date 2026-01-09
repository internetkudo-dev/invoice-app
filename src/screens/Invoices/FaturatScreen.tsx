import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Alert,
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
    Users,
    Building2,
    Zap,
    History,
    Briefcase,
    User,
    Settings
} from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, StatusBadge } from '../../components/common';
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
    // Pre-sale documents
    { key: 'offer', labelKey: 'offer', pluralKey: 'offers', icon: Tag, color: '#ec4899', type: 'offer', subtype: 'offer', description: 'Not binding until accepted by client' },
    { key: 'order', labelKey: 'order', pluralKey: 'orders', icon: ShoppingCart, color: '#8b5cf6', type: 'offer', subtype: 'order', description: 'Confirms intent to buy - reserves stock' },
    { key: 'proInvoice', labelKey: 'proInvoice', pluralKey: 'proInvoices', icon: FileCheck, color: '#a855f7', type: 'proforma', subtype: 'pro_invoice', description: 'NON-FISCAL: Pre-payment draft invoice' },
    // Delivery & Fiscal
    { key: 'deliveryNote', labelKey: 'deliveryNote', pluralKey: 'deliveryNotes', icon: Truck, color: '#3b82f6', type: 'invoice', subtype: 'delivery_note', description: 'Dispatch document - customer signs on receipt' },
    { key: 'regularInvoice', labelKey: 'regularInvoice', pluralKey: 'regularInvoices', icon: Receipt, color: '#6366f1', type: 'fiscal_invoice', subtype: 'regular', description: 'FISCAL: Official tax invoice' },
    // Financial transactions
    { key: 'incomePayment', labelKey: 'incomePayment', pluralKey: 'incomePayments', icon: ArrowDownCircle, color: '#10b981', type: 'payment_receipt', subtype: 'income', description: 'Record payment received from client' },
    { key: 'expense', labelKey: 'expense', pluralKey: 'expenses', icon: ArrowUpCircle, color: '#ef4444', type: 'vendor_payment', subtype: 'expense', description: 'Record payment made to a vendor' },
    { key: 'supplier_bill', labelKey: 'supplierBill', pluralKey: 'supplierBills', icon: Building2, color: '#0ea5e9', type: 'supplier_bill', subtype: 'regular', description: 'Record bills received from suppliers' },
];

// Tab 2: Legal documents
const legalDocuments: DocumentType[] = [
    { key: 'employmentContract', labelKey: 'employmentContract', pluralKey: 'employmentContracts', icon: FileSignature, color: '#0891b2', type: 'contract', subtype: 'employment', description: 'Hire employees' },
    { key: 'collaborationContract', labelKey: 'collaborationContract', pluralKey: 'collaborationContracts', icon: Handshake, color: '#0d9488', type: 'contract', subtype: 'collaboration', description: 'Business partnerships' },
    { key: 'nda', labelKey: 'nda', pluralKey: 'ndas', icon: ShieldCheck, color: '#7c3aed', type: 'contract', subtype: 'nda', description: 'Confidentiality agreement' },
];

// Tab 3: Reports & Ledger Cards
const reportDocuments: DocumentType[] = [
    { key: 'salesBook', labelKey: 'salesBook', pluralKey: 'salesBooks', icon: BookOpen, color: '#f59e0b', type: 'report', subtype: 'sales_book', description: 'Sales ledger' },
    { key: 'dailyReport', labelKey: 'dailyReport', pluralKey: 'dailyReports', icon: Calendar, color: '#06b6d4', type: 'report', subtype: 'daily', description: 'Daily summary' },
    { key: 'customerCard', labelKey: 'customerCard', pluralKey: 'customerCards', icon: Users, color: '#8b5cf6', type: 'report', subtype: 'customer_ledger', description: 'Customer transaction history' },
    { key: 'supplierCard', labelKey: 'supplierCard', pluralKey: 'supplierCards', icon: Building2, color: '#0891b2', type: 'report', subtype: 'supplier_ledger', description: 'Supplier transaction history' },
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
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

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
        try {
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

                // Shpenzime (Vendor Payments)
                const { count: vendorPaymentsCount } = await supabase
                    .from('vendor_payments')
                    .select('*', { count: 'exact', head: true })
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);
                newCounts['expense'] = vendorPaymentsCount || 0;

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

                // Fetch Recent Activity
                const { data: recentInvoices } = await supabase
                    .from('invoices')
                    .select('id, invoice_number, status, total_amount, client:clients(name), items:invoice_items(id), type, subtype, created_at')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                    .order('created_at', { ascending: false })
                    .limit(10);

                const { data: recentPayments } = await supabase
                    .from('payments')
                    .select('id, amount, client:clients(name), type, created_at')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                    .order('created_at', { ascending: false })
                    .limit(10);

                const activities = [
                    ...(recentInvoices || []).map(i => ({ ...i, activityType: 'document' })),
                    ...(recentPayments || []).map(p => ({ ...p, activityType: 'payment', total_amount: p.amount })),
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 10);

                setRecentActivity(activities);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleCreateNew = (docType: DocumentType) => {
        if (docType.type === 'vendor_payment') {
            navigation.navigate('VendorPaymentForm');
        } else if (docType.type === 'fiscal_invoice') {
            navigation.navigate('InvoiceForm', {
                type: 'invoice',
                subtype: docType.subtype,
                documentKey: docType.key,
                forceTemplate: 'kosovo',
                forcePageSize: 'A4',
            });
        } else if (docType.type === 'proforma') {
            navigation.navigate('InvoiceForm', {
                type: 'offer',
                subtype: docType.subtype,
                documentKey: docType.key,
                forcePageSize: 'A4',
            });
        } else if (docType.type === 'invoice' || docType.type === 'offer') {
            navigation.navigate('InvoiceForm', { type: docType.type, subtype: docType.subtype, documentKey: docType.key });
        } else if (docType.type === 'contract') {
            navigation.navigate('ContractForm', { subtype: docType.subtype });
        } else if (docType.type === 'payment_receipt') {
            navigation.navigate('PaymentForm');
        } else if (docType.type === 'report') {
            navigation.navigate('ReportPreview', { subtype: docType.subtype });
        } else if (docType.subtype === 'customer_ledger') {
            navigation.navigate('CustomerLedger');
        } else if (docType.subtype === 'supplier_ledger') {
            navigation.navigate('VendorLedger');
        } else if (docType.type === 'supplier_bill') {
            navigation.navigate('SupplierBillForm');
        }
    };

    const handleViewAll = (docType: DocumentType) => {
        if (docType.type === 'vendor_payment') {
            navigation.navigate('VendorPaymentsList');
        } else if (docType.type === 'invoice' || docType.type === 'fiscal_invoice') {
            navigation.navigate('InvoicesList', { tab: 'invoice', subtype: docType.subtype });
        } else if (docType.type === 'offer' || docType.type === 'proforma') {
            navigation.navigate('InvoicesList', { tab: 'offer', subtype: docType.subtype });
        } else if (docType.type === 'contract') {
            navigation.navigate('InvoicesList', { tab: 'contract', subtype: docType.subtype });
        } else if (docType.type === 'report' && docType.subtype !== 'customer_ledger' && docType.subtype !== 'supplier_ledger') {
            navigation.navigate('ReportPreview', { subtype: docType.subtype });
        } else if (docType.subtype === 'customer_ledger') {
            navigation.navigate('CustomerLedger');
        } else if (docType.subtype === 'supplier_ledger') {
            navigation.navigate('VendorLedger');
        } else if (docType.type === 'supplier_bill') {
            navigation.navigate('SupplierBillsList');
        } else if (docType.type === 'payment_receipt') {
            navigation.navigate('PaymentsList');
        }
    };

    const renderDocumentCard = (docType: DocumentType) => {
        const Icon = docType.icon;
        const count = counts[docType.key] || 0;
        const label = t(docType.labelKey as any, language);
        const isReport = docType.type === 'report';

        return (
            <TouchableOpacity
                key={docType.key}
                activeOpacity={0.8}
                onPress={() => isReport ? handleViewAll(docType) : handleCreateNew(docType)}
            >
                <View style={[styles.actionCard, { backgroundColor: cardBg }]}>
                    <View style={[styles.actionIcon, { backgroundColor: `${docType.color}15` }]}>
                        <Icon color={docType.color} size={22} />
                    </View>
                    <View style={styles.actionInfo}>
                        <Text style={[styles.actionTitle, { color: textColor }]}>{label}</Text>
                        <Text style={[styles.actionSubtitle, { color: mutedColor }]}>
                            {docType.description || 'View details'}
                        </Text>
                    </View>
                    {count > 0 && (
                        <View style={[styles.badge, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                            <Text style={[styles.badgeText, { color: '#6366f1' }]}>{count}</Text>
                        </View>
                    )}
                    <ChevronRight color={mutedColor} size={18} />
                </View>
            </TouchableOpacity>
        );
    };

    const renderStatCard = (title: string, value: string | number, icon: any, color: string) => {
        const Icon = icon;
        return (
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
                <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                    <Icon color={color} size={20} />
                </View>
                <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: mutedColor }]}>{title}</Text>
            </View>
        );
    };

    const renderFinancesTab = () => (
        <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
                {renderStatCard('Total Sales', formatCurrency(stats.totalAmount), TrendingUp, '#6366f1')}
                {renderStatCard('Received', formatCurrency(stats.paidAmount), ArrowDownCircle, '#10b981')}
                {renderStatCard('Outstanding', formatCurrency(stats.pendingAmount), ArrowUpCircle, '#ef4444')}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContainer}>
                    <TouchableOpacity
                        style={[styles.quickActionCard, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => navigation.navigate('InvoiceForm', { type: 'invoice', subtype: 'regular' })}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#10b98115' }]}>
                            <Plus color="#10b981" size={18} />
                        </View>
                        <Text style={[styles.quickActionLabel, { color: textColor }]}>{t('newInvoice', language)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickActionCard, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => navigation.navigate('PaymentForm')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b15' }]}>
                            <Zap color="#f59e0b" size={18} />
                        </View>
                        <Text style={[styles.quickActionLabel, { color: textColor }]}>{t('quickPay', language)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickActionCard, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => navigation.navigate('VendorForm')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#0ea5e915' }]}>
                            <Building2 color="#0ea5e9" size={18} />
                        </View>
                        <Text style={[styles.quickActionLabel, { color: textColor }]}>{t('newVendor', language)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickActionCard, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => navigation.navigate('ManagementTab', { screen: 'ClientForm' })}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf615' }]}>
                            <Users color="#8b5cf6" size={18} />
                        </View>
                        <Text style={[styles.quickActionLabel, { color: textColor }]}>{t('newClient', language)}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Invoices */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>{t('invoices', language)}</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
                {financeDocuments.slice(3, 5).map(doc => renderDocumentCard(doc))}
            </View>

            {/* Offers */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>{t('offers', language)}</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
                {financeDocuments.slice(0, 3).map(doc => renderDocumentCard(doc))}
            </View>

            {/* Payments */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>{`${t('incomePayments', language)} & ${t('expenses', language)}`}</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
                {financeDocuments.slice(5, 7).map(doc => renderDocumentCard(doc))}
            </View>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
                <>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>{t('recentActivity', language)}</Text>
                    <Card style={styles.recentCard}>
                        {recentActivity.map((activity, index) => (
                            <TouchableOpacity
                                key={activity.id}
                                style={[
                                    styles.invoiceItem,
                                    { borderBottomColor: borderColor },
                                    index === recentActivity.length - 1 && { borderBottomWidth: 0 }
                                ]}
                                onPress={() => {
                                    if (activity.activityType === 'document') {
                                        navigation.navigate('InvoicesTab', { screen: 'InvoiceDetail', params: { invoiceId: activity.id } });
                                    } else {
                                        // For payments, maybe navigate to payment detail if available, or just nothing for now
                                        // navigation.navigate('PaymentDetail', { id: activity.id });
                                    }
                                }}
                            >
                                <View style={styles.invoiceInfo}>
                                    <Text style={[styles.invoiceNumber, { color: textColor }]}>
                                        {activity.activityType === 'document' ? (activity.invoice_number || t('draft', language)) : t('payment', language)}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={[styles.clientName, { color: mutedColor }]}>
                                            {activity.client?.name || t('unknownClient', language)}
                                        </Text>
                                        {activity.activityType === 'document' && (
                                            <Text style={[styles.clientName, { color: mutedColor, fontSize: 11 }]}>
                                                • {activity.items?.length || 0} {t('items', language).toLowerCase()}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.invoiceRight}>
                                    <Text style={[styles.invoiceAmount, { color: textColor }]}>
                                        {formatCurrency(activity.total_amount)}
                                    </Text>
                                    {activity.activityType === 'document' && activity.status ? (
                                        <StatusBadge status={activity.status} />
                                    ) : (
                                        <StatusBadge status="paid" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </Card>
                </>
            )}
        </>
    );

    const renderLegalTab = () => (
        <>
            <Text style={[styles.sectionTitle, { color: textColor, marginTop: 16 }]}>{t('contracts', language)}</Text>
            <View style={{ gap: 10 }}>
                {legalDocuments.map(doc => renderDocumentCard(doc))}
            </View>
        </>
    );

    const renderReportsTab = () => (
        <>
            <Text style={[styles.sectionTitle, { color: textColor, marginTop: 16 }]}>{t('reports', language)}</Text>
            <View style={{ gap: 10 }}>
                {reportDocuments.map(doc => renderDocumentCard(doc))}
            </View>
        </>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{new Date().toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('invoices', language)}</Text>
                </View>
                <View style={styles.headerActions}>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'SettingsMain' })} style={[styles.iconButton, { backgroundColor: cardBg }]}>
                            <Settings color={isDark ? '#fff' : '#1e293b'} size={24} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Modern Tab Bar */}
            <View style={styles.tabsWrapper}>
                <View style={[styles.tabBar, { backgroundColor: cardBg, borderColor }]}>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        const Icon = tab.icon;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[
                                    styles.tabItem,
                                    isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }
                                ]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <Icon color={isActive ? tab.color : mutedColor} size={18} />
                                <Text style={[
                                    styles.tabLabel,
                                    { color: isActive ? textColor : mutedColor, fontWeight: isActive ? '700' : '500' }
                                ]}>
                                    {t(tab.labelKey as any, language)}
                                </Text>
                                {isActive && <View style={[styles.tabIndicator, { backgroundColor: tab.color }]} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 10,
    },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2, textTransform: 'capitalize' },
    title: { fontSize: 28, fontWeight: '800' },
    headerActions: { flexDirection: 'row' },
    iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    // Tabs
    tabsWrapper: { paddingHorizontal: 20, marginBottom: 16 },
    tabBar: { flexDirection: 'row', borderRadius: 16, padding: 4, borderWidth: 1 },
    tabItem: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 6 },
    tabLabel: { fontSize: 13 },
    tabIndicator: { position: 'absolute', bottom: 6, width: 16, height: 3, borderRadius: 2 },

    scroll: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 0 },

    // Stats Grid
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
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
    statValue: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    statLabel: { fontSize: 11, textAlign: 'center' },

    // Action Cards
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        gap: 14,
        marginBottom: 0
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

    // Section headers
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

    // Quick Actions
    quickActionsSection: { marginBottom: 20 },
    quickActionsContainer: { gap: 12 },
    quickActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    quickActionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    quickActionLabel: { fontSize: 13, fontWeight: '600' },

    // Recent Activity (Matching Dashboard)
    recentCard: { padding: 8, borderRadius: 16, marginBottom: 16 },
    invoiceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
    invoiceInfo: { flex: 1 },
    invoiceNumber: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    clientName: { fontSize: 13 },
    invoiceRight: { alignItems: 'flex-end' },
    invoiceAmount: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    emptyText: { textAlign: 'center', padding: 20, opacity: 0.5 },
});
