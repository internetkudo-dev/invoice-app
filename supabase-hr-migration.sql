-- ==============================================
-- HR and Employee Management - Database Changes
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Add invite token to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_token_created_at TIMESTAMPTZ;

-- 2. Add status to memberships for pending/approval workflow
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
-- Possible values: 'pending', 'active', 'rejected'

-- 3. Add RLS INSERT policy for employees table
DROP POLICY IF EXISTS "Company owners can insert employees" ON employees;
CREATE POLICY "Company owners can insert employees" ON employees
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND (status = 'active' OR status IS NULL)
    )
  );

-- 4. Function to generate unique invite token
CREATE OR REPLACE FUNCTION generate_company_invite_token(company_uuid UUID)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_token TEXT;
BEGIN
    -- Generate a random 16-byte hex token
    new_token := encode(gen_random_bytes(16), 'hex');
    
    -- Update the company with the new token
    UPDATE companies 
    SET invite_token = new_token, 
        invite_token_created_at = NOW()
    WHERE id = company_uuid;
    
    RETURN new_token;
END;
$$;

-- 5. RLS policy for pending memberships (users can see their own pending status)
DROP POLICY IF EXISTS "Users can view pending memberships by token" ON memberships;
CREATE POLICY "Users can view pending memberships by token" ON memberships
  FOR SELECT USING (
    user_id = auth.uid() OR 
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 6. RLS policy for owners to update membership status
DROP POLICY IF EXISTS "Owners can update membership status" ON memberships;
CREATE POLICY "Owners can update membership status" ON memberships
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 7. Verify policies
-- SELECT * FROM pg_policies WHERE tablename IN ('companies', 'memberships', 'employees');
