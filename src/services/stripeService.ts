/**
 * Stripe Connect OAuth Service
 * Handles Stripe Connect OAuth flow and syncs transactions via Edge Functions.
 */

import { supabase } from '../api/supabase';
import * as WebBrowser from 'expo-web-browser';

// Stripe Connect OAuth configuration
// Replace these with your actual values or load from environment
const STRIPE_CLIENT_ID = 'ca_PZGXRrlBTAqHPKTlPNeo09U3LQFbWwhh'; // Replace with your Stripe Connect client ID
const SUPABASE_URL = 'https://hprylepdcvakwngmoshy.supabase.co'; // Replace with your Supabase URL

export interface StripeTransaction {
    id: string;
    stripe_id: string;
    type: 'charge' | 'refund' | 'payout' | 'fee' | 'payment';
    amount: number;
    currency: string;
    description?: string;
    created_at: string;
    status: string;
    customer_email?: string;
    fee?: number;
    net?: number;
    payment_details?: any;
}

export interface StripePayout {
    id: string;
    stripe_id: string;
    amount: number;
    currency: string;
    arrival_date: string;
    status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled';
    method?: string;
    description?: string;
}

export interface StripeSyncResult {
    transactionsCount: number;
    payoutsCount: number;
    totalSales: number;
    totalPayouts: number;
    totalFees: number;
}

class StripeService {
    /**
     * Get the Stripe Connect OAuth URL
     */
    getOAuthUrl(userId: string): string {
        const redirectUri = `${SUPABASE_URL}/functions/v1/stripe-connect`;

        const params = new URLSearchParams({
            client_id: STRIPE_CLIENT_ID,
            response_type: 'code',
            scope: 'read_write',
            state: userId, // Pass user_id to callback
            redirect_uri: redirectUri,
        });

        return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
    }

    /**
     * Initiate Stripe Connect OAuth flow
     * Opens an in-app browser for the user to authorize
     */
    async initiateOAuth(userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const oauthUrl = this.getOAuthUrl(userId);

            // Open in-app browser
            const result = await WebBrowser.openAuthSessionAsync(
                oauthUrl,
                'faturicka://stripe-callback'
            );

            if (result.type === 'success' && result.url) {
                const url = new URL(result.url);
                const success = url.searchParams.get('success');
                const error = url.searchParams.get('error');

                if (success === 'true') {
                    return { success: true };
                } else if (error) {
                    return { success: false, error };
                }
            }

            if (result.type === 'cancel') {
                return { success: false, error: 'User cancelled authorization' };
            }

            return { success: false, error: 'OAuth flow failed' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }



    /**
     * Disconnect Stripe account
     */
    async disconnect(userId: string): Promise<boolean> {
        const { error } = await supabase
            .from('profiles')
            .update({
                stripe_access_token: null,
                stripe_refresh_token: null,
                stripe_account_id: null,
                stripe_connected_at: null,
                stripe_livemode: null,
                stripe_api_key: null, // Also clear API key
            })
            .eq('id', userId);

        return !error;
    }

    // ============================================
    // DEVELOPER MODE: Manual API Key Methods
    // ============================================

    private apiKey: string | null = null;

    /**
     * Set API key for direct requests (developer mode)
     */
    setApiKey(key: string) {
        this.apiKey = key;
    }

    /**
     * Make direct request to Stripe API (developer mode)
     */
    private async directRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const url = new URL(`https://api.stripe.com/v1${endpoint}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => url.searchParams.append(key, v));
                } else {
                    url.searchParams.append(key, value);
                }
            });
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Stripe API error');
        }

        return response.json();
    }

    /**
     * Validate API key by fetching account info (developer mode)
     */
    async validateApiKey(apiKey: string): Promise<{ valid: boolean; accountId?: string; email?: string }> {
        try {
            this.setApiKey(apiKey);
            const account = await this.directRequest<any>('/account');
            return {
                valid: true,
                accountId: account.id,
                email: account.email,
            };
        } catch (error) {
            return { valid: false };
        }
    }

    /**
     * Connect using manual API key (developer mode)
     */
    async connectWithApiKey(userId: string, apiKey: string): Promise<{ success: boolean; error?: string; accountId?: string }> {
        try {
            const validation = await this.validateApiKey(apiKey);

            if (!validation.valid) {
                return { success: false, error: 'Invalid API key' };
            }

            // Save to profile
            const { error } = await supabase.from('profiles').update({
                stripe_api_key: apiKey,
                stripe_account_id: validation.accountId,
                stripe_connected_at: new Date().toISOString(),
            }).eq('id', userId);

            if (error) throw error;

            return { success: true, accountId: validation.accountId };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if user is connected to Stripe (via OAuth OR API key)
     */
    async checkConnectionStatus(userId: string): Promise<{
        connected: boolean;
        method?: 'oauth' | 'apikey';
        accountId?: string;
        livemode?: boolean;
        connectedAt?: string;
    }> {
        const { data, error } = await supabase
            .from('profiles')
            .select('stripe_access_token, stripe_api_key, stripe_account_id, stripe_livemode, stripe_connected_at')
            .eq('id', userId)
            .single();

        if (error || (!data?.stripe_access_token && !data?.stripe_api_key)) {
            return { connected: false };
        }

        return {
            connected: true,
            method: data.stripe_access_token ? 'oauth' : 'apikey',
            accountId: data.stripe_account_id,
            livemode: data.stripe_livemode,
            connectedAt: data.stripe_connected_at,
        };
    }

    /**
     * Sync directly with API key (developer mode) - bypasses Edge Function
     */
    async syncDirectWithApiKey(userId: string, apiKey: string, companyId?: string, force: boolean = false): Promise<StripeSyncResult> {
        this.setApiKey(apiKey);

        // Prepare parallel fetches for Transactions and Payouts
        const fetchTransactions = async () => {
            let lastTimestamp = 0;

            // If not forcing a full sync, check when we last synced to do incremental fetch
            if (!force) {
                const { data: latestTx } = await supabase
                    .from('stripe_transactions')
                    .select('created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                lastTimestamp = latestTx ? Math.floor(new Date(latestTx.created_at).getTime() / 1000) : 0;
            }

            let allTransactions: any[] = [];
            let hasMore = true;
            let startingAfter: string | undefined;
            // Fetch more records during a force sync (up to 1000)
            const maxRecords = force ? 1000 : 120;

            while (hasMore && allTransactions.length < maxRecords) {
                const params: any = {
                    limit: '50',
                    'expand[]': ['data.source', 'data.source.payment_method'] // Deep expansion
                };
                if (lastTimestamp > 0 && !force) params['created[gt]'] = lastTimestamp.toString();
                if (startingAfter) params.starting_after = startingAfter;

                const response = await this.directRequest<{ data: any[]; has_more: boolean }>('/balance_transactions', params);
                allTransactions = [...allTransactions, ...response.data];
                hasMore = response.has_more;
                if (response.data.length > 0) {
                    startingAfter = response.data[response.data.length - 1].id;
                } else {
                    hasMore = false;
                }
            }
            return allTransactions;
        };

        const fetchPayouts = async () => {
            let lastPayoutTimestamp = 0;

            if (!force) {
                const { data: latestPayout } = await supabase
                    .from('stripe_payouts')
                    .select('created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                lastPayoutTimestamp = latestPayout ? Math.floor(new Date(latestPayout.created_at).getTime() / 1000) : 0;
            }

            let allPayouts: any[] = [];
            let hasMore = true;
            let startingAfter: string | undefined;
            const maxPayouts = force ? 100 : 50;

            while (hasMore && allPayouts.length < maxPayouts) {
                const params: any = { limit: '50' };
                if (lastPayoutTimestamp > 0) params['created[gt]'] = lastPayoutTimestamp.toString();
                if (startingAfter) params.starting_after = startingAfter;

                const response = await this.directRequest<{ data: any[]; has_more: boolean }>('/payouts', params);
                allPayouts = [...allPayouts, ...response.data];
                hasMore = response.has_more;
                if (response.data.length > 0) {
                    startingAfter = response.data[response.data.length - 1].id;
                } else {
                    hasMore = false;
                }
            }
            return allPayouts;
        };

        // Execute in parallel
        const [allTransactions, allPayouts] = await Promise.all([
            fetchTransactions(),
            fetchPayouts()
        ]);

        // Sync to database in batches
        let transactionsCount = 0;
        let payoutsCount = 0;
        let totalSales = 0;
        let totalPayouts = 0;
        let totalFees = 0;

        // Process transactions in batches
        if (allTransactions.length > 0) {
            const txRecords = allTransactions.map(tx => {
                const amount = tx.amount / 100;
                const fee = (tx.fee || 0) / 100;

                if (tx.type === 'charge' || tx.type === 'payment') {
                    totalSales += amount;
                }
                totalFees += fee;

                // Prioritize the detailed description from the source (charge) if available
                // If tx.source is a string, it means it wasn't expanded
                const charge = typeof tx.source === 'object' ? tx.source : {};
                const description = charge?.description || tx.description || 'Stripe Transaction';
                const email = charge?.receipt_email ||
                    charge?.billing_details?.email ||
                    charge?.metadata?.customer_email ||
                    charge?.metadata?.email ||
                    null;

                return {
                    user_id: userId,
                    company_id: companyId,
                    stripe_id: tx.id,
                    type: tx.type,
                    amount: amount,
                    currency: tx.currency,
                    description: description,
                    status: tx.status,
                    fee: fee,
                    net: (tx.net || 0) / 100,
                    created_at: new Date(tx.created * 1000).toISOString(),
                    payment_details: charge,
                    customer_email: email,
                };
            });

            // Upsert in chunks
            const chunkSize = 50;
            for (let i = 0; i < txRecords.length; i += chunkSize) {
                const chunk = txRecords.slice(i, i + chunkSize);
                await supabase.from('stripe_transactions').upsert(chunk, { onConflict: 'stripe_id' });
                transactionsCount += chunk.length;
            }
        }

        // Process payouts in batches
        if (allPayouts.length > 0) {
            const payoutRecords = allPayouts.map(payout => {
                if (payout.status === 'paid') {
                    totalPayouts += payout.amount / 100;
                }

                return {
                    user_id: userId,
                    company_id: companyId,
                    stripe_id: payout.id,
                    amount: payout.amount / 100,
                    currency: payout.currency,
                    arrival_date: new Date(payout.arrival_date * 1000).toISOString().split('T')[0],
                    status: payout.status,
                    method: payout.method,
                    description: payout.description,
                    created_at: new Date(payout.created * 1000).toISOString(),
                };
            });

            const chunkSize = 50;
            for (let i = 0; i < payoutRecords.length; i += chunkSize) {
                const chunk = payoutRecords.slice(i, i + chunkSize);
                await supabase.from('stripe_payouts').upsert(chunk, { onConflict: 'stripe_id' });
                payoutsCount += chunk.length;
            }
        }

        // Update last synced
        await supabase
            .from('profiles')
            .update({ stripe_last_synced: new Date().toISOString() })
            .eq('id', userId);

        return { transactionsCount, payoutsCount, totalSales, totalPayouts, totalFees };
    }

    /**
     * Sync Stripe data via Edge Function
     * This calls the secure server-side function that uses the stored access token
     */
    async syncViaEdgeFunction(): Promise<StripeSyncResult> {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-sync`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Sync failed');
        }

        return data;
    }

