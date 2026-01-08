import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { ArrowLeft, Download, Share2, FileText, Calendar, TrendingUp } from 'lucide-react-native';
import * as Print from 'expo-print';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button, Card } from '../../components/common';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';

export function ReportPreviewScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { isDark, language } = useTheme();
    const type = route.params?.subtype || 'daily';
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState<any>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        fetchReportData();
    }, [type]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            if (type === 'daily') {
                const today = new Date().toISOString().split('T')[0];
                const { data: invoices } = await supabase.from('invoices').select('*').eq('issue_date', today);
                const { data: expenses } = await supabase.from('expenses').select('*').eq('date', today);

                const totalSales = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
                const totalExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

                setData({
                    title: 'Raporti Ditor',
                    date: today,
                    metrics: [
                        { label: 'Total Sales', value: formatCurrency(totalSales), icon: TrendingUp, color: '#10b981' },
                        { label: 'Total Expenses', value: formatCurrency(totalExpenses), icon: FileText, color: '#ef4444' },
                        { label: 'Net Profit', value: formatCurrency(totalSales - totalExpenses), icon: TrendingUp, color: '#6366f1' },
                    ],
                    transactions: [
                        ...(invoices?.map(inv => ({ id: inv.id, desc: `Invoice ${inv.invoice_number}`, amount: inv.total_amount, type: 'sale' })) || []),
                        ...(expenses?.map(exp => ({ id: exp.id, desc: exp.description, amount: exp.amount, type: 'expense' })) || []),
                    ]
                });
            } else {
                // Sales Book - fetch monthly invoice data
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                const start = startOfMonth.toISOString().split('T')[0];

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id, active_company_id')
                    .eq('id', user?.id)
                    .single();

                const companyId = profile?.active_company_id || profile?.company_id || user?.id;

                const { data: invoices } = await supabase
                    .from('invoices')
                    .select('*, client:clients(name, tax_id, nui, fiscal_number, vat_number, address)')
                    .or(`user_id.eq.${user?.id},company_id.eq.${companyId}`)
                    .gte('issue_date', start)
                    .eq('type', 'invoice')
                    .order('issue_date', { ascending: false });

                const totalSales = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
                const paidTotal = invoices?.filter(i => i.status === 'paid').reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
                const taxTotal = invoices?.reduce((sum, inv) => sum + Number(inv.tax_amount || 0), 0) || 0;

                const monthName = startOfMonth.toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' });

                setData({
                    title: 'Libri i Shitjes',
                    date: monthName,
                    metrics: [
                        { label: 'Total Sales', value: formatCurrency(totalSales), icon: TrendingUp, color: '#6366f1' },
                        { label: 'Paid', value: formatCurrency(paidTotal), icon: TrendingUp, color: '#10b981' },
                        { label: 'Tax (TVSH)', value: formatCurrency(taxTotal), icon: FileText, color: '#f59e0b' },
                    ],
                    // Store full invoice object for detailed report
                    rawInvoices: invoices || [],
                    transactions: invoices?.map(inv => ({
                        id: inv.id,
                        desc: `${inv.invoice_number} - ${(inv.client as any)?.name || 'Guest'}`,
                        amount: inv.total_amount,
                        type: 'sale',
                        status: inv.status,
                    })) || [],
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Report: ${data?.title}\nDate: ${data?.date}\nTotal Sales: ${data?.metrics[0]?.value}`,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to share report');
        }
    };

    const handleExportPdf = async () => {
        if (!data) return;

        setExporting(true);
        try {
            const html = type === 'daily' ? generateDailyReportHtml(data) : generateSalesBookHtml(data);
            await Print.printAsync({ html, orientation: Print.Orientation.landscape });
        } catch (error) {
            console.error('PDF export error:', error);
            Alert.alert('Error', 'Failed to generate PDF');
        } finally {
            setExporting(false);
        }
    };

    const generateDailyReportHtml = (reportData: any) => {
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        };

        return `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                @page { size: A4; margin: 10mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 14px; color: #000; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
                .title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
                .date { font-size: 14px; color: #666; }
                .metrics { display: flex; justify-content: space-around; margin-bottom: 30px; }
                .metric { text-align: center; padding: 15px; border: 1px solid #ccc; border-radius: 8px; min-width: 150px; }
                .metric-value { font-size: 20px; font-weight: bold; color: #333; }
                .metric-label { font-size: 12px; color: #666; margin-top: 4px; }
                .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #333; color: #fff; padding: 12px 8px; text-align: left; font-size: 13px; }
                td { border: 1px solid #ccc; padding: 10px 8px; font-size: 13px; }
                .amount-sale { color: #10b981; font-weight: bold; }
                .amount-expense { color: #ef4444; font-weight: bold; }
                .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ccc; padding-top: 15px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">${reportData.title}</div>
                <div class="date">${reportData.date}</div>
              </div>
            
              <div class="metrics">
                ${reportData.metrics.map((m: any) => `
                  <div class="metric">
                    <div class="metric-value">${m.value}</div>
                    <div class="metric-label">${m.label}</div>
                  </div>
                `).join('')}
              </div>
            
              <div class="section-title">Transactions</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Type</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.transactions.length > 0 ? reportData.transactions.map((t: any) => `
                    <tr>
                      <td>${t.desc}</td>
                      <td>${t.type === 'sale' ? 'Sale' : 'Expense'}</td>
                      <td style="text-align: right;" class="${t.type === 'sale' ? 'amount-sale' : 'amount-expense'}">
                        ${t.type === 'sale' ? '+' : '-'}${formatCurrency(t.amount)}
                      </td>
                    </tr>
                  `).join('') : '<tr><td colspan="3" style="text-align: center; color: #999;">No transactions for this period</td></tr>'}
                </tbody>
              </table>
            
              <div class="footer">
                Generated on ${formatDate(new Date().toISOString())} • Invoice App
              </div>
            </body>
            </html>
        `;
    };

    const generateSalesBookHtml = (reportData: any) => {
        const invoices = reportData.rawInvoices || [];
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        };
        const getMonth = (dateStr: string) => new Date(dateStr).getMonth() + 1;

        // Calculate columns totals
        let totalNet = 0;
        let totalVat = 0;
        let totalGross = 0;

        const rows = invoices.map((inv: any, index: number) => {
            const net = inv.total_amount - inv.tax_amount;
            const vat = inv.tax_amount;
            const gross = inv.total_amount;

            totalNet += net;
            totalVat += vat;
            totalGross += gross;

            const client = inv.client || {};

            return `
                <tr>
                    <td>${inv.invoice_number}</td>
                    <td>${index + 1}</td>
                    <td>${formatDate(inv.issue_date)}</td>
                    <td>${getMonth(inv.issue_date)}</td>
                    <td>SHITJE</td>
                    <td>${inv.id.slice(0, 6).toUpperCase()}</td>
                    <td></td>
                    <td style="text-align: left;">${client.name || '-'}</td>
                    <td>${client.nui || client.tax_id || '-'}</td>
                    <td>${client.fiscal_number || '-'}</td>
                    <td>${client.vat_number || '-'}</td>
                    <td class="num">${formatCurrency(net).replace('$', '').replace('€', '')}</td>
                    <td class="num">${formatCurrency(net).replace('$', '').replace('€', '')}</td>
                    <td class="num">${formatCurrency(vat).replace('$', '').replace('€', '')}</td>
                    <td class="num">${formatCurrency(vat).replace('$', '').replace('€', '')}</td>
                    <td class="num">${formatCurrency(vat).replace('$', '').replace('€', '')}</td>
                    <td class="num bold">${formatCurrency(gross).replace('$', '').replace('€', '')}</td>
                    <td class="num">${formatCurrency(inv.amount_received || 0).replace('$', '').replace('€', '')}</td>
                </tr>
            `;
        }).join('');

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4 landscape; margin: 5mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #000; }
    
    .header-info { text-align: right; margin-bottom: 20px; font-weight: bold; margin-right: 20px; }
    
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { 
        background: #f0f0f0; 
        color: #000; 
        font-weight: bold; 
        border: 1px solid #ccc; 
        padding: 6px 2px;
        font-size: 9px;
        text-align: center;
        vertical-align: middle;
        word-wrap: break-word;
    }
    td { 
        border: 1px solid #ccc; 
        padding: 4px 2px; 
        font-size: 9px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .num { text-align: right; padding-right: 4px; }
    .bold { font-weight: bold; }
    
    .total-row td { background: #e0e0e0; font-weight: bold; }
    
    /* Column widths optimization */
    col:nth-child(1) { width: 80px; } /* Dokumenti */
    col:nth-child(2) { width: 30px; } /* Nr */
    col:nth-child(3) { width: 55px; } /* Data */
    col:nth-child(4) { width: 30px; } /* Muaj */
    col:nth-child(5) { width: 50px; } /* Njesia */
    col:nth-child(6) { width: 50px; } /* Nr Dok */
    col:nth-child(7) { width: 30px; } /* Ref */
    col:nth-child(8) { width: 140px; } /* Subjekti (Wider) */
    col:nth-child(9) { width: 55px; } /* NUI */
    col:nth-child(10) { width: 55px; } /* Fiskal */
    col:nth-child(11) { width: 55px; } /* TVSH */
    /* Money cols share remaining space */
  </style>
</head>
<body>
  <div class="header-info">
    Libri i Shitjeve<br>
    Periudha: ${reportData.date}
  </div>

  <table>
    <colgroup>
        <col><col><col><col><col><col><col><col><col><col><col>
        <col><col><col><col><col><col><col>
    </colgroup>
    <thead>
      <tr>
        <th>Dokumenti</th>
        <th>Nr</th>
        <th>Data</th>
        <th>Muaj</th>
        <th>Njësia Org.</th>
        <th>Nr. i dok.</th>
        <th>Ref.</th>
        <th>Subjekti</th>
        <th>NUI</th>
        <th>Nr. Fiskal</th>
        <th>Nr. i Tvsh</th>
        <th>Shitjet totale</th>
        <th>[12] Shitjet e tatueshme 18%</th>
        <th>[13] TVSH e llogaritur</th>
        <th>[K1] Totali i TVSH (18%)</th>
        <th>[30] Totali i TVSH zbrit.</th>
        <th>Për pagesë</th>
        <th>Pagesa</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="11" style="text-align: right; padding-right: 10px;">TOTAL:</td>
        <td class="num">${formatCurrency(totalNet).replace('$', '').replace('€', '')}</td>
        <td class="num">${formatCurrency(totalNet).replace('$', '').replace('€', '')}</td>
        <td class="num">${formatCurrency(totalVat).replace('$', '').replace('€', '')}</td>
        <td class="num">${formatCurrency(totalVat).replace('$', '').replace('€', '')}</td>
        <td class="num">${formatCurrency(totalVat).replace('$', '').replace('€', '')}</td>
        <td class="num">${formatCurrency(totalGross).replace('$', '').replace('€', '')}</td>
        <td class="num"></td>
      </tr>
    </tbody>
  </table>
</body>
</html>
        `;
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>{t(type === 'daily' ? 'dailyReport' : 'salesBook', language)}</Text>
                <TouchableOpacity onPress={handleShare}>
                    <Share2 color={textColor} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <Text style={{ color: mutedColor }}>Loading...</Text>
                ) : (
                    <>
                        <View style={styles.metricsGrid}>
                            {data?.metrics.map((m: any, idx: number) => (
                                <Card key={idx} style={[styles.metricCard, { backgroundColor: cardBg }]}>
                                    <m.icon color={m.color} size={20} />
                                    <Text style={[styles.metricValue, { color: textColor }]}>{m.value}</Text>
                                    <Text style={[styles.metricLabel, { color: mutedColor }]}>{m.label}</Text>
                                </Card>
                            ))}
                        </View>

                        <Text style={[styles.sectionTitle, { color: textColor }]}>Transactions</Text>
                        {data?.transactions.map((t: any) => (
                            <View key={t.id} style={[styles.transactionRow, { borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                                <View>
                                    <Text style={{ color: textColor, fontWeight: '600' }}>{t.desc}</Text>
                                    <Text style={{ color: mutedColor, fontSize: 12 }}>{t.type === 'sale' ? 'Sale' : 'Expense'}</Text>
                                </View>
                                <Text style={{ color: t.type === 'sale' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                                    {t.type === 'sale' ? '+' : '-'}{formatCurrency(t.amount)}
                                </Text>
                            </View>
                        ))}
                        {data?.transactions.length === 0 && (
                            <Text style={{ color: mutedColor, textAlign: 'center', marginTop: 20 }}>No transactions for this period.</Text>
                        )}

                        <Button
                            title={exporting ? "Generating..." : "Export PDF"}
                            icon={Download}
                            onPress={handleExportPdf}
                            loading={exporting}
                            style={{ marginTop: 30 }}
                        />
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: {},
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 16 },
    metricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    metricCard: { flex: 1, padding: 12, alignItems: 'center', gap: 4 },
    metricValue: { fontSize: 16, fontWeight: 'bold' },
    metricLabel: { fontSize: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
});

