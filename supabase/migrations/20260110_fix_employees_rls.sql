-- Ensure users can read their own employee record to check status
-- First drop to avoid conflict
DROP POLICY IF EXISTS "Users can view own profile" ON employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;

-- Create permissive policy for self
CREATE POLICY "Users can view own employee record"
ON employees FOR SELECT
USING (auth.uid() = user_id);

-- Also ensure memberships are readable
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
CREATE POLICY "Users can view own memberships"
ON memberships FOR SELECT
USING (auth.uid() = user_id);
