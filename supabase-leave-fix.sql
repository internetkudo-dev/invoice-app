-- ==============================================
-- Leave Requests Management - RLS Policies
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Ensure RLS is enabled
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Employees can view their own leave requests
DROP POLICY IF EXISTS "Employees can view their own leave requests" ON leave_requests;
CREATE POLICY "Employees can view their own leave requests" ON leave_requests
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- 3. Policy: Employees can submit their own leave requests
DROP POLICY IF EXISTS "Employees can insert their own leave requests" ON leave_requests;
CREATE POLICY "Employees can insert their own leave requests" ON leave_requests
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- 4. Policy: Admins can view all leave requests in their company
DROP POLICY IF EXISTS "Admins can view company leave requests" ON leave_requests;
CREATE POLICY "Admins can view company leave requests" ON leave_requests
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

-- 5. Policy: Admins can update leave request status
DROP POLICY IF EXISTS "Admins can update leave request status" ON leave_requests;
CREATE POLICY "Admins can update leave request status" ON leave_requests
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );
