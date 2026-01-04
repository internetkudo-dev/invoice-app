-- ==============================================
-- Expenses Table (Receipts)
-- ==============================================
-- Run this SQL in your Supabase SQL Editor

-- 1. Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID,
  vendor_name TEXT, -- Not a foreign key, just the name found on receipt
  category TEXT, -- e.g. "Office", "Travel", "Meals"
  description TEXT,
  amount DECIMAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  date DATE DEFAULT CURRENT_DATE,
  image_url TEXT, -- Path to stored receipt image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Shared access via company_id
DROP POLICY IF EXISTS "Company shared expenses" ON expenses;
CREATE POLICY "Company shared expenses" ON expenses
  FOR ALL USING (
    auth.uid() = user_id OR 
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_company_id_idx ON expenses(company_id);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses(category);
