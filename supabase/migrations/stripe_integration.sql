-- Stripe Connect OAuth Database Migration
-- Run this in Supabase SQL Editor

-- Add Stripe OAuth fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_livemode BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_last_synced TIMESTAMPTZ;
-- Developer Mode: Manual API key for platform owner
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_api_key TEXT;

-- Create stripe_transactions table
CREATE TABLE IF NOT EXISTS stripe_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    stripe_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'eur',
    description TEXT,
    customer_email TEXT,
    status TEXT,
    fee NUMERIC DEFAULT 0,
    net NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create stripe_payouts table
CREATE TABLE IF NOT EXISTS stripe_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    stripe_id TEXT UNIQUE NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'eur',
    arrival_date DATE,
    status TEXT,
    method TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_transactions (drop first to make idempotent)
DROP POLICY IF EXISTS "Users can view own stripe_transactions" ON stripe_transactions;
DROP POLICY IF EXISTS "Users can insert own stripe_transactions" ON stripe_transactions;
DROP POLICY IF EXISTS "Users can update own stripe_transactions" ON stripe_transactions;

CREATE POLICY "Users can view own stripe_transactions" ON stripe_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stripe_transactions" ON stripe_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stripe_transactions" ON stripe_transactions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for stripe_payouts (drop first to make idempotent)
DROP POLICY IF EXISTS "Users can view own stripe_payouts" ON stripe_payouts;
DROP POLICY IF EXISTS "Users can insert own stripe_payouts" ON stripe_payouts;
DROP POLICY IF EXISTS "Users can update own stripe_payouts" ON stripe_payouts;

CREATE POLICY "Users can view own stripe_payouts" ON stripe_payouts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stripe_payouts" ON stripe_payouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stripe_payouts" ON stripe_payouts
    FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_user_id ON stripe_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_stripe_id ON stripe_transactions(stripe_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payouts_user_id ON stripe_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payouts_stripe_id ON stripe_payouts(stripe_id);
