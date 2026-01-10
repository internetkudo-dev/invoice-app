export interface Profile {
    id: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
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
    primary_color: string;
    is_grayscale: boolean;
    default_client_discount?: number;
    // New fields
    payment_link_stripe?: string;
    payment_link_paypal?: string;
    invoice_language?: string;
    terms_conditions?: string;
    biometric_enabled?: boolean;
    company_id?: string;
    active_company_id?: string;
    role?: 'owner' | 'admin' | 'worker';
    template_config?: TemplateConfig;
    smtp_host?: string;
    smtp_port?: number;
    smtp_user?: string;
    smtp_pass?: string;
    smtp_secure?: boolean;
    smtp_from_email?: string; // Optional: custom FROM address if different than user email
    // Stripe Connect OAuth fields
    stripe_access_token?: string;
    stripe_refresh_token?: string;
    stripe_account_id?: string;
    stripe_connected_at?: string;
    stripe_livemode?: boolean;
    stripe_last_synced?: string;
    updated_at: string;
}

export interface TemplateConfig {
    showLogo: boolean;
    showSignature: boolean;
    showBuyerSignature: boolean;
    showStamp: boolean;
    showQrCode: boolean;
    showNotes: boolean;
    showDiscount: boolean;
    showTax: boolean;
    showBankDetails: boolean;
    visibleColumns: {
        rowNumber: boolean;
        sku: boolean;
        description: boolean;
        quantity: boolean;
        unit: boolean;
        unitPrice: boolean;
        discount: boolean;
        taxRate: boolean;
        lineTotal: boolean;
        grossPrice: boolean;
    };
    labels: Record<string, string>;
    pageSize: 'A4' | 'A5' | 'Receipt';
    style?: TemplateType;
}


export interface Client {
    id: string;
    user_id: string;
    company_id?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zip_code?: string;
    country?: string;
    tax_id?: string;
    discount_percent?: number;
    discount_type?: 'percentage' | 'fixed';
    notes?: string;
    created_at: string;
}

export interface Product {
    id: string;
    user_id: string;
    company_id?: string;
    name: string;
    description?: string;
    sku?: string;
    barcode?: string;
    unit_price: number;
    tax_rate?: number;
    tax_included?: boolean;
    unit?: string;
    category?: string;
    // New fields
    stock_quantity?: number;
    track_stock?: boolean;
    low_stock_threshold?: number;
    created_at: string;
}

export type ExpenseCategory = string;

export interface Expense {
    id: string;
    user_id: string;
    company_id?: string;
    amount: number;
    category: ExpenseCategory;
    description?: string;
    date: string;
    receipt_url?: string;
    created_at: string;
    type?: 'expense' | 'income';
}

export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank' | 'card';

export interface Invoice {
    id: string;
    user_id: string;
    company_id?: string;
    client_id?: string;
    invoice_number: string;
    issue_date: string;
    due_date?: string;
    status: InvoiceStatus;
    type: 'invoice' | 'offer';
    buyer_signature_url?: string;
    discount_amount: number;
    discount_percent?: number;
    tax_amount: number;
    total_amount: number;
    notes?: string;
    template_id: string;
    // New fields
    recurring_interval?: 'monthly' | 'yearly';
    last_recurring_date?: string;
    payment_method?: PaymentMethod;
    amount_received?: number;
    change_amount?: number;
    paper_size?: 'A4' | 'A5' | 'Receipt';
    created_at: string;
    client?: Client;
    items?: InvoiceItem[];
}

export interface InvoiceItem {
    id: string;
    invoice_id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    discount?: number;
    amount: number;
    unit?: string;
    sku?: string;
}

export interface Payment {
    id: string;
    user_id: string;
    company_id?: string;
    client_id?: string;
    invoice_id?: string;
    payment_number: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    bank_reference?: string;
    notes?: string;
    created_at: string;
    client?: Client;
    invoice?: Invoice;
}

export interface Vendor {
    id: string;
    user_id: string;
    company_id?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zip_code?: string;
    country?: string;
    tax_id?: string;
    notes?: string;
    created_at: string;
}

