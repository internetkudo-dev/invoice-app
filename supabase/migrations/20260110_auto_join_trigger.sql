-- Trigger function to handle invite token automatically upon profile creation
CREATE OR REPLACE FUNCTION process_new_user_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    token_val text;
    target_comp_id uuid;
BEGIN
    -- Get invite_token from auth.users metadata
    SELECT raw_user_meta_data->>'invite_token' INTO token_val
    FROM auth.users
    WHERE id = NEW.id;

    IF token_val IS NOT NULL AND length(token_val) > 0 THEN
        -- Find company by token
        SELECT id INTO target_comp_id FROM public.companies WHERE invite_token = token_val;
        
        IF target_comp_id IS NOT NULL THEN
             -- Insert Employee Record (Pending)
             INSERT INTO public.employees (company_id, user_id, first_name, last_name, email, role, status)
             VALUES (
                 target_comp_id, 
                 NEW.id, 
                 COALESCE(NEW.first_name, 'New'), 
                 COALESCE(NEW.last_name, 'User'), 
                 NEW.email, 
                 'employee', 
                 'pending'
             );

             -- Insert Membership Record (Pending)
             INSERT INTO public.memberships (company_id, user_id, role, status)
             VALUES (target_comp_id, NEW.id, 'employee', 'pending')
             ON CONFLICT (company_id, user_id) DO NOTHING;

             -- Update Profile to link to company
             UPDATE public.profiles 
             SET company_id = target_comp_id, 
                 active_company_id = target_comp_id
             WHERE id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create Trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_check_invite ON public.profiles;
CREATE TRIGGER on_profile_created_check_invite
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION process_new_user_invite();
