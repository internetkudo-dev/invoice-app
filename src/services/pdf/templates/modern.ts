import { InvoiceData } from '../../../types';
import { pdfTranslations } from '../translations';

export function modernTemplate(data: InvoiceData): string {
  const primaryColor = data.company.primaryColor || '#6366f1';
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
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity} ${config.visibleColumns.unit ? (item.unit || '') : ''}</td>
        ${config.visibleColumns.price ? `<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.price)}</td>` : ''}
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
      </tr>
    `
    )
    .join('');

  const qrData = encodeURIComponent(`INVOICE:${data.details.number}`);
  const qrColor = isGrayscale ? '000000' : primaryColor.replace('#', '');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrData}&color=${qrColor}`;

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
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: ${isA5 ? '9px' : '11px'};
      color: #334155;
      background: #fff;
      width: ${isA5 ? '148mm' : '210mm'};
      ${isGrayscale ? 'filter: grayscale(100%);' : ''}
    }
    .gradient-header {
      background: ${isGrayscale ? '#000' : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`};
      color: white;
      padding: ${isA5 ? '15px 20px' : '30px'};
      border-radius: 0 0 20px 20px;
    }
    .header-content { display: flex; justify-content: space-between; align-items: flex-start; }
    .company-section h1 { font-size: ${isA5 ? '16px' : '22px'}; font-weight: 700; margin-bottom: 4px; }
    .company-section p { opacity: 0.9; line-height: 1.4; font-size: ${isA5 ? '8px' : '10px'}; }
    .invoice-badge { text-align: right; }
    .invoice-badge h2 { font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
    .invoice-number { font-size: ${isA5 ? '14px' : '18px'}; font-weight: 700; background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 8px; display: inline-block; margin-bottom: 8px; }
    .qr-code { background: white; padding: 4px; border-radius: 6px; display: inline-block; }
    .qr-code img { width: ${isA5 ? '50px' : '80px'}; height: ${isA5 ? '50px' : '80px'}; }
    .content { padding: ${isA5 ? '15px 20px' : '30px'}; }
    .details-grid { display: flex; gap: 15px; margin-bottom: 20px; }
    .detail-box { flex: 1; background: #f8fafc; padding: ${isA5 ? '12px' : '20px'}; border-radius: 12px; }
    .detail-box h3 { font-size: 8px; text-transform: uppercase; color: ${primaryColor}; margin-bottom: 8px; letter-spacing: 1px; }
    .detail-box p { line-height: 1.5; color: #475569; font-size: ${isA5 ? '9px' : '10px'}; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    th { background: ${isGrayscale ? '#1e293b' : primaryColor}; color: white; padding: 10px 12px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
    th:nth-child(2) { text-align: center; }
    ${config.visibleColumns.price ? 'th:nth-child(3), th:nth-child(4) { text-align: right; }' : 'th:nth-child(3) { text-align: right; }'}
    td { font-size: ${isA5 ? '9px' : '10px'}; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .summary-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .payment-links { flex: 1; margin-right: 20px; }
    .pay-button { 
        display: inline-block; 
        padding: 8px 16px; 
        border-radius: 8px; 
        text-decoration: none; 
        font-weight: 700; 
        font-size: 11px; 
        margin-right: 8px;
        margin-bottom: 10px;
        color: white;
    }
    .stripe-btn { background: #635bff; }
    .paypal-btn { background: #0070ba; }
    .summary-box { width: ${isA5 ? '180px' : '240px'}; background: #f8fafc; padding: 15px; border-radius: 12px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: ${isA5 ? '10px' : '12px'}; }
    .summary-row.total { border: none; padding-top: 10px; font-size: ${isA5 ? '14px' : '18px'}; font-weight: 700; color: ${primaryColor}; }
    .terms-section h4 { font-size: 9px; text-transform: uppercase; color: #64748b; margin-bottom: 5px; }
    .terms-text { font-size: 9px; color: #94a3b8; line-height: 1.5; }
    .bank-section { background: #f1f5f9; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
    .bank-section h3 { color: #1e293b; margin-bottom: 8px; font-size: 11px; }
    .bank-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .bank-item { font-size: 9px; color: #475569; }
    .bank-item strong { color: #1e293b; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #f1f5f9; padding-top: 15px; page-break-inside: avoid; }
    .signature-line { width: 140px; border-top: 2px solid ${primaryColor}; padding-top: 8px; font-size: 9px; color: #64748b; font-weight: 600; text-align: center; }
  </style>
</head>
<body>
  <div class="gradient-header">
    <div class="header-content">
      <div class="company-section">
        ${(config.showLogo && data.company.logoUrl) ? `<img src="${data.company.logoUrl}" alt="Logo" style="max-height: ${isA5 ? '35px' : '45px'}; margin-bottom: 8px; filter: brightness(0) invert(1);">` : ''}
        <h1>${data.company.name}</h1>
        <p>${data.company.address}</p>
        ${data.company.phone ? `<p>📞 ${data.company.phone}</p>` : ''}
        ${data.company.email ? `<p>✉️ ${data.company.email}</p>` : ''}
      </div>
      <div class="invoice-badge">
        <h2>${getLabel('invoice', t.invoice)}</h2>
        <div class="invoice-number">${data.details.number}</div>
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="QR Code">
        </div>
      </div>
    </div>
  </div>

  <div class="content">
    <div class="details-grid">
      <div class="detail-box">
        <h3>${getLabel('billTo', t.billTo)}</h3>
        <p><strong>${data.client.name}</strong></p>
        <p>${data.client.address}</p>
        <p>${data.client.email}</p>
      </div>
      <div class="detail-box">
        <h3>${t.details}</h3>
        <p><strong>${getLabel('date', t.date)}:</strong> ${data.details.issueDate}</p>
        <p><strong>${getLabel('due', t.due)}:</strong> ${data.details.dueDate || 'On Receipt'}</p>
        ${data.company.taxId ? `<p><strong>Tax ID:</strong> ${data.company.taxId}</p>` : ''}
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
      <div class="payment-links">
        ${(data.company.paymentLinkStripe || data.company.paymentLinkPaypal) ? `
            <div style="margin-bottom: 15px;">
                <h4 style="font-size: 9px; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">${t.payNow}</h4>
                ${data.company.paymentLinkStripe ? `<a href="${data.company.paymentLinkStripe}" class="pay-button stripe-btn">Stripe Pay</a>` : ''}
                ${data.company.paymentLinkPaypal ? `<a href="${data.company.paymentLinkPaypal}" class="pay-button paypal-btn">PayPal.me</a>` : ''}
            </div>
        ` : ''}
        
        ${data.details.notes ? `
            <div class="terms-section">
                <h4>${getLabel('notes', 'Notes')}</h4>
                <p class="terms-text">${data.details.notes}</p>
            </div>
        ` : ''}

        ${data.details.terms ? `
            <div class="terms-section" style="margin-top: 10px;">
                <h4>${getLabel('terms', t.terms)}</h4>
                <p class="terms-text">${data.details.terms}</p>
            </div>
        ` : ''}
      </div>

      <div class="summary-box">
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

    ${(data.company.bankName || data.company.bankIban) ? `
    <div class="bank-section">
      <h3>🏛️ ${t.payment}</h3>
      <div class="bank-grid">
        ${data.company.bankName ? `<div class="bank-item"><strong>${t.bank}:</strong> ${data.company.bankName}</div>` : ''}
        ${data.company.bankIban ? `<div class="bank-item"><strong>${t.iban}:</strong> ${data.company.bankIban}</div>` : ''}
        ${data.company.bankSwift ? `<div class="bank-item"><strong>${t.swift}:</strong> ${data.company.bankSwift}</div>` : ''}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <div class="signature">
        ${(config.showSignature && data.company.signatureUrl) ? `<img src="${data.company.signatureUrl}" alt="Signature" style="max-height: ${isA5 ? '35px' : '50px'}; margin-bottom: 6px;">` : ''}
        <div class="signature-line">${t.signature} (Seller)</div>
      </div>
      
      ${data.details.buyerSignatureUrl ? `
      <div class="signature">
        <img src="${data.details.buyerSignatureUrl}" alt="Buyer Signature" style="max-height: ${isA5 ? '35px' : '50px'}; margin-bottom: 6px;">
        <div class="signature-line">Buyer Signature</div>
      </div>
      ` : ''}

      <div class="stamp">
        ${(config.showStamp && data.company.stampUrl) ? `<img src="${data.company.stampUrl}" alt="Stamp" style="max-height: ${isA5 ? '50px' : '70px'};">` : ''}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
