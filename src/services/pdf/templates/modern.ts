import { InvoiceData } from '../../../types';

export function generateModernTemplate(data: InvoiceData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
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
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.price)}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
      </tr>
    `
    )
    .join('');

  const qrData = encodeURIComponent(`INVOICE:${data.details.number}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrData}&color=6366f1`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      color: #334155;
      background: #fff;
      width: 210mm;
      min-height: 297mm;
    }
    .gradient-header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 25px 30px;
      border-radius: 0 0 20px 20px;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-section h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .company-section p {
      opacity: 0.9;
      line-height: 1.5;
      font-size: 10px;
    }
    .invoice-badge {
      text-align: right;
    }
    .invoice-badge h2 {
      font-size: 10px;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 6px;
    }
    .invoice-number {
      font-size: 16px;
      font-weight: 700;
      background: rgba(255,255,255,0.2);
      padding: 8px 14px;
      border-radius: 8px;
      display: inline-block;
      margin-bottom: 8px;
    }
    .qr-code {
      background: white;
      padding: 6px;
      border-radius: 6px;
      display: inline-block;
    }
    .content {
      padding: 25px 30px;
    }
    .details-grid {
      display: flex;
      gap: 25px;
      margin-bottom: 25px;
    }
    .detail-box {
      flex: 1;
      background: #f8fafc;
      padding: 18px;
      border-radius: 12px;
    }
    .detail-box h3 {
      font-size: 9px;
      text-transform: uppercase;
      color: #6366f1;
      margin-bottom: 12px;
      letter-spacing: 1px;
    }
    .detail-box p {
      line-height: 1.7;
      color: #475569;
      font-size: 10px;
    }
    .detail-box strong {
      color: #1e293b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    th {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
    }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    td { font-size: 10px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 25px;
    }
    .summary-box {
      width: 220px;
      background: #f8fafc;
      padding: 18px;
      border-radius: 12px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
    }
    .summary-row.total {
      border: none;
      padding-top: 14px;
      font-size: 16px;
      font-weight: 700;
      color: #6366f1;
    }
    .bank-section {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 18px;
      border-radius: 12px;
      margin-bottom: 25px;
    }
    .bank-section h3 {
      color: #0284c7;
      margin-bottom: 12px;
      font-size: 11px;
    }
    .bank-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .bank-item {
      color: #0369a1;
      font-size: 10px;
    }
    .bank-item strong {
      color: #0c4a6e;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 15px 0;
      border-top: 2px solid #e2e8f0;
    }
    .signature img {
      max-height: 45px;
      margin-bottom: 8px;
    }
    .signature-line {
      width: 140px;
      border-top: 2px solid #6366f1;
      padding-top: 8px;
      font-size: 10px;
      color: #64748b;
    }
    .stamp img { max-height: 55px; }
  </style>
</head>
<body>
  <div class="gradient-header">
    <div class="header-content">
      <div class="company-section">
        ${data.company.logoUrl ? `<img src="${data.company.logoUrl}" alt="Logo" style="max-height: 40px; margin-bottom: 8px; filter: brightness(0) invert(1);">` : ''}
        <h1>${data.company.name}</h1>
        <p>${data.company.address}</p>
        ${data.company.phone ? `<p>📞 ${data.company.phone}</p>` : ''}
        ${data.company.email ? `<p>✉️ ${data.company.email}</p>` : ''}
        ${data.company.website ? `<p>🌐 ${data.company.website}</p>` : ''}
      </div>
      <div class="invoice-badge">
        <h2>Invoice</h2>
        <div class="invoice-number">${data.details.number}</div>
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="QR Code" width="80" height="80">
        </div>
      </div>
    </div>
  </div>

  <div class="content">
    <div class="details-grid">
      <div class="detail-box">
        <h3>Bill To</h3>
        <p><strong>${data.client.name}</strong></p>
        <p>${data.client.address}</p>
        <p>${data.client.email}</p>
      </div>
      <div class="detail-box">
        <h3>Invoice Details</h3>
        <p><strong>Issue Date:</strong> ${data.details.issueDate}</p>
        <p><strong>Due Date:</strong> ${data.details.dueDate || 'On Receipt'}</p>
        ${data.company.taxId ? `<p><strong>Tax ID:</strong> ${data.company.taxId}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="summary-box">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${formatCurrency(data.summary.subtotal)}</span>
        </div>
        <div class="summary-row">
          <span>Tax</span>
          <span>${formatCurrency(data.summary.tax)}</span>
        </div>
        ${data.summary.discount > 0 ? `
        <div class="summary-row">
          <span>Discount</span>
          <span>-${formatCurrency(data.summary.discount)}</span>
        </div>
        ` : ''}
        <div class="summary-row total">
          <span>Total Due</span>
          <span>${formatCurrency(data.summary.total)}</span>
        </div>
      </div>
    </div>

    ${data.company.bankName || data.company.bankIban ? `
    <div class="bank-section">
      <h3>💳 Payment Information</h3>
      <div class="bank-grid">
        ${data.company.bankName ? `<div class="bank-item"><strong>Bank:</strong> ${data.company.bankName}</div>` : ''}
        ${data.company.bankAccount ? `<div class="bank-item"><strong>Account:</strong> ${data.company.bankAccount}</div>` : ''}
        ${data.company.bankIban ? `<div class="bank-item"><strong>IBAN:</strong> ${data.company.bankIban}</div>` : ''}
        ${data.company.bankSwift ? `<div class="bank-item"><strong>SWIFT:</strong> ${data.company.bankSwift}</div>` : ''}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <div class="signature">
        ${data.company.signatureUrl ? `<img src="${data.company.signatureUrl}" alt="Signature">` : ''}
        <div class="signature-line">Authorized Signature</div>
      </div>
      <div class="stamp">
        ${data.company.stampUrl ? `<img src="${data.company.stampUrl}" alt="Stamp">` : ''}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
