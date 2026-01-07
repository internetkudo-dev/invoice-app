
-- ==============================================
-- Shifts & Scheduling - Database Changes
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Create Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID,
    title TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Users can view their own shifts
DROP POLICY IF EXISTS "Users can view their own shifts" ON shifts;
CREATE POLICY "Users can view their own shifts" ON shifts
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- 4. Policy: Admins can view all shifts in their company
DROP POLICY IF EXISTS "Admins can view company shifts" ON shifts;
CREATE POLICY "Admins can view company shifts" ON shifts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

-- 5. Policy: Admins can manage shifts
DROP POLICY IF EXISTS "Admins can manage shifts" ON shifts;
CREATE POLICY "Admins can manage shifts" ON shifts
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );
