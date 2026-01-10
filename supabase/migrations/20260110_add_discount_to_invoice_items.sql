-- Add discount column to invoice_items table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sku text;