    /**
     * Get dashboard summary from local database
     */
    async getDashboardSummary(userId: string, companyId?: string): Promise<{
        totalSales: number;
        totalPayouts: number;
        totalFees: number;
        totalNet: number;
        pendingPayouts: number;
        recentTransactions: StripeTransaction[];
        recentPayouts: StripePayout[];
    }> {
        const filter = companyId
            ? `user_id.eq.${userId},company_id.eq.${companyId}`
            : `user_id.eq.${userId}`;

        // Fetch all transactions for totals
        const { data: allTransactions } = await supabase
            .from('stripe_transactions')
            .select('*')
            .or(filter);

        // Fetch all payouts for totals
        const { data: allPayouts } = await supabase
            .from('stripe_payouts')
            .select('*')
            .or(filter);

        // Calculate totals
        const transactions = allTransactions || [];
        const payouts = allPayouts || [];

        const totalSales = transactions
            .filter(t => t.type === 'charge' || t.type === 'payment')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalFees = transactions
            .reduce((sum, t) => sum + Number(t.fee || 0), 0);

        const totalNet = transactions
            .filter(t => t.type === 'charge' || t.type === 'payment' || t.type === 'refund')
            .reduce((sum, t) => {
                if (t.type === 'refund') return sum - Number(t.amount);
                return sum + Number(t.amount) - Number(t.fee || 0);
            }, 0);

        const totalPayouts = payouts
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const pendingPayouts = payouts
            .filter(p => p.status === 'pending' || p.status === 'in_transit')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // Get recent versions for the list
        const recentTransactions = [...transactions]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20);

        const recentPayouts = [...payouts]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);

        return {
            totalSales,
            totalPayouts,
            totalFees,
            totalNet,
            pendingPayouts,
            recentTransactions,
            recentPayouts,
        };
    }
}

export const stripeService = new StripeService();
