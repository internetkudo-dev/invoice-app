-- ==============================================
-- Attendance Management - RLS Policies
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Ensure RLS is enabled
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Employees can view their own attendance records
DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance_records;
CREATE POLICY "Employees can view their own attendance" ON attendance_records
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- 3. Policy: Employees can punch in (insert)
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON attendance_records;
CREATE POLICY "Employees can insert their own attendance" ON attendance_records
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- 4. Policy: Employees can punch out (update their own record for today)
DROP POLICY IF EXISTS "Employees can update their own attendance" ON attendance_records;
CREATE POLICY "Employees can update their own attendance" ON attendance_records
  FOR UPDATE USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- 5. Policy: Admins can view all attendance in their company
DROP POLICY IF EXISTS "Admins can view company attendance" ON attendance_records;
CREATE POLICY "Admins can view company attendance" ON attendance_records
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );
