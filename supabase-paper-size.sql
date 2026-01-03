-- Add paper_size column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paper_size TEXT DEFAULT 'A4';

-- Update memberships or profiles if needed (already handled by JSONB template_config usually, but good to be sure)
-- If we want to store it explicitly in profiles/companies too:
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_paper_size TEXT DEFAULT 'A4';
