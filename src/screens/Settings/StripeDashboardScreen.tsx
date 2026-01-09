import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { ArrowLeft, Briefcase, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Users, Package, FileText, BarChart2, QrCode, AlertTriangle, Calendar, Clock, Receipt, ScanLine, User, Settings, ChevronRight, ShoppingCart, Info, X, DollarSign, TrendingDown, RefreshCcw, CreditCard, ArrowDownLeft } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button } from '../../components/common';
import { formatCurrency } from '../../utils/format';
import { stripeService, StripeTransaction, StripePayout } from '../../services/stripeService';

export function StripeDashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor } = useTheme();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [summary, setSummary] = useState({
        totalSales: 0,
        totalPayouts: 0,
        totalFees: 0,
        totalNet: 0,
        pendingPayouts: 0,
        recentTransactions: [] as StripeTransaction[],
        recentPayouts: [] as StripePayout[],
    });

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    // Modal states
    const [selectedTransaction, setSelectedTransaction] = useState<StripeTransaction | null>(null);
    const [selectedPayout, setSelectedPayout] = useState<StripePayout | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user])
    );

    const loadData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Get profile with Stripe credentials
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileData) {
                setProfile(profileData);

                // Check if connected via OAuth OR Developer Mode (API key)
                if (profileData.stripe_access_token || profileData.stripe_api_key) {
                    // Get dashboard data from local DB
                    const companyId = profileData.active_company_id || profileData.company_id;
                    const dashboardData = await stripeService.getDashboardSummary(user.id, companyId);
                    setSummary(dashboardData);
                }
            }
        } catch (error) {
            console.error('Error loading Stripe data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (force: boolean = false) => {
        // Check if connected via OAuth OR API Key
        const status = await stripeService.checkConnectionStatus(user!.id);
        if (!status.connected) {
            Alert.alert('Not Connected', 'Please connect your Stripe account first in Payment Integrations.');
            return;
        }

        setSyncing(true);
        try {
            let result;
            if (status.method === 'apikey') {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('stripe_api_key, active_company_id, company_id')
                    .eq('id', user!.id)
                    .single();

                if (!profileData?.stripe_api_key) throw new Error('API key not found');

                const companyId = profileData.active_company_id || profileData.company_id;
                result = await stripeService.syncDirectWithApiKey(user!.id, profileData.stripe_api_key, companyId, force);
            } else {
                result = await stripeService.syncViaEdgeFunction();
            }

            Alert.alert(
                force ? 'Deep Sync Complete' : 'Sync Complete',
                `Synced ${result.transactionsCount} transactions and ${result.payoutsCount} payouts.`
            );

            // Reload data
            await loadData();
        } catch (error: any) {
            Alert.alert('Sync Failed', error.message || 'Could not sync with Stripe');
        } finally {
            setSyncing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Payout to income conversion
    const handleRecordIncome = (payout: StripePayout) => {
        setSelectedPayout(null);
        // Navigate to payment form for "Pagese Hyrese"
        navigation.navigate('MainTabs', {
            screen: 'InvoicesTab',
            params: {
                screen: 'PaymentForm',
                params: {
                    prefillData: {
                        amount: payout.amount,
                        notes: `Stripe Payout: ${payout.stripe_id}`,
                        payment_method: 'bank',
                        stripeTransactionId: payout.stripe_id,
                    }
                }
            }
        });
    };



    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'charge':
            case 'payment':
                return <ArrowDownRight color="#10b981" size={18} />;
            case 'refund':
                return <ArrowUpRight color="#ef4444" size={18} />;
            case 'payout':
                return <Wallet color="#6366f1" size={18} />;
            default:
                return <DollarSign color={mutedColor} size={18} />;
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: bgColor }]}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    if (!profile?.stripe_access_token && !profile?.stripe_api_key) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: cardBg }]}>
                        <ArrowLeft color={textColor} size={20} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: textColor }]}>Stripe Dashboard</Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={[styles.centered, { flex: 1 }]}>
                    <CreditCard color={mutedColor} size={64} />
                    <Text style={[styles.emptyTitle, { color: textColor }]}>Stripe Not Connected</Text>
                    <Text style={[styles.emptyText, { color: mutedColor }]}>
                        Connect your Stripe account to view sales and payouts.
                    </Text>
                    <Button
                        title="Connect Stripe"
                        onPress={() => navigation.navigate('PaymentIntegrations')}
                        style={{ marginTop: 20 }}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: cardBg }]}>
                    <ArrowLeft color={textColor} size={20} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.title, { color: textColor }]}>Stripe Dashboard</Text>
                    {profile.stripe_account_id && (
                        <Text style={[styles.subtitle, { color: mutedColor }]}>{profile.stripe_account_id}</Text>
                    )}
                </View>
                <TouchableOpacity
                    onPress={() => handleSync(false)}
                    onLongPress={() => {
                        Alert.alert(
                            'Deep Sync',
                            'This will re-fetch and update the last 300 transactions to ensure all information (emails, descriptions) is up to date. Continue?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Sync All', onPress: () => handleSync(true) }
                            ]
                        );
                    }}
                    style={[styles.syncButton, { backgroundColor: primaryColor }]}
                    disabled={syncing}
                >
                    {syncing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <RefreshCcw color="#fff" size={18} />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
            >
                {/* Main Net Volume Card */}
                <Card style={[styles.mainNetCard, { backgroundColor: primaryColor }]}>
                    <View style={styles.mainNetHeader}>
                        <TrendingUp color="#fff" size={20} />
                        <Text style={styles.mainNetLabel}>Net Volume</Text>
                    </View>
                    <Text style={styles.mainNetValue}>{formatCurrency(summary.totalNet)}</Text>
                    <Text style={styles.mainNetSublabel}>Sales minus fees and refunds</Text>
                </Card>

                {/* Summary Grid 1 */}
                <View style={styles.summaryGrid}>
                    <Card style={[styles.summaryCard, { backgroundColor: '#10b981' }]}>
                        <DollarSign color="#fff" size={20} />
                        <Text style={styles.summaryValue}>{formatCurrency(summary.totalSales)}</Text>
                        <Text style={styles.summaryLabel}>Gross Sales</Text>
                    </Card>
                    <Card style={[styles.summaryCard, { backgroundColor: '#6366f1' }]}>
                        <Wallet color="#fff" size={20} />
                        <Text style={styles.summaryValue}>{formatCurrency(summary.totalPayouts)}</Text>
                        <Text style={styles.summaryLabel}>Received</Text>
                    </Card>
                </View>

                {/* Summary Grid 2 */}
                <View style={styles.summaryGrid}>
                    <Card style={[styles.summaryCard, { backgroundColor: '#ef4444' }]}>
                        <TrendingDown color="#fff" size={20} />
                        <Text style={styles.summaryValue}>{formatCurrency(summary.totalFees)}</Text>
                        <Text style={styles.summaryLabel}>Stripe Fees</Text>
                    </Card>
                    <Card style={[styles.summaryCard, { backgroundColor: '#f59e0b' }]}>
                        <Clock color="#fff" size={20} />
                        <Text style={styles.summaryValue}>{formatCurrency(summary.pendingPayouts)}</Text>
                        <Text style={styles.summaryLabel}>On the way</Text>
                    </Card>
                </View>

                {/* Last Synced */}
                {profile.stripe_last_synced && (
                    <Text style={[styles.lastSynced, { color: mutedColor }]}>
                        Last synced: {formatDate(profile.stripe_last_synced)}
                    </Text>
                )}

                {/* Recent Transactions */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Transactions</Text>
                {summary.recentTransactions.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <Text style={{ color: mutedColor, textAlign: 'center' }}>
                            No transactions yet. Sync to fetch.
                        </Text>
                    </Card>
                ) : (
                    summary.recentTransactions.slice(0, 20).map((tx, index) => (
                        <TouchableOpacity
                            key={tx.stripe_id || index}
                            onPress={() => setSelectedTransaction(tx)}
                            activeOpacity={tx.type === 'refund' || tx.type === 'payout' ? 1 : 0.7}
                        >
                            <Card style={styles.transactionCard}>
                                <View style={styles.transactionRow}>
                                    <View style={[styles.iconCircle, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                                        {getTransactionIcon(tx.type)}
                                    </View>
                                    <View style={styles.transactionInfo}>
                                        <Text style={[styles.transactionType, { color: textColor }]}>
                                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                        </Text>
                                        <Text style={[styles.transactionDesc, { color: mutedColor }]} numberOfLines={1}>
                                            {tx.description || tx.customer_email || tx.stripe_id}
                                        </Text>
                                    </View>
                                    <View style={styles.transactionAmounts}>
                                        <Text style={[
                                            styles.transactionAmount,
                                            { color: tx.type === 'refund' ? '#ef4444' : '#10b981' }
                                        ]}>
                                            {tx.type === 'refund' ? '-' : '+'}{formatCurrency(tx.amount)}
                                        </Text>
                                        {(tx.fee || 0) > 0 && (
                                            <Text style={[styles.transactionFee, { color: mutedColor }]}>
                                                Fee: {formatCurrency(tx.fee || 0)}
                                            </Text>
                                        )}
                                        <Text style={[styles.transactionDate, { color: mutedColor }]}>
                                            {formatDate(tx.created_at)}
                                        </Text>
                                    </View>
                                </View>

                            </Card>
                        </TouchableOpacity>
                    ))
                )}

                {/* Recent Payouts */}
                <Text style={[styles.sectionTitle, { color: textColor, marginTop: 24 }]}>Recent Payouts</Text>
                {summary.recentPayouts.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <Text style={{ color: mutedColor, textAlign: 'center' }}>
                            No payouts yet.
                        </Text>
                    </Card>
                ) : (
                    summary.recentPayouts.map((payout, index) => (
                        <TouchableOpacity
                            key={payout.stripe_id || index}
                            onPress={() => setSelectedPayout(payout)}
                            activeOpacity={0.7}
                        >
                            <Card style={styles.transactionCard}>
                                <View style={styles.transactionRow}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#6366f120' }]}>
                                        <Wallet color="#6366f1" size={18} />
                                    </View>
                                    <View style={styles.transactionInfo}>
                                        <Text style={[styles.transactionType, { color: textColor }]}>
                                            Bank Transfer
                                        </Text>
                                        <View style={[styles.statusBadge, {
                                            backgroundColor: payout.status === 'paid' ? '#10b98120' : '#f59e0b20'
                                        }]}>
                                            <Text style={{
                                                fontSize: 10,
                                                fontWeight: '600',
                                                color: payout.status === 'paid' ? '#10b981' : '#f59e0b',
                                            }}>
                                                {payout.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.transactionAmounts}>
                                        <Text style={[styles.transactionAmount, { color: '#6366f1' }]}>
                                            {formatCurrency(payout.amount)}
                                        </Text>
                                        <Text style={[styles.transactionDate, { color: mutedColor }]}>
                                            {formatDate(payout.arrival_date)}
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Transaction Detail Modal */}
            <Modal
                visible={!!selectedTransaction}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedTransaction(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Transaction Details</Text>
                            <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                                <X color={mutedColor} size={24} />
                            </TouchableOpacity>
                        </View>

                        {selectedTransaction && (
                            <ScrollView style={styles.modalBody}>
                                <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Type</Text>
                                    <Text style={[styles.modalValue, { color: textColor }]}>
                                        {selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1)}
                                    </Text>
                                </View>
                                <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Amount</Text>
                                    <Text style={[styles.modalValue, { color: '#10b981', fontWeight: 'bold', fontSize: 18 }]}>
                                        {formatCurrency(selectedTransaction.amount)}
                                    </Text>
                                </View>
                                {selectedTransaction.fee !== undefined && selectedTransaction.fee > 0 && (
                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Stripe Fee</Text>
                                        <Text style={[styles.modalValue, { color: '#ef4444' }]}>
                                            -{formatCurrency(selectedTransaction.fee)}
                                        </Text>
                                    </View>
                                )}
                                {selectedTransaction.net !== undefined && (
                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Net Amount</Text>
                                        <Text style={[styles.modalValue, { color: textColor, fontWeight: '600' }]}>
                                            {formatCurrency(selectedTransaction.net)}
                                        </Text>
                                    </View>
                                )}
                                {selectedTransaction.description && (
                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Description</Text>
                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                            {selectedTransaction.description}
                                        </Text>
                                    </View>
                                )}
                                {selectedTransaction.customer_email && (
                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Customer</Text>
                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                            {selectedTransaction.customer_email}
                                        </Text>
                                    </View>
                                )}
                                <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Date</Text>
                                    <Text style={[styles.modalValue, { color: textColor }]}>
                                        {formatDate(selectedTransaction.created_at)}
                                    </Text>
                                </View>
                                <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Status</Text>
                                    <Text style={[styles.modalValue, { color: '#10b981' }]}>
                                        {selectedTransaction.status || 'Completed'}
                                    </Text>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Stripe ID</Text>
                                    <Text style={[styles.modalValue, { color: mutedColor, fontSize: 11 }]}>
                                        {selectedTransaction.stripe_id}
                                    </Text>
                                </View>

                                {selectedTransaction.payment_details && (() => {
                                    const pd = selectedTransaction.payment_details;

                                    // Robust data extraction across different Stripe versions/objects
                                    // pd could be a Charge object or a PaymentIntent-based structure
                                    const pm = pd.payment_method_details || {};
                                    const pm_object = typeof pd.payment_method === 'object' ? pd.payment_method : null;

                                    const card = pd.card ||
                                        pm.card ||
                                        pm_object?.card ||
                                        (pd.source?.object === 'card' ? pd.source : null);

                                    const billing = pd.billing_details ||
                                        pm_object?.billing_details ||
                                        pd.source?.owner ||
                                        {};

                                    const countryMap: Record<string, string> = {
                                        'XK': 'Kosovo',
                                        'SR': 'Suriname',
                                        'US': 'United States',
                                        'GB': 'United Kingdom',
                                        'AL': 'Albania',
                                        'DE': 'Germany',
                                        'FR': 'France',
                                        'IT': 'Italy',
                                        // Add more as needed, or use a library
                                    };

                                    const getCountryName = (code: string) => {
                                        if (!code) return 'N/A';
                                        return countryMap[code.toUpperCase()] || code.toUpperCase();
                                    };

                                    return (
                                        <>
                                            <Text style={styles.modalSectionTitle}>Payment Method</Text>
                                            <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                <Text style={[styles.modalLabel, { color: mutedColor }]}>ID</Text>
                                                <Text style={[styles.modalValue, { color: textColor, fontSize: 11 }]}>
                                                    {pd.payment_method?.id || pd.payment_method || pd.id}
                                                </Text>
                                            </View>

                                            {card ? (
                                                <>
                                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Number</Text>
                                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                                            •••• {card.last4}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Fingerprint</Text>
                                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                                            {card.fingerprint || 'N/A'}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Expires</Text>
                                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                                            {card.exp_month} / {card.exp_year}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Type</Text>
                                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                                            {card.brand?.charAt(0).toUpperCase() + card.brand?.slice(1)} {card.funding || ''} card
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Issuer</Text>
                                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                                            {card.issuer || card.network?.toUpperCase() || card.brand?.toUpperCase() || 'N/A'}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Origin</Text>
                                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                                            {getCountryName(card.country)}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>CVC check</Text>
                                                        <Text style={[styles.modalValue, { color: '#10b981' }]}>
                                                            {card.checks?.cvc_check?.toUpperCase() || pd.cvc_check?.toUpperCase() || 'PASSED'}
                                                        </Text>
                                                    </View>
                                                </>
                                            ) : (
                                                <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Method Type</Text>
                                                    <Text style={[styles.modalValue, { color: textColor }]}>
                                                        {pd.object || 'Payment'}
                                                    </Text>
                                                </View>
                                            )}

                                            <Text style={styles.modalSectionTitle}>Owner Details</Text>
                                            <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                <Text style={[styles.modalLabel, { color: mutedColor }]}>Owner</Text>
                                                <Text style={[styles.modalValue, { color: textColor }]}>
                                                    {billing.name || 'N/A'}
                                                </Text>
                                            </View>
                                            <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                <Text style={[styles.modalLabel, { color: mutedColor }]}>Owner email</Text>
                                                <Text style={[styles.modalValue, { color: textColor }]}>
                                                    {billing.email || selectedTransaction.customer_email || 'N/A'}
                                                </Text>
                                            </View>
                                            <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                <Text style={[styles.modalLabel, { color: mutedColor }]}>Address</Text>
                                                <Text style={[styles.modalValue, { color: textColor }]}>
                                                    {getCountryName(billing.address?.country)}
                                                </Text>
                                            </View>
                                        </>
                                    );
                                })()}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Payout Detail Modal */}
            <Modal
                visible={!!selectedPayout}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedPayout(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Payout Details</Text>
                            <TouchableOpacity onPress={() => setSelectedPayout(null)}>
                                <X color={mutedColor} size={24} />
                            </TouchableOpacity>
                        </View>

                        {selectedPayout && (
                            <ScrollView style={styles.modalBody}>
                                <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Amount</Text>
                                    <Text style={[styles.modalValue, { color: '#6366f1', fontWeight: 'bold', fontSize: 18 }]}>
                                        {formatCurrency(selectedPayout.amount)}
                                    </Text>
                                </View>
                                <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Arrival Date</Text>
                                    <Text style={[styles.modalValue, { color: textColor }]}>
                                        {formatDate(selectedPayout.arrival_date)}
                                    </Text>
                                </View>
                                <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Status</Text>
                                    <Text style={[styles.modalValue, {
                                        color: selectedPayout.status === 'paid' ? '#10b981' : '#f59e0b'
                                    }]}>
                                        {selectedPayout.status.charAt(0).toUpperCase() + selectedPayout.status.slice(1)}
                                    </Text>
                                </View>
                                {selectedPayout.method && (
                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Method</Text>
                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                            {selectedPayout.method.toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                {selectedPayout.description && (
                                    <View style={[styles.modalDetailRow, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                        <Text style={[styles.modalLabel, { color: mutedColor }]}>Description</Text>
                                        <Text style={[styles.modalValue, { color: textColor }]}>
                                            {selectedPayout.description}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.modalDetailRow}>
                                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Stripe ID</Text>
                                    <Text style={[styles.modalValue, { color: mutedColor, fontSize: 11 }]}>
                                        {selectedPayout.stripe_id}
                                    </Text>
                                </View>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.modalActionButton, { backgroundColor: '#10b981' }]}
                                        onPress={() => handleRecordIncome(selectedPayout)}
                                    >
                                        <Receipt color="#fff" size={18} />
                                        <Text style={styles.modalActionButtonText}>Record as Income (Pagesë Hyrëse)</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { fontSize: 20, fontWeight: 'bold' },
    subtitle: { fontSize: 12, marginTop: 2 },
    syncButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },

    // Summary
    summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    summaryCard: {
        flex: 1,
        padding: 16,
        alignItems: 'flex-start',
        gap: 8,
    },
    summaryValue: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

    mainNetCard: {
        padding: 24,
        borderRadius: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    mainNetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    mainNetLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    mainNetValue: {
        fontSize: 36,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    mainNetSublabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },

    lastSynced: { fontSize: 12, textAlign: 'center', marginBottom: 20 },

    // Sections
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },

    // Transactions
    transactionCard: { padding: 14, marginBottom: 10 },
    transactionRow: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    transactionInfo: { flex: 1 },
    transactionType: { fontSize: 14, fontWeight: '600' },
    transactionDesc: { fontSize: 12, marginTop: 2 },
    transactionAmounts: { alignItems: 'flex-end' },
    transactionAmount: { fontSize: 15, fontWeight: 'bold' },
    transactionFee: { fontSize: 10, marginTop: 1 },
    transactionDate: { fontSize: 11, marginTop: 2 },

    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
        alignSelf: 'flex-start',
    },

    // Empty states
    emptyCard: { padding: 24 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
    emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, maxWidth: 280 },

    // Action buttons
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(100,100,100,0.1)'
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6
    },
    actionButtonText: { fontSize: 13, fontWeight: '600' },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(100,100,100,0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalBody: {
        padding: 20,
    },
    modalDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    modalLabel: {
        fontSize: 14,
    },
    modalValue: {
        fontSize: 14,
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
    },
    modalActions: {
        marginTop: 24,
        gap: 12,
    },
    modalActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
    },
    modalActionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: '#6366f1',
    },
});
