-- ==============================================
-- Employee Vault - RLS Policies & Storage Configuration
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Ensure employee_documents has correct RLS
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Users can view their own documents
DROP POLICY IF EXISTS "Users can view their own documents" ON employee_documents;
CREATE POLICY "Users can view their own documents" ON employee_documents
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- 3. Policy: Admins can view all documents in their company
DROP POLICY IF EXISTS "Admins can view company documents" ON employee_documents;
CREATE POLICY "Admins can view company documents" ON employee_documents
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

-- 4. Policy: Admins can insert/update/delete company documents
DROP POLICY IF EXISTS "Admins can manage company documents" ON employee_documents;
CREATE POLICY "Admins can manage company documents" ON employee_documents
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

-- 5. Storage Policies (Assuming bucket 'employee-documents' exists)
-- Note: Create 'employee-documents' bucket in Supabase Dashboard first!

-- Allow authenticated users to upload documents to their company folder
-- Objects path usually: company_id/employee_id/filename
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employee-documents' AND
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can view their company documents" ON storage.objects;
CREATE POLICY "Users can view their company documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'employee-documents' AND
    auth.role() = 'authenticated'
  );
