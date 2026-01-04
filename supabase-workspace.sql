-- 1. Create Companies Table if it doesn't exist (basic structure)
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Idempotently add columns to 'companies'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS name TEXT; -- Removed NOT NULL to avoid issues if adding to existing rows
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_token TEXT CONSTRAINT companies_invite_token_key UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');
ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 3. Update Profiles linkage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_company_id UUID REFERENCES companies(id);

-- 4. Update Employees columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'; 
-- Re-add constraint safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_status_check') THEN
        ALTER TABLE employees ADD CONSTRAINT employees_status_check 
        CHECK (status IN ('active', 'onboarding', 'terminated', 'on_leave', 'pending'));
    ELSE
        -- Optional: Drop and recreate if you need to update the check values
        ALTER TABLE employees DROP CONSTRAINT employees_status_check;
        ALTER TABLE employees ADD CONSTRAINT employees_status_check 
        CHECK (status IN ('active', 'onboarding', 'terminated', 'on_leave', 'pending'));
    END IF;
END $$;

-- 5. Security Policies (Drop existing to avoid conflicts, then recreate)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        ) OR owner_id = auth.uid()
    );

DROP POLICY IF EXISTS "Owners can update their company" ON companies;
CREATE POLICY "Owners can update their company" ON companies
    FOR UPDATE USING (owner_id = auth.uid());

-- 6. Functions (Idempotent by nature with CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION join_company(token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_company_id UUID;
    new_employee_id UUID;
BEGIN
    -- 1. Validate Token
    SELECT id INTO target_company_id FROM companies WHERE invite_token = token;
    
    IF target_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
    END IF;

    -- 2. Check if already a member
    IF EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND company_id = target_company_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already a member');
    END IF;

    -- 3. Create Pending Employee Record
    INSERT INTO employees (
        company_id, 
        user_id, 
        first_name, 
        last_name, 
        email, 
        role, 
        status
    )
    SELECT 
        target_company_id, 
        auth.uid(), 
        (SELECT first_name FROM profiles WHERE id = auth.uid()),
        (SELECT last_name FROM profiles WHERE id = auth.uid()),
        (SELECT email FROM profiles WHERE id = auth.uid()),
        'employee',
        'pending'
    RETURNING id INTO new_employee_id;

    -- 4. Update Profile's company_id if it's their first one
    UPDATE profiles 
    SET company_id = target_company_id 
    WHERE id = auth.uid() AND company_id IS NULL;

    RETURN jsonb_build_object('success', true, 'company_id', target_company_id, 'employee_id', new_employee_id);
END;
$$;
