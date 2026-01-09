// Stripe Connect OAuth Callback Handler
// Receives authorization code from Stripe and exchanges for access token

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state') // Contains user_id
        const error = url.searchParams.get('error')
        const errorDescription = url.searchParams.get('error_description')

        // Handle OAuth errors
        if (error) {
            console.error('OAuth error:', error, errorDescription)
            return new Response(
                `<html><body><script>window.location.href='faturicka://stripe-callback?error=${encodeURIComponent(errorDescription || error)}'</script></body></html>`,
                { headers: { 'Content-Type': 'text/html' } }
            )
        }

        if (!code || !state) {
            return new Response(
                JSON.stringify({ error: 'Missing code or state parameter' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse state to get user_id
        const userId = state

        // Exchange code for access token
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY not configured')
        }

        const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_secret: stripeSecretKey,
                code: code,
                grant_type: 'authorization_code',
            }),
        })

        const tokenData = await tokenResponse.json()

        if (tokenData.error) {
            console.error('Token exchange error:', tokenData.error_description)
            return new Response(
                `<html><body><script>window.location.href='faturicka://stripe-callback?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}'</script></body></html>`,
                { headers: { 'Content-Type': 'text/html' } }
            )
        }

        // Store tokens in database
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                stripe_access_token: tokenData.access_token,
                stripe_refresh_token: tokenData.refresh_token,
                stripe_account_id: tokenData.stripe_user_id,
                stripe_connected_at: new Date().toISOString(),
                stripe_livemode: tokenData.livemode,
            })
            .eq('id', userId)

        if (updateError) {
            console.error('Database update error:', updateError)
            throw new Error('Failed to save Stripe connection')
        }

        // Redirect back to app with success
        return new Response(
            `<html><body><script>window.location.href='faturicka://stripe-callback?success=true&account_id=${tokenData.stripe_user_id}'</script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        )

    } catch (error) {
        console.error('Stripe Connect error:', error)
        return new Response(
            `<html><body><script>window.location.href='faturicka://stripe-callback?error=${encodeURIComponent(error.message)}'</script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        )
    }
})
