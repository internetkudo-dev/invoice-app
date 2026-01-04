-- ==============================================
-- Vendors & Vendor Payments Tables
-- ==============================================
-- Run this SQL in your Supabase SQL Editor

-- 1. Create Vendors Table (Suppliers)
CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  zip_code TEXT,
  country TEXT,
  tax_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Vendor Payments Table (Outgoing payments to vendors)
CREATE TABLE IF NOT EXISTS vendor_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID,
  vendor_id UUID REFERENCES vendors ON DELETE SET NULL,
  payment_number TEXT NOT NULL,
  amount DECIMAL NOT NULL DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'bank', -- 'cash' | 'bank' | 'card'
  bank_reference TEXT, -- For bank transfers
  description TEXT, -- e.g., "Fatura e Hyrjes #502"
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Shared access via company_id
CREATE POLICY "Company shared vendors" ON vendors
  FOR ALL USING (
    auth.uid() = user_id OR 
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Company shared vendor payments" ON vendor_payments
  FOR ALL USING (
    auth.uid() = user_id OR 
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS vendors_user_id_idx ON vendors(user_id);
CREATE INDEX IF NOT EXISTS vendors_company_id_idx ON vendors(company_id);
CREATE INDEX IF NOT EXISTS vendor_payments_vendor_id_idx ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS vendor_payments_payment_date_idx ON vendor_payments(payment_date);
