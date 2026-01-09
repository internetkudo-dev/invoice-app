// Stripe Sync Edge Function
// Securely fetches Stripe data using stored access tokens

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get user from JWT
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Verify JWT and get user
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get user's Stripe credentials
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('stripe_access_token, stripe_account_id, active_company_id, company_id')
            .eq('id', user.id)
            .single()

        if (profileError || !profile?.stripe_access_token) {
            return new Response(
                JSON.stringify({ error: 'Stripe not connected' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const accessToken = profile.stripe_access_token
        const stripeAccountId = profile.stripe_account_id
        const companyId = profile.active_company_id || profile.company_id

        // Fetch balance transactions with pagination
        const allTransactions: any[] = []
        let hasMore = true
        let startingAfter: string | undefined

        while (hasMore) {
            const params = new URLSearchParams({ limit: '100' })
            if (startingAfter) params.append('starting_after', startingAfter)

            const txResponse = await fetch(
                `https://api.stripe.com/v1/balance_transactions?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Stripe-Account': stripeAccountId,
                    },
                }
            )

            const txData = await txResponse.json()

            if (txData.error) {
                throw new Error(txData.error.message)
            }

            allTransactions.push(...txData.data)
            hasMore = txData.has_more

            if (txData.data.length > 0) {
                startingAfter = txData.data[txData.data.length - 1].id
            } else {
                hasMore = false
            }
        }

        // Fetch payouts with pagination
        const allPayouts: any[] = []
        hasMore = true
        startingAfter = undefined

        while (hasMore) {
            const params = new URLSearchParams({ limit: '100' })
            if (startingAfter) params.append('starting_after', startingAfter)

            const payoutResponse = await fetch(
                `https://api.stripe.com/v1/payouts?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Stripe-Account': stripeAccountId,
                    },
                }
            )

            const payoutData = await payoutResponse.json()

            if (payoutData.error) {
                throw new Error(payoutData.error.message)
            }

            allPayouts.push(...payoutData.data)
            hasMore = payoutData.has_more

            if (payoutData.data.length > 0) {
                startingAfter = payoutData.data[payoutData.data.length - 1].id
            } else {
                hasMore = false
            }
        }

        // Sync transactions to database
        let transactionsCount = 0
        let totalSales = 0
        let totalFees = 0

        for (const tx of allTransactions) {
            const { data: existing } = await supabase
                .from('stripe_transactions')
                .select('id')
                .eq('stripe_id', tx.id)
                .single()

            if (!existing) {
                const txRecord = {
                    user_id: user.id,
                    company_id: companyId,
                    stripe_id: tx.id,
                    type: tx.type,
                    amount: tx.amount / 100,
                    currency: tx.currency,
                    description: tx.description,
                    status: tx.status,
                    fee: tx.fee ? tx.fee / 100 : 0,
                    net: tx.net ? tx.net / 100 : 0,
                    created_at: new Date(tx.created * 1000).toISOString(),
                }

                await supabase.from('stripe_transactions').insert(txRecord)
                transactionsCount++

                if (tx.type === 'charge' || tx.type === 'payment') {
                    totalSales += txRecord.amount
                }
                if (tx.fee) {
                    totalFees += txRecord.fee
                }
            }
        }

        // Sync payouts to database
        let payoutsCount = 0
        let totalPayouts = 0

        for (const payout of allPayouts) {
            const { data: existing } = await supabase
                .from('stripe_payouts')
                .select('id')
                .eq('stripe_id', payout.id)
                .single()

            if (!existing) {
                const payoutRecord = {
                    user_id: user.id,
                    company_id: companyId,
                    stripe_id: payout.id,
                    amount: payout.amount / 100,
                    currency: payout.currency,
                    arrival_date: new Date(payout.arrival_date * 1000).toISOString().split('T')[0],
                    status: payout.status,
                    method: payout.method,
                    description: payout.description,
                    created_at: new Date(payout.created * 1000).toISOString(),
                }

                await supabase.from('stripe_payouts').insert(payoutRecord)
                payoutsCount++
                totalPayouts += payoutRecord.amount
            }
        }

        // Update last synced
        await supabase
            .from('profiles')
            .update({ stripe_last_synced: new Date().toISOString() })
            .eq('id', user.id)

        return new Response(
            JSON.stringify({
                success: true,
                transactionsCount,
                payoutsCount,
                totalSales,
                totalPayouts,
                totalFees,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Stripe sync error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
