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
    ActivityIndicator,
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
    Sparkles,
    ScanLine,
    User,
    Briefcase
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
// Document flow: Ofertë → Porosi → Profaturë → Fletëdërgesë → Faturë e Rregullt → Pagesë/Shpenzim
const financeDocuments: DocumentType[] = [
    // Pre-sale documents (non-fiscal)
    { key: 'offer', labelKey: 'offer', pluralKey: 'offers', icon: Tag, color: '#ec4899', type: 'offer', subtype: 'offer', description: 'Not binding until accepted by client' },
    { key: 'order', labelKey: 'order', pluralKey: 'orders', icon: ShoppingCart, color: '#8b5cf6', type: 'offer', subtype: 'order', description: 'Confirms intent to buy - reserves stock' },
    { key: 'proInvoice', labelKey: 'proInvoice', pluralKey: 'proInvoices', icon: FileCheck, color: '#a855f7', type: 'proforma', subtype: 'pro_invoice', description: 'NON-FISCAL: Pre-payment draft invoice' },
    // Delivery & Fiscal documents
    { key: 'deliveryNote', labelKey: 'deliveryNote', pluralKey: 'deliveryNotes', icon: Truck, color: '#3b82f6', type: 'invoice', subtype: 'delivery_note', description: 'Dispatch document - customer signs on receipt' },
    { key: 'regularInvoice', labelKey: 'regularInvoice', pluralKey: 'regularInvoices', icon: Receipt, color: '#6366f1', type: 'fiscal_invoice', subtype: 'regular', description: 'FISCAL: Official tax invoice for ATK/DPT' },
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
    { key: 'customerCard', labelKey: 'customerCard', pluralKey: 'customerCards', icon: Users, color: '#8b5cf6', type: 'report', subtype: 'customer_ledger', description: 'Customer transaction history & balance' },
    { key: 'supplierCard', labelKey: 'supplierCard', pluralKey: 'supplierCards', icon: Building2, color: '#0891b2', type: 'report', subtype: 'supplier_ledger', description: 'Supplier transaction history & debt' },
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
    const [analyzing, setAnalyzing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState<any | null>(null);

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

                // Fetch report preview data
                // Total Client Debt (Customer Ledger Preview)
                const { data: clientInvoices } = await supabase
                    .from('invoices')
                    .select('total_amount')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                    .eq('type', 'invoice');

                const { data: clientPayments } = await supabase
                    .from('payments')
                    .select('amount')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

                const totalClientDebt = (clientInvoices?.reduce((sum, i) => sum + Number(i.total_amount), 0) || 0) -
                    (clientPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0);

                newCounts['customerCard_preview'] = totalClientDebt;

                // Total Vendor Debt (Supplier Ledger Preview)
                const { data: vendorPayments } = await supabase
                    .from('vendor_payments')
                    .select('amount')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

                const { data: supplierBills } = await supabase
                    .from('supplier_bills')
                    .select('total_amount')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`);

                const totalVendorDebt = (supplierBills?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0) -
                    (vendorPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0);

                newCounts['supplierCard_preview'] = totalVendorDebt;
                newCounts['supplier_bill'] = supplierBills?.length || 0;

                // Daily Report Preview (Today's Sales)
                const todayStr = new Date().toISOString().split('T')[0];
                const { data: todayInvoices } = await supabase
                    .from('invoices')
                    .select('total_amount')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                    .eq('type', 'invoice')
                    .eq('issue_date', todayStr);

                const todayTotal = todayInvoices?.reduce((sum, i) => sum + Number(i.total_amount), 0) || 0;
                newCounts['dailyReport_preview'] = todayTotal;


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
                    .select('id, total_amount, client:clients(name), type, subtype, created_at')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                    .order('created_at', { ascending: false })
                    .limit(3);

                const { data: recentPayments } = await supabase
                    .from('payments')
                    .select('id, amount, client:clients(name), type, created_at')
                    .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                    .order('created_at', { ascending: false })
                    .limit(3);

                const activities = [
                    ...(recentInvoices || []).map(i => ({ ...i, activityType: 'document' })),
                    ...(recentPayments || []).map(p => ({ ...p, activityType: 'payment', total_amount: p.amount })),
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5);

                setRecentActivity(activities);

                // Trigger AI analysis in background if not already done
                if (!aiSummary && !analyzing) {
                    fetchAIInsights(false);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAIInsights = async (showAlert = true) => {
        setAnalyzing(true);
        try {
            const dataSummary = {
                totalInvoices: stats.totalInvoices,
                totalVendorDebt: counts['supplierCard_preview'] || 0,
                totalExpenses: counts['expense'] || 0,
                language: language
            };

            const { data, error } = await supabase.functions.invoke('ai-insights', {
                body: { dataSummary }
            });

            if (error) throw error;

            if (data) {
                if (data.error) throw new Error(data.error);
                setAiSummary(data);
                if (showAlert && data.insights) {
                    const message = data.insights.map((ins: any) => `• ${ins.title}: ${ins.description}`).join('\n\n');
                    Alert.alert(
                        `${t('aiInsights' as any, language)} - ${data.overallStatus}`,
                        `${data.predictedCashFlow}\n\n${message}`
                    );
                }
            }
        } catch (error: any) {
            console.error('AI error:', error);
            if (showAlert) {
                let errorMessage = 'Dështoi marrja e analizave AI.';

                if (error.context && typeof error.context.json === 'function') {
                    try {
                        const errorDetails = await error.context.json();
                        if (errorDetails.error) errorMessage = errorDetails.error;
                    } catch (e) { }
                } else if (error.message) {
                    errorMessage = error.message;
                }

                Alert.alert(t('error', language), errorMessage);
            }
        } finally {
            setAnalyzing(false);
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
            // Faturë e Rregullt - forced to Kosovo template and A4
            navigation.navigate('InvoiceForm', {
                type: 'invoice',
                subtype: docType.subtype,
                documentKey: docType.key,
                forceTemplate: 'kosovo',
                forcePageSize: 'A4',
            });
        } else if (docType.type === 'proforma') {
            // Profaturë - A4 only, non-fiscal
            navigation.navigate('InvoiceForm', {
                type: 'offer',
                subtype: docType.subtype,
                documentKey: docType.key,
                forcePageSize: 'A4',
            });
        } else if (docType.type === 'invoice' || docType.type === 'offer') {
            navigation.navigate('InvoiceForm', {
                type: docType.type,
                subtype: docType.subtype,
                documentKey: docType.key,
            });
        } else if (docType.type === 'contract') {
            navigation.navigate('ContractForm', { subtype: docType.subtype });
        } else if (docType.type === 'payment_receipt') {
            // Pagesë Hyrëse - navigate to PaymentForm
            navigation.navigate('PaymentForm');
        } else if (docType.type === 'report') {
            navigation.navigate('ReportPreview', { subtype: docType.subtype });
        } else if (docType.subtype === 'customer_ledger') {
            // Kartela e Blerësit - navigate to CustomerLedgerScreen
            navigation.navigate('CustomerLedger');
        } else if (docType.subtype === 'supplier_ledger') {
            // Kartela e Furnitorit - navigate to VendorLedgerScreen
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
            // Pagesë Hyrëse - navigate to PaymentsList
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
                activeOpacity={0.85}
                onPress={() => isReport ? handleViewAll(docType) : handleCreateNew(docType)}
                style={styles.cardWrapper}
            >
                <Card style={[styles.documentCard, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <View style={styles.cardContent}>
                        {/* Left Border Accent - Design Language Consistency */}
                        <View style={[styles.leftAccent, { backgroundColor: docType.color }]} />

                        {/* Icon */}
                        <View style={[styles.iconContainer, { backgroundColor: `${docType.color}10` }]}>
                            <Icon color={docType.color} size={24} />
                        </View>

                        {/* Info */}
                        <View style={styles.cardInfo}>
                            <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>
                                {label}
                            </Text>
                            {isReport && counts[`${docType.key}_preview`] !== undefined ? (
                                <Text style={[styles.cardPreview, { color: docType.color }]}>
                                    {formatCurrency(counts[`${docType.key}_preview`])}
                                </Text>
                            ) : (
                                docType.description && (
                                    <Text style={[styles.cardDescription, { color: mutedColor }]} numberOfLines={1}>
                                        {docType.description}
                                    </Text>
                                )
                            )}
                        </View>

                        {/* Count Badge & Arrow */}
                        <View style={styles.cardRight}>
                            {count > 0 && (
                                <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                    <Text style={[styles.countText, { color: textColor }]}>{count}</Text>
                                </View>
                            )}
                            <View style={[styles.arrowContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                                <ChevronRight color={mutedColor} size={16} />
                            </View>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    const renderFinancesTab = () => (
        <>
            {/* Stats Summary */}
            <View style={styles.statsRow}>
                <Card style={[styles.statCard, { borderBottomColor: '#6366f1', backgroundColor: cardBg }]}>
                    <TrendingUp color="#6366f1" size={16} />
                    <Text style={[styles.statValue, { color: textColor }]}>{formatCurrency(stats.totalAmount)}</Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Total Sales</Text>
                </Card>
                <Card style={[styles.statCard, { borderBottomColor: '#10b981', backgroundColor: cardBg }]}>
                    <ArrowDownCircle color="#10b981" size={16} />
                    <Text style={[styles.statValue, { color: '#10b981' }]}>{formatCurrency(stats.paidAmount)}</Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Received</Text>
                </Card>
                <Card style={[styles.statCard, { borderBottomColor: '#ef4444', backgroundColor: cardBg }]}>
                    <ArrowUpCircle color="#ef4444" size={16} />
                    <Text style={[styles.statValue, { color: '#ef4444' }]}>{formatCurrency(stats.pendingAmount)}</Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Outstanding</Text>
                </Card>
            </View>

            {/* Offers Section (Pre-sale documents: Ofertë, Porosi, Profaturë) */}
            <View style={styles.sectionHeader}>
                <Tag color="#ec4899" size={18} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>{t('offers', language)}</Text>
            </View>
            {financeDocuments.slice(0, 3).map(doc => renderDocumentCard(doc))}

            {/* Invoices Section (Delivery & Fiscal: Fletëdërgesë, Faturë e Rregullt) */}
            <View style={styles.sectionHeader}>
                <Receipt color="#6366f1" size={18} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>{t('invoices', language)}</Text>
            </View>
            {financeDocuments.slice(3, 5).map(doc => renderDocumentCard(doc))}

            {/* Payments Section */}
            <View style={styles.sectionHeader}>
                <Wallet color="#10b981" size={18} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>{`${t('incomePayments', language)} & ${t('expenses', language)}`}</Text>
            </View>
            {financeDocuments.slice(5, 7).map(doc => renderDocumentCard(doc))}

            {/* Recent Activity Section - NEW FEATURE */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <History color={primaryColor} size={18} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Aktiviteti i Fundit</Text>
            </View>
            <Card style={styles.activityCard}>
                {recentActivity.length === 0 ? (
                    <Text style={[styles.emptyText, { color: mutedColor }]}>Nuk ka aktivitet të fundit</Text>
                ) : (
                    recentActivity.map((activity, index) => (
                        <TouchableOpacity
                            key={activity.id}
                            style={[
                                styles.activityItem,
                                index !== recentActivity.length - 1 && { borderBottomColor: borderColor, borderBottomWidth: 1 }
                            ]}
                        >
                            <View style={[styles.activityIcon, { backgroundColor: activity.activityType === 'document' ? '#6366f115' : '#10b98115' }]}>
                                {activity.activityType === 'document' ? <FileText color="#6366f1" size={18} /> : <TrendingUp color="#10b981" size={18} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.activityTitle, { color: textColor }]}>
                                    {activity.activityType === 'document' ? activity.subtype : 'Pagesë Hyrëse'}
                                </Text>
                                <Text style={[styles.activitySubtitle, { color: mutedColor }]}>
                                    {activity.client?.name || 'Klient i panjohur'}
                                </Text>
                            </View>
                            <Text style={[styles.activityAmount, { color: textColor }]}>
                                {formatCurrency(activity.total_amount)}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}
            </Card>
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

            {/* AI Recommendation Card Removed */}
        </>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Premium Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerSubtitle, { color: mutedColor }]}>{new Date().toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('invoices', language)}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.profileButton, { backgroundColor: cardBg, marginRight: 8 }]}>
                        <Briefcase color={isDark ? '#fff' : '#1e293b'} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.profileButton, { backgroundColor: cardBg }]}>
                        <User color={isDark ? '#fff' : '#1e293b'} size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Quick Actions Horizontal Scroller - NEW FEATURE */}
            <View style={styles.quickActionsSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContainer}>
                    <TouchableOpacity
                        style={[styles.quickActionCard, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => navigation.navigate('InvoiceForm', { type: 'invoice', subtype: 'regular' })}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#10b981' + '15' }]}>
                            <Plus color="#10b981" size={18} />
                        </View>
                        <Text style={[styles.quickActionLabel, { color: textColor }]}>{t('newInvoice', language)}</Text>
                    </TouchableOpacity>
                    {/* Scan Bill Removed */}
                    <TouchableOpacity
                        style={[styles.quickActionCard, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => navigation.navigate('PaymentForm')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b' + '15' }]}>
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

            {/* Tab Bar - Modern Version */}
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
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    profileButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    headerSubtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    aiButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
    aiButtonText: { fontSize: 13, fontWeight: '700' },

    // Quick Actions
    quickActionsSection: { marginBottom: 20 },
    quickActionsContainer: { paddingHorizontal: 16, gap: 12 },
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

    // Tabs Wrapper
    tabsWrapper: { paddingHorizontal: 16, marginBottom: 16 },
    tabBar: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
    },
    tabItem: {
        flex: 1,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        gap: 6,
        position: 'relative',
    },
    tabLabel: { fontSize: 13 },
    tabIndicator: {
        position: 'absolute',
        bottom: 6,
        width: 16,
        height: 3,
        borderRadius: 2,
    },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16 },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 14,
        alignItems: 'flex-start',
        gap: 4,
        borderBottomWidth: 3,
        borderTopWidth: 0,
    },
    statValue: { fontSize: 15, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '500' },

    // Section headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

    // Document cards
    cardWrapper: { marginBottom: 12 },
    documentCard: {
        padding: 0,
        borderRadius: 18,
        borderWidth: 1,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    leftAccent: {
        position: 'absolute',
        left: 0,
        top: '25%',
        bottom: '25%',
        width: 4,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    cardPreview: { fontSize: 14, fontWeight: '800' },
    cardDescription: { fontSize: 12 },
    cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    countBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    countText: { fontSize: 12, fontWeight: '800' },
    arrowContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // AI Recommendation
    aiRecommendationCard: {
        marginTop: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderStyle: 'dashed',
        borderWidth: 2,
    },
    aiIconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    aiRecTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    aiRecText: { fontSize: 12, lineHeight: 18 },

    // Recent Activity
    activityCard: { padding: 0, borderRadius: 16, overflow: 'hidden' },
    activityItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    activityTitle: { fontSize: 13, fontWeight: '700' },
    activitySubtitle: { fontSize: 11 },
    activityAmount: { fontSize: 13, fontWeight: '800' },
    emptyText: { padding: 20, textAlign: 'center', fontSize: 12 },
});
