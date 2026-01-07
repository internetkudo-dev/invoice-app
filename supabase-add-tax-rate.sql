DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'tax_rate') THEN 
        ALTER TABLE invoice_items ADD COLUMN tax_rate numeric DEFAULT 0; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'unit') THEN 
        ALTER TABLE invoice_items ADD COLUMN unit text DEFAULT 'pcs'; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'city') THEN 
        ALTER TABLE companies ADD COLUMN city text; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'country') THEN 
        ALTER TABLE companies ADD COLUMN country text DEFAULT 'Kosovo'; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'website') THEN 
        ALTER TABLE companies ADD COLUMN website text; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'bank_name') THEN 
        ALTER TABLE companies ADD COLUMN bank_name text; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'bank_iban') THEN 
        ALTER TABLE companies ADD COLUMN bank_iban text; 
    END IF;

    -- Add tax_rate to products table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tax_rate') THEN 
        ALTER TABLE products ADD COLUMN tax_rate numeric DEFAULT 18; 
    END IF;

    -- Add tax_included to products table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tax_included') THEN 
        ALTER TABLE products ADD COLUMN tax_included boolean DEFAULT false; 
    END IF;
END $$;
