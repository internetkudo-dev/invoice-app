-- ==========================================
-- CONSOLIDATED EMPLOYEES & WORKSPACE MIGRATION
-- ==========================================

-- 1. Create Companies Table (Workspace)
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id),
    name TEXT,
    logo_url TEXT,
    invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure idempotency for companies columns
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_token TEXT CONSTRAINT companies_invite_token_key UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- 2. Create Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES auth.users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    job_title TEXT,
    department TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('admin', 'manager', 'employee')) DEFAULT 'employee',
    status TEXT CHECK (status IN ('active', 'onboarding', 'terminated', 'on_leave', 'pending')) DEFAULT 'active',
    hire_date DATE DEFAULT CURRENT_DATE,
    base_salary NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    permissions JSONB DEFAULT '{}', -- Added for RBAC
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotent updates for employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_status_check') THEN
        ALTER TABLE employees ADD CONSTRAINT employees_status_check 
        CHECK (status IN ('active', 'onboarding', 'terminated', 'on_leave', 'pending'));
    ELSE
        ALTER TABLE employees DROP CONSTRAINT employees_status_check;
        ALTER TABLE employees ADD CONSTRAINT employees_status_check 
        CHECK (status IN ('active', 'onboarding', 'terminated', 'on_leave', 'pending'));
    END IF;
END $$;


-- 3. Employee Documents
CREATE TABLE IF NOT EXISTS employee_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID,
    name TEXT NOT NULL,
    document_type TEXT CHECK (document_type IN ('contract', 'identification', 'certificate', 'tax', 'other')),
    file_url TEXT NOT NULL,
    expiry_date DATE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID,
    date DATE DEFAULT CURRENT_DATE,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    total_hours NUMERIC GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (check_out - check_in)) / 3600
    ) STORED,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'half_day')) DEFAULT 'present',
    location_lat NUMERIC,
    location_lng NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID,
    leave_type TEXT CHECK (leave_type IN ('vacation', 'sick', 'personal', 'unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Payrolls
CREATE TABLE IF NOT EXISTS payrolls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_salary NUMERIC NOT NULL,
    bonus NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    expenses_reimbursed NUMERIC DEFAULT 0,
    total_payout NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('draft', 'processed', 'paid')) DEFAULT 'draft',
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Update Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_company_id UUID REFERENCES companies(id);

-- 8. Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

-- 9. Key Policies (Recreated Safely)
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

-- 10. Join Company RPC
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
