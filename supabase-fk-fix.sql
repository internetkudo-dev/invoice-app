-- Fix Foreign Key Violation in Employees Table
-- ==============================================

-- 1. Identify and remove any employees with invalid company_ids
DELETE FROM employees
WHERE company_id IS NOT NULL 
AND company_id NOT IN (SELECT id FROM companies);

-- 2. Ensure the foreign key constraint exists and is correct
-- First, drop the constraint if it exists to be safe and avoid duplicates or improper naming
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_company_id_fkey;

-- 3. Re-add the foreign key constraint pointing to the companies table
ALTER TABLE employees
ADD CONSTRAINT employees_company_id_fkey
FOREIGN KEY (company_id) 
REFERENCES companies(id)
ON DELETE CASCADE;  -- Or SET NULL depending on desired behavior, CASCADE is common for strict hierarchy

-- 4. Check if there are any employees without a company_id if that column is supposed to be NOT NULL
-- (Based on previous schema it seems nullable, but we can double check logic usage)
-- If it should be mandatory for active employees:
-- UPDATE employees SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL; -- DANGEROUS AUTOMATION, better manually check.

-- 5. Fix potentially conflicting RLS that might cause "violation" errors if they behave like checks during insert
-- (If RLS prevents reading the company you are inserting into, it can sometimes look like a constraint violation in some setups, but unlikely for FK).

