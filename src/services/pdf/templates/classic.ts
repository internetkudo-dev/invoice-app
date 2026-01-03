import { InvoiceData } from '../../../types';
import { pdfTranslations } from '../translations';

export function classicTemplate(data: InvoiceData): string {
  const primaryColor = data.company.primaryColor || '#1f2937';
  const isGrayscale = data.company.isGrayscale;
  const lang = data.details.language || 'en';
  const t = pdfTranslations[lang] || pdfTranslations.en;
  const config = data.config || {
    showLogo: true,
    showSignature: true,
    showStamp: true,
    visibleColumns: { sku: false, unit: true, tax: false, quantity: true, price: true },
    labels: {},
    pageSize: 'A4'
  };

  const pageSize = config.pageSize || 'A4';
  const isA5 = pageSize === 'A5';

  const getLabel = (key: string, defaultValue: string) => {
    return ((config.labels as any) && (config.labels as any)[key]) ? (config.labels as any)[key] : defaultValue;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(lang === 'sq' ? 'sq-AL' : lang === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: data.details.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity} ${config.visibleColumns.unit ? (item.unit || '') : ''}</td>
        ${config.visibleColumns.price ? `<td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.price)}</td>` : ''}
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
    `
    )
    .join('');

  const qrData = encodeURIComponent(`INVOICE:${data.details.number}`);
  const qrColor = isGrayscale ? '000000' : primaryColor.replace('#', '');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}&color=${qrColor}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { size: ${pageSize}; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: ${isA5 ? '9px' : '11px'};
      color: #1f2937;
      background: #fff;
      width: ${isA5 ? '148mm' : '210mm'};
      padding: ${isA5 ? '10mm' : '15mm'};
      ${isGrayscale ? 'filter: grayscale(100%);' : ''}
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 10px;
    }
    .company-info h1 {
      font-size: ${isA5 ? '18px' : '22px'};
      color: ${primaryColor};
      margin-bottom: 6px;
    }
    .company-info p {
      color: #6b7280;
      line-height: 1.4;
      font-size: 9px;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      font-size: ${isA5 ? '20px' : '28px'};
      color: ${primaryColor};
      letter-spacing: 2px;
      margin-bottom: 6px;
    }
    .invoice-number {
      font-size: ${isA5 ? '12px' : '14px'};
      font-weight: bold;
      color: #fff;
      background: ${primaryColor};
      padding: 4px 10px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 6px;
    }
    .qr-code img { width: ${isA5 ? '60px' : '80px'}; height: ${isA5 ? '60px' : '80px'}; }
    .details-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .bill-to, .invoice-details {
      width: 48%;
    }
    .bill-to h3, .invoice-details h3 {
      font-size: 9px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .bill-to p, .invoice-details p {
      line-height: 1.6;
      font-size: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: ${primaryColor};
      color: #fff;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
    }
    th:nth-child(2) { text-align: center; }
    td { font-size: 9px; }
    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .extra-info {
        flex: 1;
        margin-right: 20px;
    }
    .pay-button { 
        display: inline-block; 
        padding: 6px 12px; 
        border-radius: 4px; 
        text-decoration: none; 
        font-weight: bold; 
        font-size: 10px; 
        margin-right: 8px;
        margin-bottom: 8px;
        color: white;
    }
    .stripe-btn { background: #635bff; }
    .paypal-btn { background: #0070ba; }
    .summary-table {
      width: ${isA5 ? '160px' : '220px'};
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10px;
    }
    .summary-row.total {
      font-size: ${isA5 ? '12px' : '14px'};
      font-weight: bold;
      border-bottom: none;
      border-top: 2px solid ${primaryColor};
      padding-top: 10px;
      color: ${primaryColor};
    }
    .bank-info {
      background: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid ${primaryColor};
    }
    .bank-info h3 { font-size: 10px; color: ${primaryColor}; margin-bottom: 8px; }
    .bank-info p { color: #4b5563; line-height: 1.6; font-size: 9px; }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }
    .signature-section { text-align: center; }
    .signature-section img { max-height: ${isA5 ? '35px' : '50px'}; margin-bottom: 6px; }
    .signature-line { width: 140px; border-top: 1px solid ${primaryColor}; margin-top: 6px; padding-top: 4px; font-size: 9px; color: #6b7280; }
    .stamp-section img { max-height: ${isA5 ? '40px' : '60px'}; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      ${(config.showLogo && data.company.logoUrl) ? `<img src="${data.company.logoUrl}" alt="Logo" style="max-height: ${isA5 ? '35px' : '50px'}; margin-bottom: 6px;">` : ''}
      <h1>${data.company.name}</h1>
      <p>${data.company.address}</p>
      ${data.company.phone ? `<p>Tel: ${data.company.phone}</p>` : ''}
      ${data.company.email ? `<p>Email: ${data.company.email}</p>` : ''}
    </div>
    <div class="invoice-title">
      <h2>${getLabel('invoice', t.invoice)}</h2>
      <div class="invoice-number">${data.details.number}</div>
      <div class="qr-code">
        <img src="${qrCodeUrl}" alt="QR Code">
      </div>
    </div>
  </div>

  <div class="details-section">
    <div class="bill-to">
      <h3>${getLabel('billTo', t.billTo)}</h3>
      <p><strong>${data.client.name}</strong></p>
      <p>${data.client.address}</p>
      <p>${data.client.email}</p>
    </div>
    <div class="invoice-details">
      <h3>${t.details}</h3>
      <p><strong>${getLabel('date', t.date)}:</strong> ${data.details.issueDate}</p>
      <p><strong>${getLabel('due', t.due)}:</strong> ${data.details.dueDate || 'On Receipt'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${getLabel('item', t.description)}</th>
        <th style="text-align: center;">${getLabel('quantity', t.qty)}</th>
        ${config.visibleColumns.price ? `<th style="text-align: right;">${getLabel('price', t.price)}</th>` : ''}
        <th style="text-align: right;">${getLabel('total', t.total)}</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="summary-section">
    <div class="extra-info">
        ${(data.company.paymentLinkStripe || data.company.paymentLinkPaypal) ? `
            <div style="margin-bottom: 15px;">
                <h4 style="font-size: 9px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px;">${t.payNow}</h4>
                ${data.company.paymentLinkStripe ? `<a href="${data.company.paymentLinkStripe}" class="pay-button stripe-btn">Stripe Pay</a>` : ''}
                ${data.company.paymentLinkPaypal ? `<a href="${data.company.paymentLinkPaypal}" class="pay-button paypal-btn">PayPal.me</a>` : ''}
            </div>
        ` : ''}
        
        ${data.details.notes ? `
            <div style="margin-bottom: 10px;">
                <h4 style="font-size: 9px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">${getLabel('notes', 'Notes')}</h4>
                <p style="font-size: 9px; color: #4b5563;">${data.details.notes}</p>
            </div>
        ` : ''}

        ${data.details.terms ? `
            <div>
                <h4 style="font-size: 9px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">${getLabel('terms', t.terms)}</h4>
                <p style="font-size: 9px; color: #4b5563;">${data.details.terms}</p>
            </div>
        ` : ''}
    </div>

    <div class="summary-table">
      <div class="summary-row">
        <span>${getLabel('subtotal', t.subtotal)}</span>
        <span>${formatCurrency(data.summary.subtotal)}</span>
      </div>
      <div class="summary-row">
        <span>${getLabel('tax', t.tax)}</span>
        <span>${formatCurrency(data.summary.tax)}</span>
      </div>
      ${data.summary.discount > 0 ? `
      <div class="summary-row">
        <span>${getLabel('discount', t.discount)}</span>
        <span>-${formatCurrency(data.summary.discount)}</span>
      </div>
      ` : ''}
      <div class="summary-row total">
        <span>${getLabel('totalDue', t.totalDue)}</span>
        <span>${formatCurrency(data.summary.total)}</span>
      </div>
    </div>
  </div>

  ${data.company.bankName || data.company.bankIban ? `
  <div class="bank-info">
    <h3>${t.payment}</h3>
    ${data.company.bankName ? `<p><strong>${t.bank}:</strong> ${data.company.bankName}</p>` : ''}
    ${data.company.bankAccount ? `<p><strong>${t.account}:</strong> ${data.company.bankAccount}</p>` : ''}
    ${data.company.bankIban ? `<p><strong>${t.iban}:</strong> ${data.company.bankIban}</p>` : ''}
  </div>
  ` : ''}

  <div class="footer">
    <div class="signature-section">
      ${(config.showSignature && data.company.signatureUrl) ? `<img src="${data.company.signatureUrl}" alt="Signature">` : ''}
      <div class="signature-line">${t.signature} (Seller)</div>
    </div>
    
    ${data.details.buyerSignatureUrl ? `
    <div class="signature-section">
      <img src="${data.details.buyerSignatureUrl}" alt="Buyer Signature">
      <div class="signature-line">Buyer Signature</div>
    </div>
    ` : ''}

    <div class="stamp-section">
      ${(config.showStamp && data.company.stampUrl) ? `<img src="${data.company.stampUrl}" alt="Company Stamp">` : ''}
    </div>
  </div>
</body>
</html>
  `;
}
