import { Contract, Client, Profile } from '../../types';

interface ContractPDFData {
    contract: Contract;
    client: Client | null;
    profile: Profile;
}

export function generateServiceAgreementHTML(data: ContractPDFData): string {
    const { contract, client, profile } = data;
    const content = contract.content || {};
    const today = new Date(contract.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const primaryColor = profile.primary_color || '#6366f1';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1e293b;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid ${primaryColor};
        }
        .header h1 { 
            font-size: 28px; 
            color: ${primaryColor};
            margin-bottom: 8px;
        }
        .header .subtitle {
            color: #64748b;
            font-size: 14px;
        }
        .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 40px;
        }
        .party {
            flex: 1;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
        }
        .party-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .party-name {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
        }
        .party-details {
            font-size: 14px;
            color: #64748b;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: ${primaryColor};
            border-bottom: 2px solid ${primaryColor};
            padding-bottom: 8px;
            margin-bottom: 16px;
        }
        .section-content {
            font-size: 14px;
            color: #334155;
        }
        .terms {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            font-size: 13px;
            color: #475569;
        }
        .terms p {
            margin-bottom: 12px;
        }
        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            gap: 40px;
        }
        .signature-box {
            flex: 1;
            text-align: center;
        }
        .signature-line {
            border-bottom: 2px solid #1e293b;
            height: 80px;
            margin-bottom: 8px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 8px;
        }
        .signature-line img {
            max-height: 70px;
            max-width: 100%;
        }
        .signature-label {
            font-size: 14px;
            color: #64748b;
        }
        .signature-name {
            font-size: 14px;
            font-weight: bold;
            margin-top: 4px;
        }
        .date-line {
            margin-top: 20px;
            font-size: 12px;
            color: #64748b;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${contract.title}</h1>
        <div class="subtitle">Service Agreement • ${today}</div>
    </div>

    <div class="parties">
        <div class="party">
            <div class="party-label">Service Provider</div>
            <div class="party-name">${profile.company_name || 'Provider'}</div>
            <div class="party-details">
                ${profile.address || ''}<br>
                ${profile.email || ''}<br>
                ${profile.tax_id ? `Tax ID: ${profile.tax_id}` : ''}
            </div>
        </div>
        <div class="party">
            <div class="party-label">Client</div>
            <div class="party-name">${client?.name || 'Client'}</div>
            <div class="party-details">
                ${client?.address || ''}<br>
                ${client?.email || ''}<br>
                ${client?.tax_id ? `Tax ID: ${client.tax_id}` : ''}
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">1. Scope of Services</div>
        <div class="section-content">
            ${content.scope || 'Services to be provided as agreed between parties.'}
        </div>
    </div>

    <div class="section">
        <div class="section-title">2. Payment Terms</div>
        <div class="section-content">
            ${content.paymentTerms || 'Payment terms to be agreed upon by both parties.'}
        </div>
    </div>

    <div class="section">
        <div class="section-title">3. Timeline</div>
        <div class="section-content">
            ${content.timeline || 'Project timeline to be determined.'}
        </div>
    </div>

    <div class="section">
        <div class="section-title">4. General Terms</div>
        <div class="terms">
            <p><strong>Confidentiality:</strong> Both parties agree to keep all project-related information confidential and not disclose it to third parties without written consent.</p>
            <p><strong>Intellectual Property:</strong> Upon full payment, all deliverables and intellectual property rights will be transferred to the Client.</p>
            <p><strong>Termination:</strong> Either party may terminate this agreement with 14 days written notice. Outstanding payments remain due upon termination.</p>
            <p><strong>Liability:</strong> The Service Provider's liability is limited to the total amount paid under this agreement.</p>
            <p><strong>Governing Law:</strong> This agreement shall be governed by the laws of the jurisdiction where the Service Provider is located.</p>
        </div>
    </div>

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-line">
                ${contract.signature_url ? `<img src="${contract.signature_url}" alt="Provider Signature">` : ''}
            </div>
            <div class="signature-label">Service Provider Signature</div>
            <div class="signature-name">${profile.company_name || ''}</div>
            <div class="date-line">Date: _______________</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">
                ${contract.counterparty_signature_url ? `<img src="${contract.counterparty_signature_url}" alt="Client Signature">` : ''}
            </div>
            <div class="signature-label">Client Signature</div>
            <div class="signature-name">${client?.name || ''}</div>
            <div class="date-line">Date: _______________</div>
        </div>
    </div>

    <div class="footer">
        Contract ID: ${contract.id}<br>
        Generated on ${new Date().toLocaleDateString()}
    </div>
</body>
</html>
    `;
}

export function generateNDAHTML(data: ContractPDFData): string {
    const { contract, client, profile } = data;
    const content = contract.content || {};
    const today = new Date(contract.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const primaryColor = profile.primary_color || '#6366f1';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1e293b;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid ${primaryColor};
        }
        .header h1 { 
            font-size: 28px; 
            color: ${primaryColor};
            margin-bottom: 8px;
        }
        .header .subtitle {
            color: #64748b;
            font-size: 14px;
        }
        .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 40px;
        }
        .party {
            flex: 1;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
        }
        .party-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .party-name {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
        }
        .party-details {
            font-size: 14px;
            color: #64748b;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: ${primaryColor};
            border-bottom: 2px solid ${primaryColor};
            padding-bottom: 8px;
            margin-bottom: 16px;
        }
        .section-content {
            font-size: 14px;
            color: #334155;
        }
        .terms {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            font-size: 13px;
            color: #475569;
        }
        .terms p {
            margin-bottom: 12px;
        }
        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            gap: 40px;
        }
        .signature-box {
            flex: 1;
            text-align: center;
        }
        .signature-line {
            border-bottom: 2px solid #1e293b;
            height: 80px;
            margin-bottom: 8px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 8px;
        }
        .signature-line img {
            max-height: 70px;
            max-width: 100%;
        }
        .signature-label {
            font-size: 14px;
            color: #64748b;
        }
        .signature-name {
            font-size: 14px;
            font-weight: bold;
            margin-top: 4px;
        }
        .date-line {
            margin-top: 20px;
            font-size: 12px;
            color: #64748b;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Non-Disclosure Agreement</h1>
        <div class="subtitle">Confidentiality Agreement • ${today}</div>
    </div>

    <div class="parties">
        <div class="party">
            <div class="party-label">Disclosing Party</div>
            <div class="party-name">${profile.company_name || 'Disclosing Party'}</div>
            <div class="party-details">
                ${profile.address || ''}<br>
                ${profile.email || ''}
            </div>
        </div>
        <div class="party">
            <div class="party-label">Receiving Party</div>
            <div class="party-name">${client?.name || 'Receiving Party'}</div>
            <div class="party-details">
                ${client?.address || ''}<br>
                ${client?.email || ''}
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">1. Definition of Confidential Information</div>
        <div class="section-content">
            ${content.confidentialInfo || 'All non-public information disclosed by the Disclosing Party to the Receiving Party, whether in writing, orally, or by any other means.'}
        </div>
    </div>

    <div class="section">
        <div class="section-title">2. Duration of Confidentiality</div>
        <div class="section-content">
            The obligations of confidentiality shall remain in effect for: <strong>${content.duration || '2 years from the date of disclosure'}</strong>.
        </div>
    </div>

    <div class="section">
        <div class="section-title">3. Obligations</div>
        <div class="terms">
            <p>The Receiving Party agrees to:</p>
            <p>• Hold and maintain the Confidential Information in strict confidence.</p>
            <p>• Not disclose the Confidential Information to any third parties without prior written consent.</p>
            <p>• Use the Confidential Information solely for the purpose for which it was disclosed.</p>
            <p>• Take reasonable measures to protect the secrecy of the Confidential Information.</p>
            <p>• Promptly notify the Disclosing Party if any unauthorized disclosure occurs.</p>
        </div>
    </div>

    <div class="section">
        <div class="section-title">4. Exclusions</div>
        <div class="terms">
            <p>This agreement does not apply to information that:</p>
            <p>• Is or becomes publicly available through no fault of the Receiving Party.</p>
            <p>• Was in the Receiving Party's possession prior to disclosure.</p>
            <p>• Is independently developed by the Receiving Party without use of Confidential Information.</p>
            <p>• Is required to be disclosed by law or court order.</p>
        </div>
    </div>

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-line">
                ${contract.signature_url ? `<img src="${contract.signature_url}" alt="Disclosing Party Signature">` : ''}
            </div>
            <div class="signature-label">Disclosing Party Signature</div>
            <div class="signature-name">${profile.company_name || ''}</div>
            <div class="date-line">Date: _______________</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">
                ${contract.counterparty_signature_url ? `<img src="${contract.counterparty_signature_url}" alt="Receiving Party Signature">` : ''}
            </div>
            <div class="signature-label">Receiving Party Signature</div>
            <div class="signature-name">${client?.name || ''}</div>
            <div class="date-line">Date: _______________</div>
        </div>
    </div>

    <div class="footer">
        Contract ID: ${contract.id}<br>
        Generated on ${new Date().toLocaleDateString()}
    </div>
</body>
</html>
    `;
}

export function generateContractHTML(data: ContractPDFData): string {
    const { contract } = data;

    if (contract.type === 'nda') {
        return generateNDAHTML(data);
    }

    // Default to service agreement
    return generateServiceAgreementHTML(data);
}
