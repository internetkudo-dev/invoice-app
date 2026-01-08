import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { InvoiceData, TemplateType } from '../../types';
import { generateInvoiceHtml } from './TemplateFactory';

export interface PdfResult {
    uri: string;
    success: boolean;
    error?: string;
}

/**
 * Generate a PDF from invoice data using the specified template
 */
export async function generatePdf(
    data: InvoiceData,
    template: TemplateType = 'hidroterm'
): Promise<PdfResult> {
    try {
        const html = generateInvoiceHtml(data, template);

        const { uri } = await Print.printToFileAsync({
            html,
            base64: false,
        });

        return { uri, success: true };
    } catch (error) {
        return {
            uri: '',
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate PDF',
        };
    }
}

/**
 * Share a PDF via the system share sheet (email, messages, etc.)
 */
export async function sharePdf(uri: string): Promise<boolean> {
    try {
        const isAvailable = await Sharing.isAvailableAsync();

        if (!isAvailable) {
            throw new Error('Sharing is not available on this device');
        }

        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Invoice',
            UTI: 'com.adobe.pdf',
        });

        return true;
    } catch (error) {
        console.error('Share error:', error);
        return false;
    }
}

/**
 * Print a PDF directly
 */
export async function printPdf(
    data: InvoiceData,
    template: TemplateType = 'hidroterm'
): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
    try {
        const html = generateInvoiceHtml(data, template);

        await Print.printAsync({
            html,
        });

        return { success: true };
    } catch (error: any) {
        // "Printing did not complete" usually means the user closed the print dialog
        if (error.message?.includes('Printing did not complete') || error.message?.includes('cancelled')) {
            return { success: false, canceled: true };
        }
        console.error('Print error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Preview PDF in browser (web only)
 */
export async function previewPdf(
    data: InvoiceData,
    template: TemplateType = 'hidroterm'
): Promise<void> {
    const html = generateInvoiceHtml(data, template);

    // For development/preview, just log the HTML
    console.log('Preview HTML generated');

    // In production, this would open a webview or browser
}
