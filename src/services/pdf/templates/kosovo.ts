import { InvoiceData } from '../../../types';
import { pdfTranslations } from '../translations';

export function kosovoTemplate(data: InvoiceData): string {
    const primaryColor = data.company.primaryColor || '#1f2937';
    const isGrayscale = data.company.isGrayscale;
    const lang = data.details.language || 'sq';
    const t = pdfTranslations[lang] || pdfTranslations.sq;
    const config = data.config || {
        showLogo: true,
        showSignature: true,
        showStamp: true,
        visibleColumns: { sku: true, unit: true, tax: true, quantity: true, price: true },
        labels: {},
        pageSize: 'A4'
    };

    const pageSize = config.pageSize || 'A4';
    const isA5 = pageSize === 'A5';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount) + ' ' + (data.details.currency || 'EUR');
    };

    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // Calculate subtotals
    const subtotalWithoutVat = data.items.reduce((sum, item) => {
        const priceWithDiscount = item.price * (1 - (item.discount || 0) / 100);
        return sum + priceWithDiscount * item.quantity;
    }, 0);

    const vatAmount = data.summary.tax || subtotalWithoutVat * 0.18;
    const totalWithVat = subtotalWithoutVat + vatAmount;

    const itemsHtml = data.items
        .map((item, index) => {
            const priceWithDiscount = item.price * (1 - (item.discount || 0) / 100);
            const priceWithVat = priceWithDiscount * (1 + (item.taxRate || 18) / 100);
            const totalValue = priceWithVat * item.quantity;

            return `
      <tr>
        <td class="cell center">${index + 1}</td>
        ${config.visibleColumns.sku ? `<td class="cell">${item.sku || ''}</td>` : ''}
        <td class="cell">${item.description}</td>
        <td class="cell center">${formatNumber(item.quantity)}</td>
        ${config.visibleColumns.unit ? `<td class="cell center">${item.unit || 'CP'}</td>` : ''}
        <td class="cell right">${formatNumber(item.price)}</td>
        <td class="cell center">${formatNumber(item.discount || 0)}</td>
        ${config.visibleColumns.tax ? `<td class="cell center">${item.taxRate || 18}.00</td>` : ''}
        <td class="cell right">${formatNumber(priceWithDiscount)}</td>
        <td class="cell right">${formatNumber(priceWithVat)}</td>
        <td class="cell right">${formatNumber(totalValue)}</td>
      </tr>
    `;
        })
        .join('');

    // Generate barcode-style invoice number display
    const invoiceNumber = data.details.number || '000-000-000-00';

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
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${isA5 ? '8px' : '10px'};
      color: #1f2937;
      background: #fff;
      width: ${isA5 ? '148mm' : '210mm'};
      padding: ${isA5 ? '8mm' : '12mm'};
      ${isGrayscale ? 'filter: grayscale(100%);' : ''}
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    .header-left {
      font-size: 12px;
      font-weight: bold;
      color: #666;
    }
    .company-brand {
      text-align: right;
    }
    .company-brand h1 {
      font-size: ${isA5 ? '20px' : '28px'};
      font-weight: bold;
      color: #333;
      letter-spacing: 2px;
      margin-bottom: 2px;
    }
    .company-brand h1 span {
      color: ${primaryColor};
    }
    .company-brand .subtitle {
      font-size: 10px;
      color: #666;
      letter-spacing: 1px;
    }
    
    /* Parties Section */
    .parties-section {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
      border: 1px solid #ddd;
    }
    .party-box {
      flex: 1;
      padding: 10px;
    }
    .party-box:first-child {
      border-right: 1px solid #ddd;
    }
    .party-label {
      font-weight: bold;
      font-size: 9px;
      color: #333;
      margin-bottom: 5px;
    }
    .party-row {
      display: flex;
      font-size: 9px;
      line-height: 1.6;
    }
    .party-row .label {
      width: 80px;
      color: #666;
    }
    .party-row .value {
      flex: 1;
      font-weight: 500;
    }
    
    /* Invoice Title Section */
    .invoice-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      padding: 10px 0;
      border-bottom: 1px solid #ddd;
    }
    .invoice-left {
      flex: 1;
    }
    .invoice-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .invoice-barcode {
      font-family: 'Libre Barcode 39', monospace;
      font-size: 28px;
      letter-spacing: 2px;
    }
    .invoice-number {
      font-size: 11px;
      font-weight: bold;
      margin-top: 3px;
    }
    .invoice-right {
      text-align: right;
    }
    .remaining-label {
      font-size: 10px;
      color: #666;
    }
    .remaining-value {
      font-size: 20px;
      font-weight: bold;
      color: ${primaryColor};
    }
    .amount-words {
      font-size: 9px;
      color: #666;
      font-style: italic;
    }
    
    /* Document Details Row */
    .doc-details {
      display: flex;
      border: 1px solid #ddd;
      margin-bottom: 10px;
      font-size: 8px;
    }
    .doc-detail-cell {
      flex: 1;
      padding: 6px 8px;
      border-right: 1px solid #ddd;
    }
    .doc-detail-cell:last-child {
      border-right: none;
    }
    .doc-detail-label {
      color: #666;
      font-size: 7px;
      margin-bottom: 2px;
    }
    .doc-detail-value {
      font-weight: 600;
    }
    
    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 8px;
    }
    .items-table th {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 6px 4px;
      text-align: center;
      font-weight: 600;
      font-size: 7px;
    }
    .items-table td.cell {
      border: 1px solid #ddd;
      padding: 6px 4px;
      font-size: 8px;
    }
    .items-table .center { text-align: center; }
    .items-table .right { text-align: right; }
    
    /* Warning + Summary Row */
    .warning-summary {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .warning-text {
      font-size: 9px;
      color: #666;
      font-style: italic;
      padding-top: 10px;
    }
    
    /* Summary Table */
    .summary-table {
      width: 280px;
      font-size: 9px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid #eee;
    }
    .summary-row .label {
      color: #333;
    }
    .summary-row .percent {
      color: #666;
      width: 60px;
      text-align: center;
    }
    .summary-row .value {
      width: 80px;
      text-align: right;
      font-weight: 500;
    }
    .summary-row.total {
      border-top: 2px solid #333;
      border-bottom: none;
      padding-top: 8px;
      font-weight: bold;
      font-size: 11px;
    }
    
    /* Footer Signatures */
    .signatures-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 15px;
    }
    .signature-box {
      text-align: center;
      width: 22%;
    }
    .signature-box.with-stamp {
      position: relative;
    }
    .signature-label {
      font-size: 9px;
      font-weight: 600;
      margin-bottom: 40px;
      border-bottom: 1px solid #333;
      padding-bottom: 3px;
    }
    .signature-sublabel {
      font-size: 8px;
      color: #666;
      margin-top: 5px;
    }
    .stamp-area {
      position: absolute;
      top: -20px;
      left: 0;
      right: 0;
    }
    .stamp-area img {
      max-height: 60px;
      opacity: 0.8;
    }
    .signature-area img {
      max-height: 40px;
      margin-bottom: 5px;
    }
    
    /* Company Footer */
    .company-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 8px;
      color: #666;
    }
    .footer-col {
      line-height: 1.6;
    }
    .footer-col strong {
      color: #333;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">N.T.</div>
    <div class="company-brand">
      ${config.showLogo && data.company.logoUrl
            ? `<img src="${data.company.logoUrl}" alt="Logo" style="max-height: 40px; margin-bottom: 5px;">`
            : `<h1>${data.company.name?.replace(/([A-Z])/g, '<span>$1</span>').replace('<span>', '') || 'COMPANY'}</h1>`
        }
      <div class="subtitle">EXPORT-IMPORT</div>
    </div>
  </div>
  
  <!-- Parties Section -->
  <div class="parties-section">
    <div class="party-box">
      <div class="party-label">Fatura Për:</div>
      <div class="party-row"><span class="label"></span><span class="value">${data.client.name}</span></div>
      <div class="party-row"><span class="label">Nr. unik/fiskal:</span><span class="value">${data.client.taxId || ''}</span></div>
      <div class="party-row"><span class="label">Nr. biznes/tvsh:</span><span class="value">${data.client.vatNumber || ''}</span></div>
      <div class="party-row"><span class="label">Kontakti:</span><span class="value">${data.client.phone || ''}</span></div>
      <div class="party-row"><span class="label">Adresa:</span><span class="value">${data.client.address || ''}</span></div>
    </div>
    <div class="party-box">
      <div class="party-label">Malli Për:</div>
      <div class="party-row"><span class="label"></span><span class="value">${data.client.deliveryName || data.client.name}</span></div>
      <div class="party-row"><span class="label">Mënyra e liferimit:</span><span class="value">${data.details.deliveryMethod || ''}</span></div>
      <div class="party-row"><span class="label">Kontakti:</span><span class="value">${data.client.deliveryContact || ''}</span></div>
      <div class="party-row"><span class="label">Adresa:</span><span class="value">${data.client.deliveryAddress || data.client.address || ''}</span></div>
    </div>
  </div>
  
  <!-- Invoice Title Section -->
  <div class="invoice-section">
    <div class="invoice-left">
      <div class="invoice-title">Fatura</div>
      <div class="invoice-barcode">||| ${invoiceNumber} |||</div>
      <div class="invoice-number">${invoiceNumber}</div>
    </div>
    <div class="invoice-right">
      <div class="remaining-label">Vlera e mbetur:</div>
      <div class="remaining-value">${formatNumber(data.summary.total)}</div>
      <div class="amount-words">${data.details.amountInWords || ''}</div>
    </div>
  </div>
  
  <!-- Document Details Row -->
  <div class="doc-details">
    <div class="doc-detail-cell">
      <div class="doc-detail-label">Njësia Org.</div>
      <div class="doc-detail-value">${data.details.department || 'DEPO KRYESORE'}</div>
    </div>
    <div class="doc-detail-cell">
      <div class="doc-detail-label">Data e faturës</div>
      <div class="doc-detail-value">${data.details.issueDate}</div>
    </div>
    <div class="doc-detail-cell">
      <div class="doc-detail-label">Afati për pagesë</div>
      <div class="doc-detail-value">${data.details.dueDate || ''}</div>
    </div>
    <div class="doc-detail-cell">
      <div class="doc-detail-label">Referenca</div>
      <div class="doc-detail-value">${data.details.reference || ''}</div>
    </div>
    <div class="doc-detail-cell">
      <div class="doc-detail-label">Referenti i juaj</div>
      <div class="doc-detail-value">${data.details.yourReference || ''}</div>
    </div>
    <div class="doc-detail-cell">
      <div class="doc-detail-label">Kushtet</div>
      <div class="doc-detail-value">${data.details.paymentTerms || 'NET 10'}</div>
    </div>
  </div>
  
  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 25px;">Nr</th>
        ${config.visibleColumns.sku ? '<th style="width: 60px;">Shifra</th>' : ''}
        <th>Përshkrimi</th>
        <th style="width: 40px;">Sasia</th>
        ${config.visibleColumns.unit ? '<th style="width: 35px;">Njësia</th>' : ''}
        <th style="width: 55px;">Çmimi pa<br>Tvsh</th>
        <th style="width: 40px;">Rabati<br>(%)</th>
        ${config.visibleColumns.tax ? '<th style="width: 40px;">Tvsh %</th>' : ''}
        <th style="width: 55px;">Çmimi me<br>rabat</th>
        <th style="width: 55px;">Çmimi<br>shitës</th>
        <th style="width: 65px;">Vlera shitëse</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  
  <!-- Warning + Summary -->
  <div class="warning-summary">
    <div class="warning-text">
      Pas kalimit te afatit te pageses aplikohen ndeshkimet
    </div>
    <div class="summary-table">
      <div class="summary-row">
        <span class="label">Vlera pa rabat:</span>
        <span class="percent"></span>
        <span class="value">${formatCurrency(subtotalWithoutVat)}</span>
      </div>
      <div class="summary-row">
        <span class="label">Rabati:</span>
        <span class="percent">${formatNumber(data.summary.discountPercent || 0)}%</span>
        <span class="value">${formatCurrency(data.summary.discount || 0)}</span>
      </div>
      <div class="summary-row">
        <span class="label">Rabati shtesë:</span>
        <span class="percent">0.00%</span>
        <span class="value">${formatCurrency(0)}</span>
      </div>
      <div class="summary-row">
        <span class="label">Vlera pa tvsh:</span>
        <span class="percent"></span>
        <span class="value">${formatCurrency(subtotalWithoutVat - (data.summary.discount || 0))}</span>
      </div>
      <div class="summary-row">
        <span class="label">Tvsh:</span>
        <span class="percent">18.00%</span>
        <span class="value">${formatCurrency(vatAmount)}</span>
      </div>
      <div class="summary-row total">
        <span class="label">Vlera për pagesë:</span>
        <span class="percent"></span>
        <span class="value">${formatCurrency(data.summary.total)}</span>
      </div>
    </div>
  </div>
  
  <!-- Signatures Section -->
  <div class="signatures-section">
    <div class="signature-box with-stamp">
      <div class="stamp-area">
        ${config.showStamp && data.company.stampUrl ? `<img src="${data.company.stampUrl}" alt="Stamp">` : ''}
      </div>
      ${config.showSignature && data.company.signatureUrl ? `<div class="signature-area"><img src="${data.company.signatureUrl}" alt="Signature"></div>` : ''}
      <div class="signature-label">Faturoi:</div>
    </div>
    <div class="signature-box">
      <div class="signature-label">Dërgoi:</div>
    </div>
    <div class="signature-box">
      <div class="signature-label">Kontrolloi:</div>
    </div>
    <div class="signature-box">
      <div class="signature-label">Pranoi:</div>
      <div class="signature-sublabel">Emri i plotë</div>
    </div>
  </div>
  
  <!-- Company Footer -->
  <div class="company-footer">
    <div class="footer-col">
      <strong>Nr.ID :</strong> ${data.company.businessId || ''}<br>
      <strong>Nr. TVSH:</strong> ${data.company.vatNumber || ''}<br>
      <strong>NLB :</strong> ${data.company.bankAccount || ''}
    </div>
    <div class="footer-col">
      ${data.company.address || ''}<br>
      <strong>Tel:</strong> ${data.company.phone || ''}
    </div>
    <div class="footer-col">
      <strong>Email:</strong> ${data.company.email || ''}<br>
      <strong>Website:</strong> ${data.company.website || ''}
    </div>
  </div>
</body>
</html>
  `;
}
