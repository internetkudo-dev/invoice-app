-- Fix vendors table RLS policies
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can insert own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can update own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can delete own vendors" ON vendors;

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies using auth.uid() instead of referencing users table
CREATE POLICY "Users can view own vendors" ON vendors
    FOR SELECT USING (
        user_id = auth.uid() OR 
        company_id IN (
            SELECT COALESCE(active_company_id, company_id, id) 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own vendors" ON vendors
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "Users can update own vendors" ON vendors
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        company_id IN (
            SELECT COALESCE(active_company_id, company_id, id) 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own vendors" ON vendors
    FOR DELETE USING (
        user_id = auth.uid() OR 
        company_id IN (
            SELECT COALESCE(active_company_id, company_id, id) 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Also fix expenses table policies if they reference users table
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

CREATE POLICY "Users can view own expenses" ON expenses
    FOR SELECT USING (
        user_id = auth.uid() OR 
        company_id IN (
            SELECT COALESCE(active_company_id, company_id, id) 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own expenses" ON expenses
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "Users can update own expenses" ON expenses
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        company_id IN (
            SELECT COALESCE(active_company_id, company_id, id) 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own expenses" ON expenses
    FOR DELETE USING (
        user_id = auth.uid() OR 
        company_id IN (
            SELECT COALESCE(active_company_id, company_id, id) 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );
