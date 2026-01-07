-- Fix RLS Policies for Shifts
-- ===========================

-- 1. Ensure `company_id` column exists referenced to companies
-- (Already exists from previous migration, but verifying linkage is good practice if needed)

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own shifts" ON shifts;
DROP POLICY IF EXISTS "Admins can view company shifts" ON shifts;
DROP POLICY IF EXISTS "Admins can manage shifts" ON shifts;

-- 3. Create a comprehensive VIEW policy
DROP POLICY IF EXISTS "View shifts policy" ON shifts;
CREATE POLICY "View shifts policy" ON shifts
  FOR SELECT USING (
    -- User is the employee assigned to the shift
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    -- User is an Owner/Admin/Manager of the company
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- 4. Create a comprehensive MANAGE policy (Insert, Update, Delete)
DROP POLICY IF EXISTS "Manage shifts policy" ON shifts;
CREATE POLICY "Manage shifts policy" ON shifts
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager')
    )
  ); 
  
-- Note: We switched to checking `memberships` table for admin/owner status instead of `employees` table.
-- This is more robust because owners (like yourself) are primarily defined in `memberships`.

