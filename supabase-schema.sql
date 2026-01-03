-- ==============================================
-- Invoice Management System - Supabase SQL Schema
-- ==============================================
-- Run this SQL in your Supabase SQL Editor

-- 1. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Invoice Status Enum
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status invoice_status DEFAULT 'draft',
  discount_amount DECIMAL DEFAULT 0,
  tax_amount DECIMAL DEFAULT 0,
  total_amount DECIMAL DEFAULT 0,
  notes TEXT,
  template_id TEXT DEFAULT 'classic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL NOT NULL DEFAULT 1,
  unit_price DECIMAL NOT NULL DEFAULT 0,
  amount DECIMAL NOT NULL DEFAULT 0
);

-- ==============================================
-- Enable Row Level Security (RLS)
-- ==============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS Policies
-- ==============================================

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Clients: Users can only access their own clients
CREATE POLICY "Users can manage own clients" ON clients
  FOR ALL USING (auth.uid() = user_id);

-- Products: Users can only access their own products
CREATE POLICY "Users can manage own products" ON products
  FOR ALL USING (auth.uid() = user_id);

-- Invoices: Users can only access their own invoices
CREATE POLICY "Users can manage own invoices" ON invoices
  FOR ALL USING (auth.uid() = user_id);

-- Invoice Items: Users can access items of their own invoices
CREATE POLICY "Users can manage own invoice items" ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- ==============================================
-- Auto-create Profile on User Signup
-- ==============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- Storage Buckets (Create via Supabase Dashboard)
-- ==============================================
-- Create these buckets in your Supabase Storage:
-- 1. logos (public)
-- 2. signatures (private)
-- 3. stamps (private)
