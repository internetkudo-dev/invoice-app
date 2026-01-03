-- ==============================================
-- Invoice Management System - Supabase SQL Schema
-- ==============================================
-- Run this SQL in your Supabase SQL Editor

-- 1. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  company_id UUID,
  role TEXT DEFAULT 'owner',
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  logo_url TEXT,
  signature_url TEXT,
  stamp_url TEXT,
  currency TEXT DEFAULT 'USD',
  tax_rate DECIMAL DEFAULT 0,
  tax_name TEXT DEFAULT 'VAT',
  tax_id TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_iban TEXT,
  bank_swift TEXT,
  payment_link_stripe TEXT,
  payment_link_paypal TEXT,
  invoice_language TEXT DEFAULT 'en',
  terms_conditions TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  is_grayscale BOOLEAN DEFAULT false,
  biometric_enabled BOOLEAN DEFAULT false,
  template_config JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Clients Table
CREATE TABLE IF NOT EXISTS clients (
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
  discount_percent DECIMAL DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  barcode TEXT,
  unit_price DECIMAL NOT NULL DEFAULT 0,
  tax_rate DECIMAL DEFAULT 0,
  tax_included BOOLEAN DEFAULT false,
  unit TEXT DEFAULT 'pcs',
  category TEXT,
  stock_quantity DECIMAL DEFAULT 0,
  track_stock BOOLEAN DEFAULT false,
  low_stock_threshold DECIMAL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID,
  amount DECIMAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Invoice Status Enum
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID,
  client_id UUID REFERENCES clients ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status invoice_status DEFAULT 'draft',
  discount_amount DECIMAL DEFAULT 0,
  discount_percent DECIMAL DEFAULT 0,
  tax_amount DECIMAL DEFAULT 0,
  total_amount DECIMAL DEFAULT 0,
  notes TEXT,
  template_id TEXT DEFAULT 'classic',
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT,
  last_recurring_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL NOT NULL DEFAULT 1,
  unit_price DECIMAL NOT NULL DEFAULT 0,
  tax_rate DECIMAL DEFAULT 0,
  amount DECIMAL NOT NULL DEFAULT 0,
  unit TEXT
);

-- ==============================================
-- Enable Row Level Security (RLS)
-- ==============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS Policies (Updated for Collaboration)
-- ==============================================

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Clients: Shared access via company_id
CREATE POLICY "Company shared clients" ON clients
  FOR ALL USING (
    auth.uid() = user_id OR 
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Products: Shared access via company_id
CREATE POLICY "Company shared products" ON products
  FOR ALL USING (
    auth.uid() = user_id OR 
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Expenses: Shared access via company_id
CREATE POLICY "Company shared expenses" ON expenses
  FOR ALL USING (
    auth.uid() = user_id OR 
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Invoices: Shared access via company_id
CREATE POLICY "Company shared invoices" ON invoices
  FOR ALL USING (
    auth.uid() = user_id OR 
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Invoice Items: Access via invoice shared policy
CREATE POLICY "Company shared invoice items" ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        invoices.user_id = auth.uid() OR 
        invoices.company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
      )
    )
  );

-- ==============================================
-- Auto-create Profile on User Signup
-- ==============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, company_id)
  VALUES (NEW.id, NEW.email, NEW.id); -- Default company_id to user id
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
