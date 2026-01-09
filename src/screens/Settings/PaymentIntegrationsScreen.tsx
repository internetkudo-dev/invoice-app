import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Linking,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Zap, CreditCard, RefreshCw, Check, X, ExternalLink, Clock, DollarSign } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, QuickAddModal } from '../../components/common';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';
import { stripeService } from '../../services/stripeService';

// Stripe logo SVG path
const StripeLogo = ({ color, size }: { color: string; size: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.6, fontWeight: 'bold', color }}>S</Text>
    </View>
);

// PayPal logo placeholder
const PayPalLogo = ({ color, size }: { color: string; size: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.6, fontWeight: 'bold', color }}>P</Text>
    </View>
);

interface PaymentConnection {
    id: string;
    provider: 'stripe' | 'paypal';
    connected: boolean;
    account_id?: string;
    account_email?: string;
    last_synced?: string;
    auto_sync: boolean;
    total_synced: number;
}

export function PaymentIntegrationsScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [connections, setConnections] = useState<PaymentConnection[]>([
        { id: '1', provider: 'stripe', connected: false, auto_sync: false, total_synced: 0 },
        { id: '2', provider: 'paypal', connected: false, auto_sync: false, total_synced: 0 },
    ]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [showConnectModal, setShowConnectModal] = useState<'stripe' | 'paypal' | null>(null);
    const [profile, setProfile] = useState<any>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        if (!user) return;

        try {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (profileData) {
                setProfile(profileData);
                setConnections(prev => prev.map(conn => {
                    const link = profileData[`payment_link_${conn.provider}`];
                    return link ? { ...conn, connected: true, account_email: link } : conn;
                }));
            }
        } catch (error) {
            console.log('Error fetching profile:', error);
        }
    };

    const handleConnect = async (provider: 'stripe' | 'paypal') => {
        if (provider === 'stripe') {
            // Show options: OAuth or Developer Mode (API key)
            if (!user) return;

            Alert.alert(
                'Connect Stripe',
                'Choose how to connect your Stripe account:',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'OAuth (Recommended)',
                        onPress: async () => {
                            try {
                                const result = await stripeService.initiateOAuth(user.id);

                                if (result.success) {
                                    const status = await stripeService.checkConnectionStatus(user.id);
                                    setConnections(prev => prev.map(conn =>
                                        conn.provider === 'stripe'
                                            ? { ...conn, connected: true, account_id: status.accountId }
                                            : conn
                                    ));
                                    Alert.alert('Success', 'Stripe account connected successfully!');
                                } else {
                                    Alert.alert('Connection Failed', result.error || 'Could not connect to Stripe');
                                }
                            } catch (error: any) {
                                Alert.alert('Error', error.message);
                            }
                        }
                    },
                    {
                        text: 'Developer Mode',
                        onPress: () => {
                            // Show API key input modal
                            setShowConnectModal('stripe');
                        }
                    }
                ]
            );
        } else {
            // PayPal uses link input
            setShowConnectModal(provider);
        }
    };

    const handleSaveLink = async (formData: any) => {
        if (!user || !showConnectModal) return;

        try {
            if (showConnectModal === 'stripe') {
                // Developer Mode: Connect with API key
                const apiKey = formData.link;
                const result = await stripeService.connectWithApiKey(user.id, apiKey);

                if (!result.success) {
                    Alert.alert('Invalid API Key', result.error || 'Could not validate the API key.');
                    return;
                }

                setConnections(prev => prev.map(conn =>
                    conn.provider === 'stripe'
                        ? { ...conn, connected: true, account_id: result.accountId }
                        : conn
                ));
                Alert.alert('Success', 'Stripe connected via Developer Mode!');
            } else {
                // PayPal - just save link
                const link = formData.link;
                const { error } = await supabase.from('profiles').update({ payment_link_paypal: link }).eq('id', user.id);
                if (error) throw error;

                setConnections(prev => prev.map(conn =>
                    conn.provider === 'paypal' ? { ...conn, connected: true, account_email: link } : conn
                ));
                Alert.alert('Success', 'PayPal link saved');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setShowConnectModal(null);
        }
    };

    const handleDisconnect = async (provider: 'stripe' | 'paypal') => {
        Alert.alert(
            t('disconnect', language),
            `Are you sure you want to disconnect ${provider.charAt(0).toUpperCase() + provider.slice(1)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: t('disconnect', language),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const field = `payment_link_${provider}`;
                            await supabase.from('profiles').update({ [field]: null }).eq('id', user?.id);

                            setConnections(prev => prev.map(conn =>
                                conn.provider === provider
                                    ? { ...conn, connected: false, account_id: undefined, account_email: undefined }
                                    : conn
                            ));

                            Alert.alert('Success', `${provider} disconnected successfully`);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to disconnect');
                        }
                    }
                }
            ]
        );
    };

    const handleSync = async (provider: 'stripe' | 'paypal') => {
        if (provider !== 'stripe') {
            Alert.alert('Not Available', 'PayPal sync is not yet available.');
            return;
        }

        // Check if Stripe is connected
        const status = await stripeService.checkConnectionStatus(user!.id);
        if (!status.connected) {
            Alert.alert('Not Connected', 'Please connect your Stripe account first.');
            return;
        }

        setSyncing(provider);

        try {
            let result;

            if (status.method === 'apikey') {
                // Developer Mode: Use direct API sync
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('stripe_api_key, active_company_id, company_id')
                    .eq('id', user!.id)
                    .single();

                if (!profileData?.stripe_api_key) {
                    throw new Error('API key not found');
                }

                const companyId = profileData.active_company_id || profileData.company_id;
                result = await stripeService.syncDirectWithApiKey(user!.id, profileData.stripe_api_key, companyId);
            } else {
                // OAuth: Use Edge Function
                result = await stripeService.syncViaEdgeFunction();
            }

            setConnections(prev => prev.map(conn =>
                conn.provider === provider
                    ? { ...conn, last_synced: new Date().toISOString(), total_synced: conn.total_synced + result.transactionsCount }
                    : conn
            ));

            Alert.alert(
                'Sync Complete',
                `Synced ${result.transactionsCount} transactions and ${result.payoutsCount} payouts.\n\nTotal Sales: ${formatCurrency(result.totalSales)}\nTotal Fees: ${formatCurrency(result.totalFees)}`
            );
        } catch (error: any) {
            Alert.alert('Sync Failed', error.message || 'Could not sync transactions. Please try again.');
        } finally {
            setSyncing(null);
        }
    };

    const handleAutoSyncToggle = async (provider: 'stripe' | 'paypal', value: boolean) => {
        setConnections(prev => prev.map(conn =>
            conn.provider === provider ? { ...conn, auto_sync: value } : conn
        ));

        // In production, save this preference to the database
        try {
            await supabase
                .from('payment_connections')
                .update({ auto_sync: value })
                .eq('user_id', user?.id)
                .eq('provider', provider);
        } catch (error) {
            // Table might not exist
        }
    };

    const renderProviderCard = (connection: PaymentConnection) => {
        const isStripe = connection.provider === 'stripe';
        const providerColor = isStripe ? '#635bff' : '#003087';
        const providerName = isStripe ? 'Stripe' : 'PayPal';
        const description = isStripe
            ? t('stripeDescription', language)
            : t('paypalDescription', language);

        return (
            <Card key={connection.provider} style={styles.providerCard}>
                {/* Header */}
                <View style={styles.providerHeader}>
                    <View style={[styles.providerLogo, { backgroundColor: `${providerColor}15` }]}>
                        {isStripe ? (
                            <Zap color={providerColor} size={28} />
                        ) : (
                            <CreditCard color={providerColor} size={28} />
                        )}
                    </View>
                    <View style={styles.providerInfo}>
                        <Text style={[styles.providerName, { color: textColor }]}>{providerName}</Text>
                        <View style={styles.statusBadge}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: connection.connected ? '#10b981' : '#ef4444' }
                            ]} />
                            <Text style={[styles.statusText, { color: mutedColor }]}>
                                {connection.connected ? t('connected', language) : t('notConnected', language)}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={[styles.providerDescription, { color: mutedColor }]}>
                    {description}
                </Text>

                {connection.connected ? (
                    <>
                        {/* Connected Account Info */}
                        {connection.account_email && (
                            <View style={[styles.accountInfo, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                                <Text style={[styles.accountEmail, { color: textColor }]}>
                                    {connection.account_email}
                                </Text>
                            </View>
                        )}

                        {/* Stats */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <DollarSign color={primaryColor} size={16} />
                                <Text style={[styles.statValue, { color: textColor }]}>
                                    {connection.total_synced}
                                </Text>
                                <Text style={[styles.statLabel, { color: mutedColor }]}>
                                    Transactions
                                </Text>
                            </View>
                            {connection.last_synced && (
                                <View style={styles.statItem}>
                                    <Clock color={mutedColor} size={16} />
                                    <Text style={[styles.statValue, { color: textColor }]}>
                                        {new Date(connection.last_synced).toLocaleDateString()}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: mutedColor }]}>
                                        {t('lastSynced', language)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Auto Sync Toggle */}
                        <View style={styles.autoSyncRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.autoSyncLabel, { color: textColor }]}>
                                    {t('autoSync', language)}
                                </Text>
                                <Text style={[styles.autoSyncHint, { color: mutedColor }]}>
                                    Sync daily automatically
                                </Text>
                            </View>
                            <Switch
                                value={connection.auto_sync}
                                onValueChange={(v) => handleAutoSyncToggle(connection.provider, v)}
                                trackColor={{ true: primaryColor }}
                            />
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.syncButton, { backgroundColor: primaryColor }]}
                                onPress={() => handleSync(connection.provider)}
                                disabled={syncing === connection.provider}
                            >
                                {syncing === connection.provider ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <RefreshCw color="#fff" size={18} />
                                        <Text style={styles.syncButtonText}>{t('syncPayments', language)}</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.disconnectButton, { borderColor: '#ef4444' }]}
                                onPress={() => handleDisconnect(connection.provider)}
                            >
                                <X color="#ef4444" size={18} />
                            </TouchableOpacity>

                            {/* View Dashboard Button for Stripe */}
                            {connection.provider === 'stripe' && (
                                <TouchableOpacity
                                    style={[styles.viewDashboardButton, { backgroundColor: '#635bff20', borderColor: '#635bff' }]}
                                    onPress={() => navigation.navigate('StripeDashboard')}
                                >
                                    <CreditCard color="#635bff" size={18} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                ) : (
                    /* Connect Button */
                    <TouchableOpacity
                        style={[styles.connectButton, { backgroundColor: providerColor }]}
                        onPress={() => handleConnect(connection.provider)}
                    >
                        <ExternalLink color="#fff" size={18} />
                        <Text style={styles.connectButtonText}>
                            {isStripe ? t('connectStripe', language) : t('connectPayPal', language)}
                        </Text>
                    </TouchableOpacity>
                )}
            </Card>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backButton, { backgroundColor: cardBg }]}
                >
                    <ArrowLeft color={textColor} size={20} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>
                    {t('paymentIntegrations', language)}
                </Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Card */}
                <Card style={[styles.infoCard, { backgroundColor: `${primaryColor}10` }]}>
                    <View style={styles.infoContent}>
                        <Zap color={primaryColor} size={24} />
                        <View style={styles.infoText}>
                            <Text style={[styles.infoTitle, { color: textColor }]}>
                                {t('onlineSales', language)}
                            </Text>
                            <Text style={[styles.infoDescription, { color: mutedColor }]}>
                                Connect your payment accounts to automatically track online sales and create income records.
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Provider Cards */}
                {connections.map(renderProviderCard)}

                {/* Recent Synced Transactions */}
                {recentTransactions.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: textColor, marginTop: 24 }]}>
                            Recent Synced Transactions
                        </Text>
                        {recentTransactions.map((tx, index) => (
                            <Card key={index} style={styles.transactionCard}>
                                <View style={styles.transactionRow}>
                                    <Text style={[styles.transactionDesc, { color: textColor }]}>
                                        {tx.description}
                                    </Text>
                                    <Text style={[styles.transactionAmount, { color: '#10b981' }]}>
                                        +{formatCurrency(tx.amount)}
                                    </Text>
                                </View>
                            </Card>
                        ))}
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <QuickAddModal
                visible={!!showConnectModal}
                onClose={() => setShowConnectModal(null)}
                title={`Connect ${showConnectModal?.toUpperCase()}`}
                onAdd={handleSaveLink}
                fields={[
                    {
                        key: 'link',
                        label: showConnectModal === 'stripe' ? 'Stripe Secret API Key' : 'PayPal Payment Link',
                        placeholder: showConnectModal === 'stripe' ? 'sk_live_... or sk_test_...' : 'https://paypal.me/...',
                        keyboardType: showConnectModal === 'stripe' ? 'default' : 'url'
                    }
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },

    // Info card
    infoCard: { marginBottom: 20, padding: 16 },
    infoContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    infoText: { flex: 1 },
    infoTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    infoDescription: { fontSize: 13, lineHeight: 18 },

    // Provider card
    providerCard: { padding: 20, marginBottom: 16 },
    providerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    providerLogo: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    providerInfo: { flex: 1 },
    providerName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 13, fontWeight: '500' },
    providerDescription: { fontSize: 13, lineHeight: 18, marginBottom: 16 },

    // Account info
    accountInfo: { padding: 12, borderRadius: 10, marginBottom: 12 },
    accountEmail: { fontSize: 14, fontWeight: '500' },

    // Stats
    statsRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statValue: { fontSize: 16, fontWeight: 'bold' },
    statLabel: { fontSize: 11 },

    // Auto sync
    autoSyncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#33415520',
        marginBottom: 16,
    },
    autoSyncLabel: { fontSize: 14, fontWeight: '600' },
    autoSyncHint: { fontSize: 12, marginTop: 2 },

    // Buttons
    actionRow: { flexDirection: 'row', gap: 10 },
    syncButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    syncButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    disconnectButton: {
        width: 50,
        height: 50,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewDashboardButton: {
        width: 50,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    connectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    connectButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    // Section
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },

    // Transactions
    transactionCard: { padding: 14, marginBottom: 8 },
    transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    transactionDesc: { fontSize: 14, fontWeight: '500' },
    transactionAmount: { fontSize: 15, fontWeight: 'bold' },
});
