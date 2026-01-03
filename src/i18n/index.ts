// Localization helpers and formatters

export const currencies: Record<string, { symbol: string; name: string; locale: string }> = {
    USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
    EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
    GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
    JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
    CAD: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
    AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
    CHF: { symbol: 'Fr', name: 'Swiss Franc', locale: 'de-CH' },
    CNY: { symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
    INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
};

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
    const currency = currencies[currencyCode] || currencies.USD;

    return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currencyCode,
    }).format(amount);
}

export function formatDate(dateString: string, locale: string = 'en-US'): string {
    return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatDateLong(dateString: string, locale: string = 'en-US'): string {
    return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

// Translation strings (extensible for multi-language support)
export const translations = {
    en: {
        dashboard: 'Dashboard',
        invoices: 'Invoices',
        clients: 'Clients',
        products: 'Products',
        settings: 'Settings',
        signIn: 'Sign In',
        signUp: 'Sign Up',
        signOut: 'Sign Out',
        create: 'Create',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',
        totalRevenue: 'Total Revenue',
        pending: 'Pending',
        paid: 'Paid',
        overdue: 'Overdue',
        draft: 'Draft',
        sent: 'Sent',
        noInvoices: 'No invoices yet',
        noClients: 'No clients yet',
        noProducts: 'No products yet',
        generatePdf: 'Generate PDF',
        share: 'Share',
        print: 'Print',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        systemTheme: 'System',
        currency: 'Currency',
        taxRate: 'Tax Rate',
        companyProfile: 'Company Profile',
    },
};

export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, locale: string = 'en'): string {
    const lang = translations[locale as keyof typeof translations] || translations.en;
    return lang[key] || key;
}
