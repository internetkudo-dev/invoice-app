-- 1. Add 'pending' to invoice_status enum if it doesn't exist
-- Note: In PostgreSQL, you can't easily add a value to an enum inside a transaction in some versions, 
-- but this is generally fine in Supabase.
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'pending';

-- 2. Add missing columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'invoice';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtype TEXT DEFAULT 'regular';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_signature_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_received DECIMAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS change_amount DECIMAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paper_size TEXT DEFAULT 'A4';

-- Ensure we have types for better discovery
COMMENT ON COLUMN invoices.type IS 'Document type: invoice, offer, etc.';
COMMENT ON COLUMN invoices.subtype IS 'Sub-category: regular, delivery_note, order, pro_invoice, offer, etc.';
