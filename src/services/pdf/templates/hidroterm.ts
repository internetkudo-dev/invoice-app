import { InvoiceData } from '../../../types';
import { pdfTranslations } from '../translations';

export function hidrotermTemplate(data: InvoiceData): string {
  const primaryColor = '#000000'; // Strict black/grayscale as per PDF
  const lang = data.details.language || 'sq'; // Default to Albanian as per PDF
  const t = pdfTranslations[lang] || pdfTranslations.sq || pdfTranslations.en;

  const config = data.config || {
    showLogo: true,
    showSignature: true,
    showStamp: true,
    pageSize: 'A4'
  };

  const pageSize = config.pageSize || 'A4';
  const isA5 = pageSize === 'A5';

  // Formatters
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { // European format 1.234,56
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE'); // DD.MM.YYYY
  };



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
    html { height: 297mm; }
    body {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #000;
      background: #fff;
      padding: 10mm;
      position: relative;
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
    .brand-name { font-size: 24px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px; }
    .invoice-header-line { font-size: 14px; font-weight: 900; letter-spacing: 0.5px; }

    .qr-section { text-align: right; }

    /* Info Columns */
    .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc; }
    .info-col { width: 48%; }
    .info-title { font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
    .info-row { display: flex; margin-bottom: 2px; }
    .label { width: 80px; font-weight: bold; font-size: 9px; }
    .value { flex: 1; font-size: 9px; }

    /* Meta Grid */
    .meta-grid { display: flex; gap: 10px; margin-bottom: 20px; font-size: 9px; }
    .meta-item { border: 1px solid #ccc; padding: 4px; flex: 1; }
    .meta-label { font-weight: bold; display: block; margin-bottom: 2px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9px; }
    th { background: #333; color: #fff; padding: 6px 4px; text-align: center; font-weight: bold; border: 1px solid #000; }
    td { border: 1px solid #000; padding: 4px; }

    /* Footer Totals */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .totals-table { width: 250px; text-align: right; font-size: 10px; }
    .total-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .total-final { 
        font-weight: 900; 
        font-size: 14px; 
        border-top: 2px solid #000; 
        border-bottom: 2px solid #000; 
        padding: 5px 0; 
        margin-top: 5px; 
    }

    /* Signatures */
    .signatures { display: flex; justify-content: space-between; margin-bottom: 0px; text-align: center; font-size: 10px; }
    .sig-block { width: 22%; }
    .sig-line { border-bottom: 1px solid #000; height: 30px; margin-bottom: 5px; }

    /* Bottom Footer */
    .page-footer { 
        display: flex; 
        justify-content: space-between; 
        border-top: 1px solid #000; 
        padding-top: 10px;
        font-size: 9px;
    }
    .footer-col { flex: 1; }
    
    /* Footer Layout */
    .footer-container {
        position: absolute;
        bottom: 30mm;
        left: 0;
        right: 0;
        padding: 0 10mm;
    }
  </style>
</head>
<body>

      <!-- 1. Top Bar (Logo Left, QR Right) -->
      <div class="top-bar">
        <div class="brand-section">
            <div class="brand-name">${data.company.name || 'EMRI I BIZNESIT'}</div>
            <div class="invoice-header-line">FATURA: ${data.details.number}</div>
        </div>
        <div class="qr-section">
            <img src="${qrCodeUrl}" style="height: 80px; width: 80px;" />
        </div>
      </div>

      <!-- 2. Address Columns -->
      <div class="info-section">
        <div class="info-col">
          <div class="info-title">Fatura Për:</div>
          <div class="value" style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">${data.client.name}</div>
          <div class="info-row"><span class="label">Nr. unik/fiskal:</span><span class="value">${data.client.taxId || '-'}</span></div>
          <div class="info-row"><span class="label">Kontakti:</span><span class="value">${data.client.email || '-'}</span></div>
          <div class="info-row"><span class="label">Adresa:</span><span class="value">${data.client.address || '-'}</span></div>
        </div>
        
        <div class="info-col">
          <div class="info-title">Malli Për (Delivery):</div>
          <div class="value" style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">${data.client.deliveryName || data.client.name}</div>
          <div class="info-row"><span class="label">Nr. unik/fiskal:</span><span class="value">${data.client.taxId || '-'}</span></div>
          <div class="info-row"><span class="label">Kontakti:</span><span class="value">${data.client.email || '-'}</span></div>
          <div class="info-row"><span class="label">Adresa:</span><span class="value">${data.client.deliveryAddress || data.client.address || '-'}</span></div>
          <div class="info-row"><span class="label">Tel:</span><span class="value">${data.client.phone || '-'}</span></div>
        </div>
      </div>

      <!-- 3. Meta Grid -->
      <div class="meta-grid">
         <div class="meta-item">
          <span class="meta-label">Data e faturës:</span>
          ${data.details.issueDate}
        </div>
        <div class="meta-item">
          <span class="meta-label">Afati për pagesë:</span>
          ${data.details.dueDate}
        </div>
      </div>

      <!-- 4. Table -->
      <table>
    <thead>
      <tr>
        <th>Nr</th>
        <th>Shifra</th>
        <th style="text-align: left;">Përshkrimi</th>
        <th>Sasia</th>
        <th>Njësia</th>
        <th>Çmimi pa Tvsh</th>
        <th>Rabati</th>
        <th>Tvsh %</th>
        <th>Vlera shitëse</th>
        <th>Çmimi me Tvsh</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map((item, index) => {
    const netPrice = item.price;
    const taxRate = item.taxRate || 0;
    const grossPrice = netPrice * (1 + taxRate / 100);

    return `
        <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${item.sku || '-'}</td>
            <td>${item.description}</td>
            <td style="text-align: right;">${item.quantity}</td>
            <td style="text-align: center;">${item.unit || 'copë'}</td>
            <td style="text-align: right;">${formatCurrency(netPrice)}</td>
            <td style="text-align: right;">${item.discount || 0}%</td> 
            <td style="text-align: right;">${taxRate}%</td>
            <td style="text-align: right; font-weight: bold;">${formatCurrency(item.total)}</td>
            <td style="text-align: right;">${formatCurrency(grossPrice)}</td> 
        </tr>
        `;
  }).join('')}
    </tbody>
      </table>

      <!-- 5. Totals -->
      <div class="totals-section">
        <div class="totals-table">
          <div class="total-row">
            <span>Vlera pa rabat:</span>
            <span>${formatCurrency(data.summary.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>Rabati:</span>
            <span>${formatCurrency(data.summary.discount)}</span>
          </div>
          <div class="total-row">
            <span>Vlera pa tvsh:</span>
            <span>${formatCurrency(data.summary.subtotal - (data.summary.discount || 0))}</span>
          </div>
          <div class="total-row">
            <span>Tvsh Total:</span>
            <span>${formatCurrency(data.summary.tax)}</span>
          </div>
          <div class="total-row total-final">
            <span>Vlera për pagesë:</span>
            <span>${formatCurrency(data.summary.total)} €</span>
          </div>
        </div>
      </div>

  <!-- Footer Container (Signatures + Footer) -->
  <div class="footer-container">
      <!-- 6. Signatures -->
      <div class="signatures">
        <div class="sig-block">
          <div class="sig-title">Faturoi:</div>
          <div class="sig-line"></div>
        </div>
        <div class="sig-block">
          <div class="sig-title">Dërgoi:</div>
          <div class="sig-line"></div>
        </div>
        <div class="sig-block">
          <div class="sig-title">Kontrolloi:</div>
          <div class="sig-line"></div>
        </div>
        <div class="sig-block">
          <div class="sig-title">Pranoi:</div>
          <div class="sig-line"></div>
          <div>Emri i plotë</div>
        </div>
      </div>

      <!-- 7. Page Footer -->
      <div class="page-footer">
        <div class="footer-col">
          <p><strong>Nr. ID:</strong> ${data.company.taxId || '-'}</p>
          <p><strong>Bank:</strong> ${data.company.bankName || '-'}</p>
          <p><strong>IBAN:</strong> ${data.company.bankIban || '-'}</p>
        </div>
        <div class="footer-col" style="text-align: center;">
          <p>${data.company.address}</p>
          <p>${data.company.city ? data.company.city + ', ' : ''}${data.company.country || 'Kosovo'}</p>
          <p>${data.company.phone || ''}</p>
        </div>
        <div class="footer-col" style="text-align: right;">
            <p>${data.company.email || ''}</p>
          <p>${data.company.website || ''}</p>
          <p style="margin-top: 5px; color: #666;">© Invoice App 2024</p>
        </div>
      </div>
  </div>

</body>
</html>
    `;
}
