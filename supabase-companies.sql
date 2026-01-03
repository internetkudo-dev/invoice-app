-- ==============================================
-- Multi-Company Support - Additional Schema
-- ==============================================

-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
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
  template_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Memberships Table
CREATE TABLE IF NOT EXISTS memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'worker', -- 'owner', 'admin', 'worker'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- 3. Update Profiles Table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_company_id UUID REFERENCES companies(id);

-- 4. Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Companies
CREATE POLICY "Users can view companies they are members of" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.company_id = companies.id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their companies" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.company_id = companies.id
      AND memberships.user_id = auth.uid()
      AND memberships.role = 'owner'
    )
  );

-- 6. RLS Policies for Memberships
CREATE POLICY "Users can view their own memberships" ON memberships
  FOR SELECT USING (user_id = auth.uid());

-- 7. Migrate existing users' company data from profiles to companies table
DO $$
DECLARE
    profile_rec RECORD;
    new_company_id UUID;
BEGIN
    FOR profile_rec IN SELECT * FROM profiles LOOP
        -- Only migrate if they don't have a company already
        IF NOT EXISTS (SELECT 1 FROM memberships WHERE user_id = profile_rec.id) THEN
            -- Create company
            INSERT INTO companies (
                company_name, email, phone, address, website, logo_url, signature_url, stamp_url, 
                currency, tax_rate, tax_name, tax_id, bank_name, bank_account, bank_iban, bank_swift,
                payment_link_stripe, payment_link_paypal, invoice_language, terms_conditions,
                primary_color, is_grayscale, template_config
            ) VALUES (
                COALESCE(profile_rec.company_name, 'My Company'), profile_rec.email, profile_rec.phone, profile_rec.address, 
                profile_rec.website, profile_rec.logo_url, profile_rec.signature_url, profile_rec.stamp_url,
                profile_rec.currency, profile_rec.tax_rate, profile_rec.tax_name, profile_rec.tax_id,
                profile_rec.bank_name, profile_rec.bank_account, profile_rec.bank_iban, profile_rec.bank_swift,
                profile_rec.payment_link_stripe, profile_rec.payment_link_paypal, profile_rec.invoice_language, 
                profile_rec.terms_conditions, profile_rec.primary_color, profile_rec.is_grayscale, profile_rec.template_config
            ) RETURNING id INTO new_company_id;

            -- Create membership
            INSERT INTO memberships (user_id, company_id, role)
            VALUES (profile_rec.id, new_company_id, 'owner');

            -- Set active company
            UPDATE profiles SET active_company_id = new_company_id WHERE id = profile_rec.id;
        END IF;
    END LOOP;
END $$;

-- 8. Update data RLS policies to use memberships (example for invoices)
DROP POLICY IF EXISTS "Company shared invoices" ON invoices;
CREATE POLICY "Company shared invoices" ON invoices
  FOR ALL USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid()) OR
    user_id = auth.uid()
  );

-- Repeat for others if needed, but the original policy was already using profiles.company_id
-- We should keep the original policies but ensure they reference the new logic if needed.
-- Actually the original policies were:
-- company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
-- We can update handle_new_user to also create a company.
