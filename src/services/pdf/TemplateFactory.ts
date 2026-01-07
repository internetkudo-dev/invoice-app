import { InvoiceData, TemplateType } from '../../types';
import {
    hidrotermTemplate,
} from './templates';


export const templateInfo: Record<TemplateType, { name: string; description: string }> = {
    hidroterm: {
        name: 'HidroTherm',
        description: 'Custom invoice template for Hidroterm',
    },
};

export const generateInvoiceHtml = (
    data: InvoiceData,
    template: TemplateType
): string => {
    // Only support hidroterm
    return hidrotermTemplate(data);
};
