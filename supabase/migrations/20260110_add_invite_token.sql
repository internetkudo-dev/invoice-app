-- Add invite_token column to companies if not exists
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_token TEXT DEFAULT substring(md5(random()::text) from 0 for 12);

-- Function to generate/reset token
CREATE OR REPLACE FUNCTION generate_company_invite_token(company_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_token TEXT;
BEGIN
    -- Check if user is owner or admin of the company
    IF NOT EXISTS (
        SELECT 1 FROM memberships 
        WHERE user_id = auth.uid() 
        AND company_id = company_uuid 
        AND role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Not authorized to generate invite token';
    END IF;

    -- Generate a simple 8-char alphanumeric token
    -- Note: using substring of md5 is simple, but for user typing, maybe simple random chars is better. 
    -- Let's stick to alphanumeric for compatibility.
    new_token := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

    UPDATE companies 
    SET invite_token = new_token 
    WHERE id = company_uuid;

    RETURN new_token;
END;
$$;
