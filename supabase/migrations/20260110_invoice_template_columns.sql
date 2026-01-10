-- Add new columns for invoice template settings
-- Column visibility configuration
ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS columns jsonb DEFAULT '[]';

-- Additional visibility options
ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS show_buyer_signature boolean DEFAULT true;
ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS show_stamp boolean DEFAULT true;
ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS show_qr_code boolean DEFAULT true;
ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS show_bank_details boolean DEFAULT true;
