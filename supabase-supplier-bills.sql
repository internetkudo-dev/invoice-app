-- ==============================================
-- Supplier Bills (Purchases) Tables
-- ==============================================

-- 1. Create Supplier Bills Table
CREATE TABLE IF NOT EXISTS supplier_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID,
  vendor_id UUID REFERENCES vendors ON DELETE CASCADE NOT NULL,
  bill_number TEXT NOT NULL, -- The invoice number from the supplier
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  total_amount DECIMAL NOT NULL DEFAULT 0,
  tax_amount DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid', 'partial'
  notes TEXT,
  document_url TEXT, -- Link to a scan/photo of the bill
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Supplier Bill Items Table
CREATE TABLE IF NOT EXISTS supplier_bill_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES supplier_bills ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL NOT NULL DEFAULT 1,
  unit_price DECIMAL NOT NULL DEFAULT 0,
  amount DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE supplier_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bill_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company shared supplier bills" ON supplier_bills
  FOR ALL USING (
    auth.uid() = user_id OR 
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Company shared supplier bill items" ON supplier_bill_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM supplier_bills 
      WHERE supplier_bills.id = bill_id AND 
      (supplier_bills.user_id = auth.uid() OR supplier_bills.company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS supplier_bills_vendor_id_idx ON supplier_bills(vendor_id);
CREATE INDEX IF NOT EXISTS supplier_bills_issue_date_idx ON supplier_bills(issue_date);
CREATE INDEX IF NOT EXISTS supplier_bill_items_bill_id_idx ON supplier_bill_items(bill_id);
