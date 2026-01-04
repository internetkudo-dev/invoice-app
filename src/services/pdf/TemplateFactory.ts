import { InvoiceData, TemplateType } from '../../types';
import {
    classicTemplate,
    modernTemplate,
    minimalistTemplate,
    corporateTemplate,
    creativeTemplate,
    receiptTemplate,
    kosovoTemplate,
} from './templates';

export const templateInfo: Record<TemplateType, { name: string; description: string }> = {
    classic: {
        name: 'Classic',
        description: 'Traditional business style with serif fonts',
    },
    modern: {
        name: 'Modern',
        description: 'Clean design with gradient accents',
    },
    minimalist: {
        name: 'Minimalist',
        description: 'Ultra-clean with generous whitespace',
    },
    corporate: {
        name: 'Corporate',
        description: 'Professional with dark header',
    },
    creative: {
        name: 'Creative',
        description: 'Bold colors and unique layout',
    },
    receipt: {
        name: 'Receipt',
        description: '80mm Thermal printer optimized format',
    },
    kosovo: {
        name: 'Kosovo',
        description: 'Kosovo/Albanian commercial invoice with full details',
    },
};

export const generateInvoiceHtml = (
    data: InvoiceData,
    template: TemplateType
): string => {
    switch (template) {
        case 'modern':
            return modernTemplate(data);
        case 'minimalist':
            return minimalistTemplate(data);
        case 'corporate':
            return corporateTemplate(data);
        case 'creative':
            return creativeTemplate(data);
        case 'receipt':
            return receiptTemplate(data);
        case 'kosovo':
            return kosovoTemplate(data);
        case 'classic':
        default:
            return classicTemplate(data);
    }
};
