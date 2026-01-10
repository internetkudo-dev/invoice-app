-- Create compliances table
CREATE TABLE IF NOT EXISTS compliances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'expired')) DEFAULT 'pending',
    due_date DATE,
    completed_at DATE,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE compliances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view compliances for their company" ON compliances
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
        OR
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert compliances for their company" ON compliances
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
        OR
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update compliances for their company" ON compliances
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
        OR
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete compliances for their company" ON compliances
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
        OR
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );
