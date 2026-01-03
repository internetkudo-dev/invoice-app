import { InvoiceData } from '../../../types';

export function generateClassicTemplate(data: InvoiceData): string {
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
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
    `
    )
    .join('');

  // Generate QR Code URL using a public API
  const qrData = encodeURIComponent(`INVOICE:${data.details.number}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}`;

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
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11px;
      color: #1f2937;
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      border-bottom: 3px solid #1f2937;
      padding-bottom: 15px;
    }
    .company-info h1 {
      font-size: 22px;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .company-info p {
      color: #6b7280;
      line-height: 1.5;
      font-size: 10px;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      font-size: 28px;
      color: #1f2937;
      letter-spacing: 3px;
      margin-bottom: 8px;
    }
    .invoice-number {
      font-size: 14px;
      font-weight: bold;
      color: #4b5563;
      background: #f3f4f6;
      padding: 6px 12px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 8px;
    }
    .qr-code {
      margin-top: 8px;
    }
    .details-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .bill-to, .invoice-details {
      width: 45%;
    }
    .bill-to h3, .invoice-details h3 {
      font-size: 10px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    .bill-to p, .invoice-details p {
      line-height: 1.7;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    th {
      background: #1f2937;
      color: #fff;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
    }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) {
      text-align: center;
    }
    th:last-child {
      text-align: right;
    }
    td {
      font-size: 10px;
    }
    .summary {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .summary-table {
      width: 220px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
    }
    .summary-row.total {
      font-size: 14px;
      font-weight: bold;
      border-bottom: none;
      border-top: 2px solid #1f2937;
      padding-top: 12px;
    }
    .bank-info {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    .bank-info h3 {
      font-size: 11px;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .bank-info p {
      color: #4b5563;
      line-height: 1.7;
      font-size: 10px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
    }
    .signature-section {
      text-align: center;
    }
    .signature-section img {
      max-height: 50px;
      margin-bottom: 8px;
    }
    .signature-line {
      width: 150px;
      border-top: 1px solid #1f2937;
      margin-top: 8px;
      padding-top: 6px;
      font-size: 10px;
      color: #6b7280;
    }
    .stamp-section img {
      max-height: 60px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      ${data.company.logoUrl ? `<img src="${data.company.logoUrl}" alt="Logo" style="max-height: 50px; margin-bottom: 8px;">` : ''}
      <h1>${data.company.name}</h1>
      <p>${data.company.address}</p>
      ${data.company.phone ? `<p>Tel: ${data.company.phone}</p>` : ''}
      ${data.company.email ? `<p>Email: ${data.company.email}</p>` : ''}
      ${data.company.website ? `<p>Web: ${data.company.website}</p>` : ''}
      ${data.company.taxId ? `<p>Tax ID: ${data.company.taxId}</p>` : ''}
    </div>
    <div class="invoice-title">
      <h2>INVOICE</h2>
      <div class="invoice-number">${data.details.number}</div>
      <div class="qr-code">
        <img src="${qrCodeUrl}" alt="QR Code" width="100" height="100">
      </div>
    </div>
  </div>

  <div class="details-section">
    <div class="bill-to">
      <h3>Bill To</h3>
      <p><strong>${data.client.name}</strong></p>
      <p>${data.client.address}</p>
      <p>${data.client.email}</p>
    </div>
    <div class="invoice-details">
      <h3>Invoice Details</h3>
      <p><strong>Invoice Date:</strong> ${data.details.issueDate}</p>
      <p><strong>Due Date:</strong> ${data.details.dueDate || 'On Receipt'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-table">
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
        <span>Total</span>
        <span>${formatCurrency(data.summary.total)}</span>
      </div>
    </div>
  </div>

  ${data.company.bankName || data.company.bankIban ? `
  <div class="bank-info">
    <h3>Payment Information</h3>
    ${data.company.bankName ? `<p><strong>Bank:</strong> ${data.company.bankName}</p>` : ''}
    ${data.company.bankAccount ? `<p><strong>Account:</strong> ${data.company.bankAccount}</p>` : ''}
    ${data.company.bankIban ? `<p><strong>IBAN:</strong> ${data.company.bankIban}</p>` : ''}
    ${data.company.bankSwift ? `<p><strong>SWIFT/BIC:</strong> ${data.company.bankSwift}</p>` : ''}
  </div>
  ` : ''}

  <div class="footer">
    <div class="signature-section">
      ${data.company.signatureUrl ? `<img src="${data.company.signatureUrl}" alt="Signature">` : ''}
      <div class="signature-line">Authorized Signature</div>
    </div>
    <div class="stamp-section">
      ${data.company.stampUrl ? `<img src="${data.company.stampUrl}" alt="Company Stamp">` : ''}
    </div>
  </div>
</body>
</html>
  `;
}
