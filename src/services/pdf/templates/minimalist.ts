import { InvoiceData } from '../../../types';
import { pdfTranslations } from '../translations';

export function minimalistTemplate(data: InvoiceData): string {
  const { company, client, details, items, summary } = data;
  const isGrayscale = company.isGrayscale;
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #111;
      line-height: 1.5;
      padding: 40px;
      background: white;
      ${isGrayscale ? 'filter: grayscale(100%);' : ''}
    }
    .header {
      margin-bottom: 40px;
    }
    .logo {
      max-width: 100px;
      max-height: 40px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    .invoice-number {
      font-size: 32px;
      font-weight: 200;
      color: #000;
      letter-spacing: -1px;
    }
    .meta {
      display: flex;
      gap: 40px;
      margin-bottom: 40px;
    }
    .meta-block label {
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #999;
      margin-bottom: 4px;
    }
    .meta-block p {
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      text-align: left;
      padding: 10px 0;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #999;
      border-bottom: 1px solid #eee;
    }
    th:last-child { text-align: right; }
    td {
      padding: 15px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    td:last-child { text-align: right; }
    .summary-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }
    .extra-info {
        flex: 1;
        max-width: 300px;
    }
    .pay-button { 
        display: inline-block; 
        padding: 8px 0; 
        margin-right: 15px;
        color: #111;
        font-weight: 600;
        text-decoration: underline;
        font-size: 11px;
    }
    .summary-box {
      width: 250px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
    }
    .summary-row label {
      color: #999;
    }
    .summary-row.total {
      border-top: 1px solid #111;
      margin-top: 10px;
      padding-top: 15px;
      font-size: 20px;
      font-weight: 500;
    }
    .summary-row.total label {
      color: #111;
    }
    .footer {
      margin-top: 60px;
      color: #999;
      font-size: 11px;
    }
    .signatures {
      display: flex;
      gap: 60px;
      margin-top: 40px;
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
      <label>${t.date}</label>
      <p>${details.issueDate}</p>
    </div>
    <div class="meta-block">
      <label>${t.due}</label>
      <p>${details.dueDate || 'On Receipt'}</p>
    </div>
    <div class="meta-block">
      <label>${t.billTo}</label>
      <p><strong>${client.name}</strong></p>
      <p>${client.address}</p>
      <p>${client.email}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${t.description}</th>
        <th>${t.qty}</th>
        <th>${t.price}</th>
        <th style="text-align: right;">${t.total}</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity} ${item.unit || ''}</td>
          <td>${formatCurrency(item.price)}</td>
          <td style="text-align: right;">${formatCurrency(item.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary-section">
    <div class="extra-info">
        ${(company.paymentLinkStripe || company.paymentLinkPaypal) ? `
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 10px; text-transform: uppercase; color: #999; margin-bottom: 15px;">${t.payNow}</label>
                ${company.paymentLinkStripe ? `<a href="${company.paymentLinkStripe}" class="pay-button">Stripe</a>` : ''}
                ${company.paymentLinkPaypal ? `<a href="${company.paymentLinkPaypal}" class="pay-button">PayPal</a>` : ''}
            </div>
        ` : ''}
        
        ${details.notes ? `
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-size: 10px; text-transform: uppercase; color: #999; margin-bottom: 5px;">Notes</label>
                <p style="font-size: 12px; color: #666;">${details.notes}</p>
            </div>
        ` : ''}

        ${details.terms ? `
            <div>
                <label style="display: block; font-size: 10px; text-transform: uppercase; color: #999; margin-bottom: 5px;">${t.terms}</label>
                <p style="font-size: 12px; color: #666;">${details.terms}</p>
            </div>
        ` : ''}
    </div>

    <div class="summary-box">
      <div class="summary-row">
        <label>${t.subtotal}</label>
        <span>${formatCurrency(summary.subtotal)}</span>
      </div>
      <div class="summary-row">
        <label>${t.tax}</label>
        <span>${formatCurrency(summary.tax)}</span>
      </div>
      ${summary.discount > 0 ? `
      <div class="summary-row">
        <label>${t.discount}</label>
        <span>-${formatCurrency(summary.discount)}</span>
      </div>
      ` : ''}
      <div class="summary-row total">
        <label>${t.totalDue}</label>
        <span>${formatCurrency(summary.total)}</span>
      </div>
    </div>
  </div>

  ${(company.bankName || company.bankIban) ? `
    <div style="margin-top: 60px;">
        <label style="display: block; font-size: 10px; text-transform: uppercase; color: #999; margin-bottom: 15px;">${t.payment}</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 12px;">
            ${company.bankName ? `<div><label style="color: #999;">${t.bank}</label><p>${company.bankName}</p></div>` : ''}
            ${company.bankIban ? `<div><label style="color: #999;">${t.iban}</label><p>${company.bankIban}</p></div>` : ''}
            ${company.bankSwift ? `<div><label style="color: #999;">${t.swift}</label><p>${company.bankSwift}</p></div>` : ''}
        </div>
    </div>
  ` : ''}

  <div class="signatures">
    ${company.signatureUrl ? `<div class="signature-box"><label style="display: block; font-size: 8px; color: #999; margin-bottom: 5px;">Seller Signature</label><img src="${company.signatureUrl}" alt=""></div>` : ''}
    ${details.buyerSignatureUrl ? `<div class="signature-box"><label style="display: block; font-size: 8px; color: #999; margin-bottom: 5px;">Buyer Signature</label><img src="${details.buyerSignatureUrl}" alt=""></div>` : ''}
    ${company.stampUrl ? `<div class="signature-box"><label style="display: block; font-size: 8px; color: #999; margin-bottom: 5px;">Stamp</label><img src="${company.stampUrl}" alt=""></div>` : ''}
  </div>

  <div class="footer">
    <p>${company.name} · ${company.address} · ${company.email}</p>
  </div>
</body>
</html>
  `;
}
