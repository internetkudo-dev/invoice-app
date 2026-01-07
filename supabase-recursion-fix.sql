-- Fix Infinite Recursion in Memberships RLS
-- ===========================================

-- 1. Create a SECURITY DEFINER function to check ownership without triggering RLS recursively
CREATE OR REPLACE FUNCTION is_company_owner(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE company_id = p_company_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin') -- Adjusted to include admin if they should also view
  );
$$;

-- 2. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view pending memberships by token" ON memberships;
DROP POLICY IF EXISTS "Owners can update membership status" ON memberships;
-- Also drop the basic one if we want to replace it comprehensively, but fine to keep "own" separate.
-- DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships; 

-- 3. Re-create "view" policy using the secure function
CREATE POLICY "Users can view memberships" ON memberships
  FOR SELECT USING (
    user_id = auth.uid() OR
    is_company_owner(company_id)
  );

-- 4. Re-create "update" policy using the secure function
CREATE POLICY "Owners can manage memberships" ON memberships
  FOR UPDATE USING (
    is_company_owner(company_id)
  );

-- 5. Ensure "delete" policy exists for owners too (good practice)
CREATE POLICY "Owners can delete memberships" ON memberships
  FOR DELETE USING (
    is_company_owner(company_id)
  );
inse