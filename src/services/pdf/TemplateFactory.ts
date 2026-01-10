import { InvoiceData, TemplateType } from '../../types';
import {
    corporateTemplate,
} from './templates';


export const templateInfo: Record<TemplateType, { name: string; description: string }> = {
    corporate: {
        name: 'Corporate',
        description: 'Professional corporate invoice template with comprehensive field mapping',
    },
};

export const generateInvoiceHtml = (
    data: InvoiceData,
    template: TemplateType
): string => {
    // Only support corporate
    return corporateTemplate(data);
};
