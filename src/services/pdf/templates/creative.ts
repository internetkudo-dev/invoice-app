import { InvoiceData } from '../../../types';

export function creativeTemplate(data: InvoiceData): string {
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
      font-family: 'Segoe UI', Tahoma, sans-serif;
      font-size: 14px;
      color: #1a1a1a;
      line-height: 1.6;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      min-height: 100vh;
      padding: 40px;
    }
    .invoice {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 100%;
      height: 200%;
      background: rgba(255,255,255,0.1);
      transform: rotate(30deg);
    }
    .header-content {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      max-width: 140px;
      max-height: 60px;
      filter: brightness(0) invert(1);
    }
    .company-name {
      font-size: 28px;
      font-weight: 700;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h1 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 3px;
      opacity: 0.8;
    }
    .invoice-info .number {
      font-size: 36px;
      font-weight: 200;
      margin-top: 5px;
    }
    .content {
      padding: 40px;
    }
    .parties {
      display: flex;
      gap: 40px;
      margin-bottom: 40px;
    }
    .party-box {
      flex: 1;
      padding: 25px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
    }
    .party-box h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #764ba2;
      margin-bottom: 12px;
    }
    .dates {
      display: flex;
      gap: 30px;
      margin-bottom: 40px;
    }
    .date-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 50px;
    }
    .date-box span {
      opacity: 0.8;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      text-align: left;
      padding: 15px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    th:first-child { border-radius: 12px 0 0 12px; }
    th:last-child { border-radius: 0 12px 12px 0; text-align: right; }
    td {
      padding: 20px;
      border-bottom: 1px solid #f0f0f0;
    }
    td:last-child { text-align: right; font-weight: 600; color: #764ba2; }
    .summary {
      display: flex;
      justify-content: flex-end;
    }
    .summary-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 16px;
      min-width: 300px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
    }
    .summary-row.total {
      font-size: 24px;
      font-weight: 700;
      border-top: 2px solid rgba(255,255,255,0.3);
      margin-top: 15px;
      padding-top: 20px;
    }
    .signatures {
      display: flex;
      justify-content: center;
      gap: 60px;
      margin-top: 50px;
    }
    .signature-box {
      text-align: center;
    }
    .signature-box img {
      max-width: 120px;
      max-height: 50px;
    }
    .signature-label {
      font-size: 11px;
      color: #764ba2;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 10px;
    }
    .footer {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 25px;
      font-size: 14px;
    }
    .footer span {
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="header-content">
        <div>
          ${company.logoUrl ? `<img src="${company.logoUrl}" class="logo" alt="">` : `<div class="company-name">${company.name}</div>`}
        </div>
        <div class="invoice-info">
          <h1>Invoice</h1>
          <div class="number">${details.number}</div>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="parties">
        <div class="party-box">
          <h3>From</h3>
          <p><strong>${company.name}</strong></p>
          <p>${company.address}</p>
        </div>
        <div class="party-box">
          <h3>Bill To</h3>
          <p><strong>${client.name}</strong></p>
          <p>${client.address}</p>
          <p>${client.email}</p>
        </div>
      </div>

      <div class="dates">
        <div class="date-box">
          <span>Issue Date</span> <strong>${details.issueDate}</strong>
        </div>
        <div class="date-box">
          <span>Due Date</span> <strong>${details.dueDate || 'On Receipt'}</strong>
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

      <div class="summary">
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
          <div class="summary-row total">
            <span>Total</span>
            <span>${details.currency} ${summary.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="signatures">
        ${company.signatureUrl ? `
        <div class="signature-box">
          <img src="${company.signatureUrl}" alt="">
          <div class="signature-label">Signature</div>
        </div>
        ` : ''}
        ${company.stampUrl ? `
        <div class="signature-box">
          <img src="${company.stampUrl}" alt="">
          <div class="signature-label">Stamp</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="footer">
      <span>Thank you for your business! ✨</span>
    </div>
  </div>
</body>
</html>
  `;
}
