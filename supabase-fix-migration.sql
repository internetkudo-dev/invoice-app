-- ==========================================
-- SAFE UPDATE SCRIPT (Resolves Conflicts)
-- ==========================================

-- 1. Companies: Ensure table exists, then add columns safely
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_token TEXT CONSTRAINT companies_invite_token_key UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');
ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 2. Employees: Modify existing table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Re-do constraint safely
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE employees ADD CONSTRAINT employees_status_check 
    CHECK (status IN ('active', 'onboarding', 'terminated', 'on_leave', 'pending'));

-- 3. Profiles: Update linkage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_company_id UUID REFERENCES companies(id);

-- 4. Security Policies (Refresh)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) 
        OR owner_id = auth.uid()
    );

DROP POLICY IF EXISTS "Owners can update their company" ON companies;
CREATE POLICY "Owners can update their company" ON companies
    FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their company employees" ON employees;
CREATE POLICY "Users can view their company employees" ON employees
    FOR SELECT USING (auth.uid() = user_id OR company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
CREATE POLICY "Admins can manage employees" ON employees
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin' OR id = company_id
    ));

-- 5. RPC Function (Join Logic)
CREATE OR REPLACE FUNCTION join_company(token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_company_id UUID;
    new_employee_id UUID;
BEGIN
    SELECT id INTO target_company_id FROM companies WHERE invite_token = token;
    
    IF target_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
    END IF;

    IF EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND company_id = target_company_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already a member');
    END IF;

    INSERT INTO employees (
        company_id, user_id, first_name, last_name, email, role, status
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

    UPDATE profiles 
    SET company_id = target_company_id 
    WHERE id = auth.uid() AND company_id IS NULL;

    RETURN jsonb_build_object('success', true, 'company_id', target_company_id, 'employee_id', new_employee_id);
END;
$$;
