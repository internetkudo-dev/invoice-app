import { InvoiceData } from '../../../types';

export function corporateTemplate(data: InvoiceData): string {
    const { company, client, details, items, summary } = data;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${details.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      line-height: 1.5;
    }
    .header-bar {
      background: #0f172a;
      color: white;
      padding: 30px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      max-width: 180px;
      max-height: 60px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
    }
    .header-right {
      text-align: right;
    }
    .header-right h1 {
      font-size: 28px;
      font-weight: 300;
      letter-spacing: 3px;
    }
    .header-right p {
      opacity: 0.8;
      margin-top: 5px;
    }
    .content {
      padding: 40px;
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      gap: 40px;
    }
    .info-box {
      flex: 1;
      background: #f8fafc;
      padding: 25px;
      border-left: 4px solid #0f172a;
    }
    .info-box h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .info-box p {
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #0f172a;
      color: white;
      padding: 15px 20px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    th:last-child { text-align: right; }
    td {
      padding: 18px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    td:last-child { text-align: right; font-weight: 600; }
    tr:nth-child(even) td { background: #f8fafc; }
    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .notes {
      flex: 1;
      max-width: 350px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 4px;
    }
    .notes h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .summary-box {
      width: 300px;
      background: #0f172a;
      color: white;
      padding: 25px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .summary-row:last-child {
      border: none;
      font-size: 20px;
      font-weight: 700;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid rgba(255,255,255,0.2);
    }
    .signatures {
      display: flex;
      justify-content: flex-end;
      gap: 50px;
      margin-top: 50px;
      padding-right: 40px;
    }
    .signature-box {
      text-align: center;
    }
    .signature-box img {
      max-width: 120px;
      max-height: 50px;
    }
    .signature-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-top: 10px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 40px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      ${company.logoUrl ? `<img src="${company.logoUrl}" class="logo" alt="">` : `<div class="company-name">${company.name}</div>`}
    </div>
    <div class="header-right">
      <h1>INVOICE</h1>
      <p>${details.number}</p>
    </div>
  </div>

  <div class="content">
    <div class="info-grid">
      <div class="info-box">
        <h3>From</h3>
        <p><strong>${company.name}</strong></p>
        <p>${company.address}</p>
      </div>
      <div class="info-box">
        <h3>Bill To</h3>
        <p><strong>${client.name}</strong></p>
        <p>${client.address}</p>
        <p>${client.email}</p>
      </div>
      <div class="info-box">
        <h3>Invoice Details</h3>
        <p><strong>Date:</strong> ${details.issueDate}</p>
        <p><strong>Due:</strong> ${details.dueDate || 'On Receipt'}</p>
        <p><strong>Currency:</strong> ${details.currency}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${details.currency} ${item.price.toFixed(2)}</td>
            <td>${details.currency} ${item.total.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="notes">
        <h4>Payment Information</h4>
        <p>Please make payment within the due date specified above.</p>
      </div>
      <div class="summary-box">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${details.currency} ${summary.subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Tax</span>
          <span>${details.currency} ${summary.tax.toFixed(2)}</span>
        </div>
        ${summary.discount > 0 ? `
        <div class="summary-row">
          <span>Discount</span>
          <span>-${details.currency} ${summary.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="summary-row">
          <span>Total Due</span>
          <span>${details.currency} ${summary.total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="signatures">
      ${company.signatureUrl ? `
      <div class="signature-box">
        <img src="${company.signatureUrl}" alt="">
        <div class="signature-label">Authorized Signature</div>
      </div>
      ` : ''}
      ${company.stampUrl ? `
      <div class="signature-box">
        <img src="${company.stampUrl}" alt="">
        <div class="signature-label">Company Stamp</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="footer">
    <p>Thank you for your business! | ${company.name}</p>
  </div>
</body>
</html>
  `;
}
