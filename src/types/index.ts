// Profile (Company) Type
export interface Profile {
    id: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    logo_url?: string;
    signature_url?: string;
    stamp_url?: string;
    currency: string;
    tax_rate: number;
    tax_name: string;
    tax_id?: string;
    bank_name?: string;
    bank_account?: string;
    bank_iban?: string;
    bank_swift?: string;
    updated_at: string;
}

// Client Type
export interface Client {
    id: string;
    user_id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    discount_percent?: number;
    discount_type?: 'percentage' | 'fixed';
    notes?: string;
    created_at: string;
}

// Product Type
export interface Product {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    sku?: string;
    unit_price: number;
    tax_rate?: number;
    tax_included?: boolean;
    unit?: string;
    category?: string;
    created_at: string;
}

// Invoice Status
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

// Invoice Type
export interface Invoice {
    id: string;
    user_id: string;
    client_id?: string;
    invoice_number: string;
    issue_date: string;
    due_date?: string;
    status: InvoiceStatus;
    discount_amount: number;
    discount_percent?: number;
    tax_amount: number;
    total_amount: number;
    notes?: string;
    template_id: string;
    created_at: string;
    // Joined data
    client?: Client;
    items?: InvoiceItem[];
}

// Invoice Item Type
export interface InvoiceItem {
    id: string;
    invoice_id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    amount: number;
}

// Invoice Data for PDF Generation
export interface InvoiceData {
    company: {
        name: string;
        address: string;
        email?: string;
        phone?: string;
        website?: string;
        taxId?: string;
        logoUrl?: string;
        signatureUrl?: string;
        stampUrl?: string;
        bankName?: string;
        bankAccount?: string;
        bankIban?: string;
        bankSwift?: string;
    };
    client: {
        name: string;
        address: string;
        email: string;
    };
    details: {
        number: string;
        issueDate: string;
        dueDate: string;
        currency: string;
    };
    items: Array<{
        description: string;
        quantity: number;
        price: number;
        total: number;
    }>;
    summary: {
        subtotal: number;
        tax: number;
        discount: number;
        total: number;
    };
}

// Template Types
export type TemplateType = 'classic' | 'modern' | 'minimalist' | 'corporate' | 'creative';

// Dashboard Stats
export interface DashboardStats {
    totalRevenue: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    invoiceCount: number;
    clientCount: number;
    productCount: number;
    monthlyRevenue: { month: string; amount: number }[];
    recentInvoices: Invoice[];
    topClients: { name: string; total: number }[];
}
