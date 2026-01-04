-- ==============================================
-- Payments Table for Pagesë Hyrëse (Incoming Payment / Receipt)
-- ==============================================
-- Run this SQL in your Supabase SQL Editor

-- Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID,
  client_id UUID REFERENCES clients ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices ON DELETE SET NULL,
  payment_number TEXT NOT NULL,
  amount DECIMAL NOT NULL DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash', -- 'cash' | 'bank' | 'card'
  bank_reference TEXT, -- For bank transfers
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Shared access via company_id
CREATE POLICY "Company shared payments" ON payments
  FOR ALL USING (
    auth.uid() = user_id OR 
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS payments_client_id_idx ON payments(client_id);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_payment_date_idx ON payments(payment_date);
