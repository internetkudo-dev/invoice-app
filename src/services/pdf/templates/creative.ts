import { InvoiceData } from '../../../types';
import { pdfTranslations } from '../translations';

export function creativeTemplate(data: InvoiceData): string {
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
      font-family: 'Segoe UI', Tahoma, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      line-height: 1.5;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      min-height: 100vh;
      padding: 30px;
      ${company.isGrayscale ? 'filter: grayscale(100%);' : ''}
    }
    .invoice {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
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
      max-width: 120px;
      max-height: 50px;
      filter: brightness(0) invert(1);
    }
    .company-name {
      font-size: 24px;
      font-weight: 700;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h1 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.8;
    }
    .invoice-info .number {
      font-size: 30px;
      font-weight: 200;
      margin-top: 5px;
    }
    .content {
      padding: 30px;
    }
    .parties {
      display: flex;
      gap: 30px;
      margin-bottom: 30px;
    }
    .party-box {
      flex: 1;
      padding: 20px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
    }
    .party-box h3 {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #764ba2;
      margin-bottom: 10px;
    }
    .dates {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }
    .date-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 20px;
      border-radius: 40px;
      font-size: 11px;
    }
    .date-box span {
      opacity: 0.8;
      margin-right: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    th {
      text-align: left;
      padding: 12px 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    th:first-child { border-radius: 12px 0 0 12px; }
    th:last-child { border-radius: 0 12px 12px 0; text-align: right; }
    td {
      padding: 15px;
      border-bottom: 1px solid #f0f0f0;
    }
    td:last-child { text-align: right; font-weight: 600; color: #764ba2; }
    .extra-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 25px;
    }
    .payment-area {
        flex: 1;
    }
    .pay-btn {
        display: inline-block;
        padding: 10px 20px;
        border-radius: 25px;
        background: #764ba2;
        color: white;
        text-decoration: none;
        font-weight: bold;
        margin-right: 8px;
        margin-bottom: 8px;
        box-shadow: 0 4px 15px rgba(118, 75, 162, 0.3);
        font-size: 12px;
    }
    .summary-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 14px;
      min-width: 280px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      font-size: 13px;
    }
    .summary-row.total {
      font-size: 20px;
      font-weight: 700;
      border-top: 2px solid rgba(255,255,255,0.3);
      margin-top: 10px;
      padding-top: 15px;
      border-bottom: none;
    }
    .signatures {
      display: flex;
      justify-content: center;
      gap: 50px;
      margin-top: 40px;
    }
    .signature-box {
      text-align: center;
    }
    .signature-box img {
      max-width: 100px;
      max-height: 40px;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
    }
    .signature-label {
      font-size: 10px;
      color: #764ba2;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 8px;
    }
    .footer {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 20px;
      font-size: 12px;
    }
    .bank-info {
        margin-top: 25px;
        padding: 15px;
        border-radius: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8eb;
        font-size: 11px;
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
          <h1>${details.type === 'offer' ? (t.offer || 'OFFER') : t.invoice}</h1>
          <div class="number">${details.number}</div>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="parties">
        <div class="party-box">
          <h3>${t.payment}</h3>
          <p><strong>${company.name}</strong></p>
          <p>${company.address}</p>
        </div>
        <div class="party-box">
          <h3>${t.billTo}</h3>
          <p><strong>${client.name}</strong></p>
          <p>${client.address}</p>
          <p>${client.email}</p>
        </div>
      </div>

      <div class="dates">
        <div class="date-box">
          <span>${t.date}</span> <strong>${details.issueDate}</strong>
        </div>
        <div class="date-box">
          <span>${details.type === 'offer' ? (t.validUntil || 'VALID UNTIL') : t.due}</span> <strong>${details.dueDate || 'On Receipt'}</strong>
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

      <div class="extra-section">
        <div class="payment-area">
            ${(company.paymentLinkStripe || company.paymentLinkPaypal) ? `
                <div style="margin-bottom: 25px;">
                    <h4 style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #764ba2; margin-bottom: 15px;">${t.payNow}</h4>
                    ${company.paymentLinkStripe ? `<a href="${company.paymentLinkStripe}" class="pay-btn">Stripe Pay</a>` : ''}
                    ${company.paymentLinkPaypal ? `<a href="${company.paymentLinkPaypal}" class="pay-btn">PayPal</a>` : ''}
                </div>
            ` : ''}

            ${details.notes ? `
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 10px; text-transform: uppercase; color: #764ba2; margin-bottom: 5px;">Notes</h4>
                    <p style="font-size: 12px; color: #4b5563;">${details.notes}</p>
                </div>
            ` : ''}

            ${details.terms ? `
                <div>
                    <h4 style="font-size: 10px; text-transform: uppercase; color: #764ba2; margin-bottom: 5px;">${t.terms}</h4>
                    <p style="font-size: 11px; color: #4b5563;">${details.terms}</p>
                </div>
            ` : ''}

            ${(company.bankName || company.bankIban) ? `
                <div class="bank-info">
                    ${company.bankName ? `<p><strong>${t.bank}:</strong> ${company.bankName}</p>` : ''}
                    ${company.bankIban ? `<p><strong>${t.iban}:</strong> ${company.bankIban}</p>` : ''}
                    ${company.bankSwift ? `<p><strong>${t.swift}:</strong> ${company.bankSwift}</p>` : ''}
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
          <div class="summary-row total">
            <span>${t.totalDue}</span>
            <span>${formatCurrency(summary.total)}</span>
          </div>
        </div>
      </div>

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
