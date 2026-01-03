import { InvoiceData } from '../../../types';
import { pdfTranslations } from '../translations';

export function corporateTemplate(data: InvoiceData): string {
  const { company, client, details, items, summary } = data;
  const lang = details.language || 'en';
  const t = pdfTranslations[lang] || pdfTranslations.en;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(lang === 'sq' ? 'sq-AL' : lang === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: details.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

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
      ${company.isGrayscale ? 'filter: grayscale(100%);' : ''}
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
    .extra-info {
      flex: 1;
      max-width: 350px;
    }
    .notes-box {
      background: #f8fafc;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .notes-box h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .pay-button { 
        display: inline-block; 
        padding: 10px 20px; 
        border: 1px solid #0f172a;
        border-radius: 4px; 
        text-decoration: none; 
        font-weight: bold; 
        font-size: 12px; 
        margin-right: 10px;
        color: #0f172a;
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
    .bank-bar {
        margin-top: 40px;
        padding: 20px;
        background: #f8fafc;
        border-top: 2px solid #0f172a;
        display: flex;
        justify-content: space-around;
        font-size: 11px;
    }
    .footer {
      background: #0f172a;
      padding: 20px 40px;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      ${company.logoUrl ? `<img src="${company.logoUrl}" class="logo" alt="">` : `<div class="company-name">${company.name}</div>`}
    </div>
    <div class="header-right">
      <h1>${details.type === 'offer' ? (t.offer || 'OFFER') : t.invoice}</h1>
      <p>${details.number}</p>
    </div>
  </div>

  <div class="content">
    <div class="info-grid">
      <div class="info-box">
        <h3>${t.billTo}</h3>
        <p><strong>${client.name}</strong></p>
        <p>${client.address}</p>
        <p>${client.email}</p>
      </div>
      <div class="info-box">
        <h3>${t.details}</h3>
        <p><strong>${t.date}:</strong> ${details.issueDate}</p>
        <p><strong>${details.type === 'offer' ? (t.validUntil || 'VALID UNTIL') : t.due}:</strong> ${details.dueDate || 'On Receipt'}</p>
        <p><strong>Currency:</strong> ${details.currency}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${t.description}</th>
          <th>${t.qty}</th>
          <th>${t.price}</th>
          <th>${t.total}</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity} ${item.unit || ''}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(item.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="extra-info">
        ${(company.paymentLinkStripe || company.paymentLinkPaypal) ? `
            <div style="margin-bottom: 25px;">
                <h4 style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 12px;">${t.payNow}</h4>
                ${company.paymentLinkStripe ? `<a href="${company.paymentLinkStripe}" class="pay-button">Stripe Secure</a>` : ''}
                ${company.paymentLinkPaypal ? `<a href="${company.paymentLinkPaypal}" class="pay-button">PayPal.me</a>` : ''}
            </div>
        ` : ''}

        ${details.notes ? `
            <div class="notes-box">
                <h4>Notes</h4>
                <p style="color: #475569;">${details.notes}</p>
            </div>
        ` : ''}

        ${details.terms ? `
            <div class="notes-box">
                <h4>${t.terms}</h4>
                <p style="color: #475569; font-size: 11px;">${details.terms}</p>
            </div>
        ` : ''}
      </div>

      <div class="summary-box">
        <div class="summary-row">
          <span>${t.subtotal}</span>
          <span>${formatCurrency(summary.subtotal)}</span>
        </div>
        <div class="summary-row">
          <span>${t.tax}</span>
          <span>${formatCurrency(summary.tax)}</span>
        </div>
        ${summary.discount > 0 ? `
        <div class="summary-row">
          <span>${t.discount}</span>
          <span>-${formatCurrency(summary.discount)}</span>
        </div>
        ` : ''}
        <div class="summary-row">
          <span>${t.totalDue}</span>
          <span>${formatCurrency(summary.total)}</span>
        </div>
      </div>
    </div>

    ${(company.bankName || company.bankIban) ? `
    <div class="bank-bar">
        ${company.bankName ? `<div><strong>${t.bank}:</strong> ${company.bankName}</div>` : ''}
        ${company.bankIban ? `<div><strong>${t.iban}:</strong> ${company.bankIban}</div>` : ''}
        ${company.bankSwift ? `<div><strong>${t.swift}:</strong> ${company.bankSwift}</div>` : ''}
    </div>
    ` : ''}

    <div class="signatures">
      ${company.signatureUrl ? `
      <div class="signature-box">
        <img src="${company.signatureUrl}" alt="">
        <div class="signature-label">${t.signature || 'Seller'}</div>
      </div>
      ` : ''}
      ${(details.showBuyerSignature && details.buyerSignatureUrl) ? `
      <div class="signature-box">
        <img src="${details.buyerSignatureUrl}" alt="">
        <div class="signature-label">${t.buyerSignature || 'Buyer'}</div>
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
