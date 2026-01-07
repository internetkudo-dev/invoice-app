-- Fix Payroll RLS and RPC Logic
-- ===============================

-- 1. Create a function to check manager permissions efficiently AND securely
CREATE OR REPLACE FUNCTION is_company_manager_or_higher(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE company_id = p_company_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin', 'manager')
  );
$$;

-- 2. Drop existing payrolls policies
DROP POLICY IF EXISTS "Employees can view their own payrolls" ON payrolls;
DROP POLICY IF EXISTS "Admins can view company payrolls" ON payrolls;
DROP POLICY IF EXISTS "Admins can manage company payrolls" ON payrolls;

-- 3. Create Consolidate Policies
-- VIEW
CREATE POLICY "View payrolls policy" ON payrolls
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) -- Employee viewing their own
    OR
    is_company_manager_or_higher(company_id) -- Owner/Admin/Manager viewing company payrolls
  );

-- MANAGE
CREATE POLICY "Manage payrolls policy" ON payrolls
  FOR ALL USING (
    is_company_manager_or_higher(company_id)
  );

-- 4. Update the generate_company_payroll RPC to explicitely respect passed company_id security
CREATE OR REPLACE FUNCTION generate_company_payroll(p_company_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    emp_record RECORD;
    count INT := 0;
BEGIN
    -- Security Check inside RPC (since it's SECURITY DEFINER)
    IF NOT EXISTS (
        SELECT 1 FROM memberships 
        WHERE company_id = p_company_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'manager')
    ) THEN
        RAISE EXCEPTION 'Access Denied: You are not a manager for this company.';
    END IF;

    FOR emp_record IN 
        SELECT id, base_salary FROM employees 
        WHERE company_id = p_company_id AND status = 'active'
    LOOP
        -- Skip if payroll already exists for this employee and period
        IF NOT EXISTS (
            SELECT 1 FROM payrolls 
            WHERE employee_id = emp_record.id 
            AND period_start = p_start_date 
            AND period_end = p_end_date
        ) THEN
            INSERT INTO payrolls (
                employee_id, 
                company_id, 
                period_start, 
                period_end, 
                base_salary, 
                bonus,
                deductions,
                expenses_reimbursed,
                total_payout, 
                status
            ) VALUES (
                emp_record.id, 
                p_company_id, 
                p_start_date, 
                p_end_date, 
                emp_record.base_salary,
                0, -- bonus
                0, -- deductions
                0, -- expenses
                emp_record.base_salary, -- Initial total same as base
                'draft'
            );
            count := count + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object('success', true, 'generated_count', count);
END;
$$;
