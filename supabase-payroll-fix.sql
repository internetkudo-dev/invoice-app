-- ==============================================
-- Payroll Management - Database Changes & RLS
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Policy: Employees can view their own payrolls
DROP POLICY IF EXISTS "Employees can view their own payrolls" ON payrolls;
CREATE POLICY "Employees can view their own payrolls" ON payrolls
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- 2. Policy: Admins can view all payrolls in their company
DROP POLICY IF EXISTS "Admins can view company payrolls" ON payrolls;
CREATE POLICY "Admins can view company payrolls" ON payrolls
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

-- 3. Policy: Admins can manage company payrolls (Insert/Update/Delete)
DROP POLICY IF EXISTS "Admins can manage company payrolls" ON payrolls;
CREATE POLICY "Admins can manage company payrolls" ON payrolls
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

-- 4. Helper Function: Generate Payroll for a company and month
CREATE OR REPLACE FUNCTION generate_company_payroll(p_company_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    emp_record RECORD;
    count INT := 0;
BEGIN
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
                total_payout, 
                status
            ) VALUES (
                emp_record.id, 
                p_company_id, 
                p_start_date, 
                p_end_date, 
                emp_record.base_salary, 
                emp_record.base_salary, -- Initial total payout same as base
                'draft'
            );
            count := count + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object('success', true, 'generated_count', count);
END;
$$;
