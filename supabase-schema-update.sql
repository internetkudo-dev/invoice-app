-- ==============================================
-- Schema Update: Add Default Client Discount
-- ==============================================

-- Add default_client_discount to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS default_client_discount NUMERIC DEFAULT 0;

-- Comment on column
COMMENT ON COLUMN profiles.default_client_discount IS 'Default discount percentage to apply for new invoices';
