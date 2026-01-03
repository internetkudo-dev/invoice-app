import { InvoiceData } from '../../../types';

export function minimalistTemplate(data: InvoiceData): string {
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #111;
      line-height: 1.7;
      padding: 60px;
      background: white;
    }
    .header {
      margin-bottom: 80px;
    }
    .logo {
      max-width: 100px;
      max-height: 40px;
      margin-bottom: 30px;
    }
    .company-name {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 30px;
    }
    .invoice-number {
      font-size: 48px;
      font-weight: 200;
      color: #000;
      letter-spacing: -2px;
    }
    .meta {
      display: flex;
      gap: 100px;
      margin-bottom: 60px;
    }
    .meta-block label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #999;
      margin-bottom: 8px;
    }
    .meta-block p {
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 60px;
    }
    th {
      text-align: left;
      padding: 20px 0;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #999;
      border-bottom: 1px solid #eee;
    }
    th:last-child { text-align: right; }
    td {
      padding: 25px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    td:last-child { text-align: right; }
    .summary {
      display: flex;
      justify-content: flex-end;
    }
    .summary-box {
      width: 250px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
    }
    .summary-row label {
      color: #999;
    }
    .summary-row.total {
      border-top: 1px solid #111;
      margin-top: 15px;
      padding-top: 20px;
      font-size: 24px;
      font-weight: 500;
    }
    .summary-row.total label {
      color: #111;
    }
    .footer {
      margin-top: 100px;
      color: #999;
      font-size: 12px;
    }
    .signatures {
      display: flex;
      gap: 80px;
      margin-top: 80px;
    }
    .signature-box img {
      max-width: 100px;
      max-height: 40px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="header">
    ${company.logoUrl ? `<img src="${company.logoUrl}" class="logo" alt="">` : `<div class="company-name">${company.name}</div>`}
    <div class="invoice-number">${details.number}</div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <label>Date</label>
      <p>${details.issueDate}</p>
    </div>
    <div class="meta-block">
      <label>Due</label>
      <p>${details.dueDate || 'On Receipt'}</p>
    </div>
    <div class="meta-block">
      <label>To</label>
      <p>${client.name}</p>
      <p>${client.email}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
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
        <label>Subtotal</label>
        <span>${details.currency} ${summary.subtotal.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <label>Tax</label>
        <span>${details.currency} ${summary.tax.toFixed(2)}</span>
      </div>
      ${summary.discount > 0 ? `
      <div class="summary-row">
        <label>Discount</label>
        <span>-${details.currency} ${summary.discount.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="summary-row total">
        <label>Total</label>
        <span>${details.currency} ${summary.total.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="signatures">
    ${company.signatureUrl ? `<div class="signature-box"><img src="${company.signatureUrl}" alt=""></div>` : ''}
    ${company.stampUrl ? `<div class="signature-box"><img src="${company.stampUrl}" alt=""></div>` : ''}
  </div>

  <div class="footer">
    <p>${company.name} · ${company.address}</p>
  </div>
</body>
</html>
  `;
}
