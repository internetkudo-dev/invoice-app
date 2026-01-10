-- RPC to verify invite token and get company name securely (for anonymous users)
CREATE OR REPLACE FUNCTION verify_invite_token(token_input TEXT)
RETURNS TABLE (company_id UUID, company_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT id, name
    FROM companies
    WHERE invite_token = token_input;
END;
$$;
