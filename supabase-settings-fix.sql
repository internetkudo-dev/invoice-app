-- ==============================================
-- Settings and Data Management Fixes - RLS Policies
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Add INSERT policy for companies table
-- This fixes the "Company Creation Bug"
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
CREATE POLICY "Authenticated users can create companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Add INSERT policy for memberships table
DROP POLICY IF EXISTS "Users can create their own memberships" ON memberships;
CREATE POLICY "Users can create their own memberships" ON memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 3. Add SMTP columns to companies table (if they don't exist)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_host TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_port INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_user TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_pass TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_from_email TEXT;

-- 4. Verify policies were created
-- SELECT * FROM pg_policies WHERE tablename IN ('companies', 'memberships');
