import { InvoiceData } from '../../../types';
import { pdfTranslations } from '../translations';

export function receiptTemplate(data: InvoiceData): string {
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

  const qrData = encodeURIComponent(`INVOICE:${details.number}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}&color=000000`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${details.number}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 72mm;
      padding: 2mm;
      font-size: 11px;
      line-height: 1.2;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .header { margin-bottom: 10px; }
    .logo { max-width: 40mm; max-height: 15mm; margin-bottom: 5px; }
    .company-name { font-size: 14px; font-weight: bold; text-transform: uppercase; }
    .invoice-info { margin-bottom: 10px; font-size: 10px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .table th { text-align: left; border-bottom: 1px solid #000; padding: 2px 0; font-size: 10px; }
    .table td { padding: 3px 0; vertical-align: top; }
    .item-row { display: flex; justify-content: space-between; }
    .item-desc { font-weight: bold; }
    .item-details { font-size: 9px; margin-left: 5px; }
    .summary { margin-top: 5px; }
    .summary-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .total-row { font-size: 14px; font-weight: bold; border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; }
    .qr-container { margin: 15px 0; display: flex; justify-content: center; }
    .footer { font-size: 9px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header center">
    ${company.logoUrl ? `<img src="${company.logoUrl}" class="logo">` : ''}
    <div class="company-name">${company.name}</div>
    <div style="font-size: 9px;">${company.address}</div>
    ${company.phone ? `<div style="font-size: 9px;">Tel: ${company.phone}</div>` : ''}
    ${company.taxId ? `<div style="font-size: 9px;">Tax ID: ${company.taxId}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div class="invoice-info">
    <div class="bold">${details.type === 'offer' ? (t.offer || 'OFFER') : t.invoice}: ${details.number}</div>
    <div>${t.date}: ${details.issueDate}</div>
    ${details.dueDate ? `<div>${details.type === 'offer' ? (t.validUntil || 'VALID UNTIL') : t.due}: ${details.dueDate}</div>` : ''}
    <div class="divider"></div>
    <div class="bold">${t.billTo}:</div>
    <div>${client.name}</div>
  </div>

  <div class="divider"></div>

  <div class="items">
    ${items.map(item => `
      <div style="margin-bottom: 5px;">
        <div class="item-row">
            <span class="item-desc">${item.description}</span>
        </div>
        <div class="item-row item-details">
            <span>${item.quantity} ${item.unit || ''} x ${formatCurrency(item.price)}</span>
            <span>${formatCurrency(item.total)}</span>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="divider" style="border-top-style: solid;"></div>

  <div class="summary">
    <div class="summary-row">
      <span>${t.subtotal}:</span>
      <span>${formatCurrency(summary.subtotal)}</span>
    </div>
    <div class="summary-row">
      <span>${t.tax}:</span>
      <span>${formatCurrency(summary.tax)}</span>
    </div>
    ${summary.discount > 0 ? `
    <div class="summary-row">
      <span>${t.discount}:</span>
      <span>-${formatCurrency(summary.discount)}</span>
    </div>
    ` : ''}
    <div class="summary-row total-row">
      <span>${t.totalDue}:</span>
      <span>${formatCurrency(summary.total)}</span>
    </div>
  </div>

  <div class="divider"></div>
  
  <div style="margin-top: 10px; text-align: center;">
      ${company.signatureUrl ? `
        <div style="margin-bottom: 10px;">
          <img src="${company.signatureUrl}" style="max-height: 30px; max-width: 100px;">
          <div style="font-size: 8px;">${t.signature}</div>
        </div>
      ` : ''}
       ${(details.showBuyerSignature && details.buyerSignatureUrl) ? `
        <div style="margin-bottom: 10px;">
          <img src="${details.buyerSignatureUrl}" style="max-height: 30px; max-width: 100px;">
          <div style="font-size: 8px;">${t.buyerSignature || 'Buyer'}</div>
        </div>
       ` : ''}
  </div>

  <div class="qr-container">
    <img src="${qrCodeUrl}" width="100" height="100">
  </div>

  ${details.notes ? `<div class="divider"></div><div class="center" style="font-size: 9px;">${details.notes}</div>` : ''}

  <div class="footer center">
    <div class="bold">THANK YOU FOR YOUR BUSINESS!</div>
    <div>Printed on: ${new Date().toLocaleString()}</div>
  </div>
</body>
</html>
  `;
}
