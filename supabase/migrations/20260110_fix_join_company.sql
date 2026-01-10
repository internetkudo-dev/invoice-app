-- Fix join_company function for team joining
-- First ensure profile has the needed columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Recreate the join_company function
CREATE OR REPLACE FUNCTION join_company(token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_company_id UUID;
    target_company_name TEXT;
    new_employee_id UUID;
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Find company by token
    SELECT id, name INTO target_company_id, target_company_name 
    FROM companies WHERE invite_token = token;
    
    IF target_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation token');
    END IF;

    -- Check if already a member
    IF EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND company_id = target_company_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are already a member of this team');
    END IF;

    -- Get user info from profiles
    SELECT 
        COALESCE(email, ''),
        COALESCE(first_name, company_name, 'User')
    INTO user_email, user_name
    FROM profiles 
    WHERE id = auth.uid();

    -- Create employee record with pending status
    INSERT INTO employees (
        company_id, user_id, first_name, last_name, email, role, status
    )
    VALUES (
        target_company_id, 
        auth.uid(), 
        COALESCE(user_name, 'New'),
        'Employee',
        user_email,
        'employee',
        'pending'
    )
    RETURNING id INTO new_employee_id;

    -- Create membership record with pending status (for RBAC)
    INSERT INTO memberships (
        company_id, user_id, role, status
    )
    VALUES (
        target_company_id,
        auth.uid(),
        'employee',
        'pending'
    )
    ON CONFLICT (company_id, user_id) DO NOTHING;

    -- Update profiles to link to company
    UPDATE profiles 
    SET company_id = target_company_id,
        active_company_id = target_company_id
    WHERE id = auth.uid() AND company_id IS NULL;

    RETURN jsonb_build_object(
        'success', true, 
        'company_id', target_company_id, 
        'company_name', target_company_name,
        'employee_id', new_employee_id,
        'message', 'Your request to join ' || target_company_name || ' has been sent!'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
