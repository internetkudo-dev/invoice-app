-- Add missing columns to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS zip_code text;