export interface VendorPayment {
    id: string;
    user_id: string;
    company_id?: string;
    vendor_id?: string;
    payment_number: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    bank_reference?: string;
    description?: string;
    notes?: string;
    created_at: string;
    vendor?: Vendor;
}

export interface SupplierBill {
    id: string;
    user_id: string;
    company_id?: string;
    vendor_id: string;
    bill_number: string;
    issue_date: string;
    due_date?: string;
    total_amount: number;
    tax_amount: number;
    status: 'unpaid' | 'paid' | 'partial';
    notes?: string;
    document_url?: string;
    created_at: string;
    vendor?: Vendor;
    items?: SupplierBillItem[];
}

export interface SupplierBillItem {
    id: string;
    bill_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
}

export interface Contract {
    id: string;
    user_id: string;
    client_id?: string;
    title: string;
    status: 'draft' | 'signed' | 'active' | 'terminated';
    type: 'service_agreement' | 'nda' | 'employment' | 'general';
    content: Record<string, any>; // Stores answers/variables
    html_body?: string;
    signature_url?: string;
    counterparty_signature_url?: string;
    created_at: string;
    updated_at: string;
    client?: Client;
}

export interface ContractTemplateField {
    id: string;
    label: string;
    placeholder?: string;
    type: 'text' | 'number' | 'date' | 'textarea' | 'select';
    required?: boolean;
    options?: string[]; // for select type
}

export interface ContractTemplate {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    fields: ContractTemplateField[];
    created_at: string;
    updated_at: string;
}

export interface InvoiceData {
    company: {
        name: string;
        address: string;
        city?: string;
        country?: string;
        email?: string;
        phone?: string;
        website?: string;
        taxId?: string;
        businessId?: string;
        vatNumber?: string;
        logoUrl?: string;
        signatureUrl?: string;
        stampUrl?: string;
        bankName?: string;
        bankAccount?: string;
        bankIban?: string;
        bankSwift?: string;
        primaryColor?: string;
        isGrayscale?: boolean;
        paymentLinkStripe?: string;
        paymentLinkPaypal?: string;
    };
    client: {
        name: string;
        address: string;
        email: string;
        phone?: string;
        taxId?: string;
        nui?: string;
        fiscalNumber?: string;
        vatNumber?: string;
        deliveryName?: string;
        deliveryAddress?: string;
        deliveryContact?: string;
    };
    details: {
        number: string;
        issueDate: string;
        dueDate: string;
        currency: string;
        language?: string;
        notes?: string;
        terms?: string;
        buyerSignatureUrl?: string;
        type?: 'invoice' | 'offer';
        subtype?: string;
        showBuyerSignature?: boolean;
        paymentMethod?: PaymentMethod;
        amountReceived?: number;
        changeAmount?: number;
        // Kosovo invoice fields
        department?: string;
        reference?: string;
        yourReference?: string;
        paymentTerms?: string;
        amountInWords?: string;
        deliveryMethod?: string;
    };
    items: Array<{
        description: string;
        quantity: number;
        price: number;
        total: number;
        unit?: string;
        sku?: string;
        discount?: number;
        taxRate?: number;
    }>;
    summary: {
        subtotal: number;
        tax: number;
        discount: number;
        total: number;
        amountReceived?: number;
        changeAmount?: number;
        discountPercent?: number;
    };
    config?: TemplateConfig;
}

export type TemplateType = 'corporate';


export interface Company {
    id: string;
    company_name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
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
    payment_link_stripe?: string;
    payment_link_paypal?: string;
    invoice_language?: string;
    terms_conditions?: string;
    primary_color: string;
    is_grayscale: boolean;
    template_config?: TemplateConfig;
    created_at: string;
}

export interface Membership {
    id: string;
    user_id: string;
    company_id: string;
    role: 'owner' | 'admin' | 'worker';
    created_at: string;
    company?: Company;
}

export interface Compliance {
    id: string;
    company_id: string;
    title: string;
    description?: string;
    status: 'pending' | 'completed' | 'expired';
    due_date?: string;
    completed_at?: string;
    attachment_url?: string;
    created_at: string;
}
