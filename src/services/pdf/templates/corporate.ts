import { InvoiceData } from '../../../types';
import { pdfTranslations } from '../translations';

export function corporateTemplate(data: InvoiceData): string {
  const primaryColor = '#000000'; // Strict black/grayscale as per PDF
  const lang = data.details.language || 'sq'; // Default to Albanian as per PDF
  const t = pdfTranslations[lang] || pdfTranslations.sq || pdfTranslations.en;

  // Default config with all visibility options
  const defaultConfig = {
    showLogo: true,
    showSignature: true,
    showBuyerSignature: true,
    showStamp: true,
    showQrCode: true,
    showNotes: true,
    showDiscount: true,
    showTax: true,
    showBankDetails: true,
    visibleColumns: {
      rowNumber: true,
      sku: true,
      description: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      discount: true,
      taxRate: true,
      lineTotal: true,
      grossPrice: true,
    },
    pageSize: 'A4' as const,
  };

  const config = { ...defaultConfig, ...data.config, visibleColumns: { ...defaultConfig.visibleColumns, ...data.config?.visibleColumns } };

  const pageSize = config.pageSize || 'A4';
  const isA5 = pageSize === 'A5';
  const cols = config.visibleColumns;

  // Formatters
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { // European format 1.234,56
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`; // DD/MM/YYYY format
  };


  // Document type labels in Albanian
  const documentLabels: Record<string, string> = {
    'regular': 'Faturë',
    'delivery_note': 'Fletëdërgesë',
    'offer': 'Ofertë',
    'order': 'Porosi',
    'pro_invoice': 'Profaturë',
  };

  // Get the document label based on subtype
  const documentLabel = documentLabels[data.details.subtype || 'regular'] || 'Faturë';

  // Generate QR for footer
  const qrData = encodeURIComponent(`invoiceapp://invoice/${data.details.number}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}&color=000000`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: 210mm; 
      margin: 0 auto;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      color: #000;
      background: #fff;
    }
    body {
      padding: 10mm;
      display: flex;
      flex-direction: column;
      min-height: auto;
    }
    .main-content {
      flex: 1;
    }
    
    /* Header Layout */
    .top-bar { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start; 
        margin-bottom: 20px; 
        border-bottom: 2px solid #000;
        padding-bottom: 15px;
    }
    .brand-section { text-align: left; }
    .brand-name { font-size: 32px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px; }
    .invoice-header-line { font-size: 18px; font-weight: 900; letter-spacing: 0.5px; }

    .qr-section { text-align: right; }

    /* Info Columns */
    .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc; }
    .info-col { width: 48%; }
    .info-title { font-weight: bold; font-size: 15px; margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
    .info-row { display: flex; margin-bottom: 4px; }
    .label { width: 100px; font-weight: bold; font-size: 13px; }
    .value { flex: 1; font-size: 13px; }

    /* Meta Grid */
    .meta-grid { display: flex; gap: 10px; margin-bottom: 20px; font-size: 13px; }
    .meta-item { border: 1px solid #ccc; padding: 8px; flex: 1; }
    .meta-label { font-weight: bold; display: block; margin-bottom: 2px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #333; color: #fff; padding: 10px 6px; text-align: center; font-weight: bold; border: 1px solid #000; font-size: 11px; }
    td { border: 1px solid #000; padding: 8px 5px; }

    /* Footer Totals */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .totals-table { width: 300px; text-align: right; font-size: 14px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .total-final { 
        font-weight: 900; 
        font-size: 18px; 
        border-top: 2px solid #000; 
        border-bottom: 2px solid #000; 
        padding: 8px 0; 
        margin-top: 5px; 
    }

    /* Signatures */
    .signatures { display: flex; justify-content: space-between; margin-bottom: 20px; text-align: center; font-size: 14px; }
    .sig-block { width: 22%; }
    .sig-line { border-bottom: 1px solid #000; height: 50px; margin-bottom: 5px; display: flex; align-items: flex-end; justify-content: center; }

    /* Bottom Footer */
    .page-footer { 
        display: flex; 
        justify-content: space-between; 
        border-top: 1px solid #000; 
        padding-top: 10px;
        font-size: 12px;
        margin-top: 20px;
    }
    .footer-col { flex: 1; }
    
    /* Footer Container - no absolute positioning */
    .footer-container {
        margin-top: auto;
        padding-top: 20px;
    }
  </style>
</head>
<body>

  <div class="main-content">
      <!-- 1. Top Bar (Logo Left, QR Right) -->
      <div class="top-bar">
        <div class="brand-section">
            <div class="brand-name">${data.company.name || 'EMRI I BIZNESIT'}</div>
            <div class="invoice-header-line">${documentLabel.toUpperCase()}: ${data.details.number}</div>
        </div>
        <div class="qr-section">
            ${config.showQrCode ? '<img src="' + qrCodeUrl + '" style="height: 80px; width: 80px;" />' : ''}
        </div>
      </div>

      <!-- 2. Client Info (Single Section) -->
      <div class="info-section">
        <div class="info-col" style="width: 100%;">
          <div class="info-title">Fatura Për:</div>
          <div class="value" style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">${data.client.name}</div>
          <div style="display: flex; gap: 40px;">
            <div style="flex: 1;">
              <div class="info-row"><span class="label">NUI:</span><span class="value">${data.client.nui || data.client.taxId || '-'}</span></div>
              <div class="info-row"><span class="label">Nr. Fiskal:</span><span class="value">${data.client.fiscalNumber || '-'}</span></div>
              <div class="info-row"><span class="label">Nr. TVSH:</span><span class="value">${data.client.vatNumber || '-'}</span></div>
            </div>
            <div style="flex: 1;">
              <div class="info-row"><span class="label">Kontakti:</span><span class="value">${data.client.email || '-'}</span></div>
              <div class="info-row"><span class="label">Tel:</span><span class="value">${data.client.phone || '-'}</span></div>
              <div class="info-row"><span class="label">Adresa:</span><span class="value">${data.client.address || '-'}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Meta Grid -->
      <div class="meta-grid">
         <div class="meta-item">
          <span class="meta-label">Data e faturës:</span>
          ${formatDate(data.details.issueDate)}
        </div>
        <div class="meta-item">
          <span class="meta-label">Afati për pagesë:</span>
          ${formatDate(data.details.dueDate)}
        </div>
      </div>

      <!-- 4. Table -->
      <table>
    <thead>
      <tr>
        ${cols.rowNumber ? '<th>Nr</th>' : ''}
        ${cols.sku ? '<th>Shifra</th>' : ''}
        ${cols.description ? '<th style="text-align: left;">Përshkrimi</th>' : ''}
        ${cols.quantity ? '<th>Sasia</th>' : ''}
        ${cols.unit ? '<th>Njësia</th>' : ''}
        ${cols.unitPrice ? '<th>Çmimi pa Tvsh</th>' : ''}
        ${cols.discount ? '<th>Rabati</th>' : ''}
        ${cols.taxRate ? '<th>Tvsh %</th>' : ''}
        ${cols.lineTotal ? '<th>Vlera shitëse</th>' : ''}
        ${cols.grossPrice ? '<th>Çmimi me Tvsh</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${data.items.map((item, index) => {
    const netPrice = item.price;
    const taxRate = item.taxRate || 0;
    const discountPercent = item.discount || 0;

    // item.total in data comes as Net Total (after discount, before tax)
    // We confirm this logic:
    // Net Line Total = (Unit Price * Qty) - Discount Amount (which is item.total)
    // Tax Amount = item.total * (taxRate / 100)
    // Final Line Total = item.total + Tax Amount

    // However, if item.total includes tax in some contexts, we must be careful.
    // Based on InvoiceFormScreen logic: item.amount = (qty * price) - discount. Tax is separate.
    // So item.total is Net Discounted.

    const taxAmount = item.total * (taxRate / 100);
    const lineFinalTotal = item.total + taxAmount;

    // Gross Unit Price (for 'Çmimi me Tvsh' column)
    const grossPrice = netPrice * (1 + taxRate / 100);

    let row = '<tr>';
    if (cols.rowNumber) row += '<td style="text-align: center;">' + (index + 1) + '</td>';
    if (cols.sku) row += '<td>' + (item.sku || '-') + '</td>';
    if (cols.description) row += '<td>' + item.description + '</td>';
    if (cols.quantity) row += '<td style="text-align: right;">' + item.quantity + '</td>';
    if (cols.unit) row += '<td style="text-align: center;">' + (item.unit || 'copë') + '</td>';
    if (cols.unitPrice) row += '<td style="text-align: right;">' + formatCurrency(netPrice) + '</td>';
    if (cols.discount) row += '<td style="text-align: right;">' + discountPercent + '%</td>';
    if (cols.taxRate) row += '<td style="text-align: right;">' + taxRate + '%</td>';
    if (cols.lineTotal) row += '<td style="text-align: right; font-weight: bold;">' + formatCurrency(lineFinalTotal) + '</td>';
    if (cols.grossPrice) row += '<td style="text-align: right;">' + formatCurrency(grossPrice) + '</td>';
    row += '</tr>';
    return row;
  }).join('')}
    </tbody>
      </table>

      <!-- 5. Totals -->
      <div class="totals-section">
        <div class="totals-table">
          <div class="total-row">
            <span>Vlera pa rabat:</span>
            <span>${
    // Recalculate based on items to align with new logic
    formatCurrency(data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0))
    }</span>
          </div>
          <div class="total-row">
            <span>Rabati:</span>
            <span>${
    // Total Discount Amount
    formatCurrency(data.items.reduce((sum, item) => {
      // item.total is net discounted. 
      // Discount Amount = (Price * Qty) - Net Discounted Base (item.total).
      // Or explicit calc: Price * Qty * (Discount/100).
      const original = item.quantity * item.price;
      const discountAmt = original * ((item.discount || 0) / 100);
      return sum + discountAmt;
    }, 0))
    }</span>
          </div>
          <div class="total-row">
            <span>Vlera pa tvsh:</span>
            <span>${
    // Vlera pa Tvsh = Vlera shitëse (Total Final) - TVSH
    // Total Final = Sum(lineFinalTotal)
    // TVSH = Sum(taxAmount)
    formatCurrency(
      data.items.reduce((sum, item) => {
        const taxAmount = item.total * ((item.taxRate || 0) / 100);
        const lineFinalTotal = item.total + taxAmount;
        return sum + lineFinalTotal;
      }, 0) -
      data.items.reduce((sum, item) => sum + (item.total * ((item.taxRate || 0) / 100)), 0)
    )
    }</span>
          </div>
          <div class="total-row">
            <span>Tvsh Total:</span>
            <span>${formatCurrency(data.items.reduce((sum, item) => sum + (item.total * ((item.taxRate || 0) / 100)), 0))
    }</span>
          </div>
          <div class="total-row total-final">
            <span>Vlera për pagesë:</span>
            <span>${formatCurrency(data.items.reduce((sum, item) => {
      const taxAmount = item.total * ((item.taxRate || 0) / 100);
      return sum + item.total + taxAmount;
    }, 0))
    } €</span>
          </div>
        </div>
      </div>
  </div> <!-- end main-content -->

  <!-- Footer Container (Signatures + Footer) -->
  <div class="footer-container">
      <!-- 6. Signatures -->
      ${(config.showSignature || config.showBuyerSignature) ? `
      <div class="signatures">
        ${config.showSignature ? `
        <div class="sig-block">
          <div class="sig-title">Faturoi:</div>
          <div class="sig-line">
            ${data.company.signatureUrl ? '<img src="' + data.company.signatureUrl + '" style="max-height: 45px; max-width: 100%; object-fit: contain;" />' : ''}
          </div>
        </div>
        <div class="sig-block">
          <div class="sig-title">Dërgoi:</div>
          <div class="sig-line"></div>
        </div>
        <div class="sig-block">
          <div class="sig-title">Kontrolloi:</div>
          <div class="sig-line"></div>
        </div>
        ` : ''}
        ${config.showBuyerSignature ? `
        <div class="sig-block">
          <div class="sig-title">Pranoi:</div>
          <div class="sig-line">
            ${data.details.buyerSignatureUrl ? '<img src="' + data.details.buyerSignatureUrl + '" style="max-height: 45px; max-width: 100%; object-fit: contain;" />' : ''}
          </div>
          <div>Emri i plotë</div>
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- 7. Page Footer -->
      <div class="page-footer">
        ${config.showBankDetails ? `
        <div class="footer-col">
          <p><strong>Nr. ID:</strong> ${data.company.taxId || '-'}</p>
          <p><strong>Bank:</strong> ${data.company.bankName || '-'}</p>
          <p><strong>IBAN:</strong> ${data.company.bankIban || '-'}</p>
        </div>
        ` : '<div class="footer-col"></div>'}
        <div class="footer-col" style="text-align: center;">
          <p>${data.company.address}</p>
          <p>${data.company.city ? data.company.city + ', ' : ''}${data.company.country || 'Kosovo'}</p>
          <p>${data.company.phone || ''}</p>
        </div>
        <div class="footer-col" style="text-align: right;">
            <p>${data.company.email || ''}</p>
          <p>${data.company.website || ''}</p>
          <p style="margin-top: 5px; color: #666;">© Faturicka 2025</p>
        </div>
      </div>
  </div>

</body>
</html>
    `;
}
