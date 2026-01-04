import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    FlatList,
} from 'react-native';
import { ArrowLeft, Download, Building, FileText, CreditCard, TrendingUp, Search } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button, Card } from '../../components/common';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';
import { Vendor, Profile } from '../../types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface LedgerEntry {
    id: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    type: 'purchase' | 'payment';
}

export function VendorLedgerScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { isDark, language, primaryColor } = useTheme();
    const preselectedVendorId = route.params?.vendorId;

    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(preselectedVendorId || null);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [totals, setTotals] = useState({ debit: 0, credit: 0, balance: 0 });

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedVendorId) {
            fetchLedgerData();
        }
    }, [selectedVendorId]);

    useEffect(() => {
        if (searchQuery) {
            const filtered = vendors.filter(v =>
                v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.phone?.includes(searchQuery)
            );
            setFilteredVendors(filtered);
        } else {
            setFilteredVendors(vendors);
        }
    }, [searchQuery, vendors]);

    const fetchInitialData = async () => {
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
            setProfile(profileData);
            const companyId = profileData.active_company_id || profileData.company_id || user.id;

            const { data: vendorsData } = await supabase
                .from('vendors')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .order('name');
            if (vendorsData) {
                setVendors(vendorsData);
                setFilteredVendors(vendorsData);
            }
        }
        setLoading(false);
    };

    const fetchLedgerData = async () => {
        if (!selectedVendorId || !user) return;
        setLoading(true);

        try {
            // For vendors, purchases are "Credit" (we owe money) and payments are "Debit" (we reduces what we owe)
            // But usually in a ledger, the perspective is:
            // Purchase/Invoice = Liability Increase (Credit)
            // Payment = Liability Decrease (Debit)
            // Result: Debit - Credit = Net 

            // However, to keep it consistent with Customer Ledger UX:
            // Let's use: Purchases = Debit (Increase Balance/Debt), Payments = Credit (Decrease Balance/Debt)
            // This way "Balance" means "What we owe the vendor"

            const { data: payments } = await supabase
                .from('vendor_payments')
                .select('*')
                .eq('vendor_id', selectedVendorId)
                .order('payment_date', { ascending: true });

            const { data: bills } = await supabase
                .from('supplier_bills')
                .select('*')
                .eq('vendor_id', selectedVendorId)
                .order('issue_date', { ascending: true });

            const entries: LedgerEntry[] = [];

            bills?.forEach(bill => {
                entries.push({
                    id: bill.id,
                    date: bill.issue_date,
                    description: `Faturë Hyrëse #${bill.bill_number}`,
                    debit: Number(bill.total_amount) || 0,
                    credit: 0,
                    balance: 0,
                    type: 'purchase',
                });
            });

            payments?.forEach(pmt => {
                entries.push({
                    id: pmt.id,
                    date: pmt.payment_date,
                    description: `Pagesë Furnitori - ${pmt.payment_method}`,
                    debit: 0,
                    credit: Number(pmt.amount) || 0,
                    balance: 0,
                    type: 'payment',
                });
            });

            entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            let runningBalance = 0;
            let totalDebit = 0;
            let totalCredit = 0;

            entries.forEach(entry => {
                totalDebit += entry.debit;
                totalCredit += entry.credit;
                runningBalance = runningBalance + entry.debit - entry.credit;
                entry.balance = runningBalance;
            });

            setLedgerEntries(entries);
            setTotals({ debit: totalDebit, credit: totalCredit, balance: runningBalance });
        } catch (error) {
            console.error('Error fetching ledger data:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedVendor = vendors.find(v => v.id === selectedVendorId);

    const handleExportPDF = async () => {
        if (!selectedVendor || !profile) return;
        setExporting(true);
        try {
            const html = generateLedgerHTML();
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Kartela Furnitorit - ${selectedVendor.name}`,
                UTI: 'com.adobe.pdf',
            });
        } catch (error: any) {
            Alert.alert(t('error', language), 'Failed to export PDF: ' + error.message);
        } finally {
            setExporting(false);
        }
    };

    const generateLedgerHTML = () => {
        const formatDate = (dateStr: string) => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('sq-AL');
        };

        const formatMoney = (amount: number) => {
            return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' €';
        };

        const rows = ledgerEntries.map(entry => `
            <tr>
                <td>${formatDate(entry.date)}</td>
                <td>${entry.description}</td>
                <td class="debit">${entry.debit > 0 ? formatMoney(entry.debit) : '-'}</td>
                <td class="credit">${entry.credit > 0 ? formatMoney(entry.credit) : '-'}</td>
                <td class="balance">${formatMoney(entry.balance)}</td>
            </tr>
        `).join('');

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; font-size: 11px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid ${primaryColor}; }
        .company-name { font-size: 18px; font-weight: bold; color: #1e293b; }
        .title { font-size: 20px; font-weight: bold; color: ${primaryColor}; text-align: right; }
        .client-section { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .client-name { font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
        .client-details { color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: ${primaryColor}; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
        th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: right; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        td.debit, td.credit, td.balance { text-align: right; font-family: monospace; }
        td.debit { color: #ef4444; }
        td.credit { color: #10b981; }
        td.balance { font-weight: bold; }
        tr:nth-child(even) { background: #f8fafc; }
        .totals { margin-top: 10px; padding: 15px; background: #1e293b; border-radius: 8px; color: white; }
        .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .totals-row:last-child { margin-bottom: 0; font-size: 14px; font-weight: bold; border-top: 1px solid #475569; padding-top: 8px; }
        .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="company-name">${profile?.company_name || 'Company'}</div>
            <div style="color: #64748b; margin-top: 5px;">
                ${profile?.address || ''}<br/>
                ${profile?.phone || ''} | ${profile?.email || ''}
            </div>
        </div>
        <div>
            <div class="title">KARTELA E FURNITORIT</div>
            <div style="color: #64748b; text-align: right; margin-top: 5px;">
                Data: ${new Date().toLocaleDateString('sq-AL')}
            </div>
        </div>
    </div>

    <div class="client-section">
        <div class="client-name">${selectedVendor?.name}</div>
        <div class="client-details">
            ${selectedVendor?.email ? `Email: ${selectedVendor.email}` : ''}
            ${selectedVendor?.phone ? ` | Tel: ${selectedVendor.phone}` : ''}
            ${selectedVendor?.address ? `<br/>Adresa: ${selectedVendor.address}` : ''}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 15%;">Data</th>
                <th style="width: 35%;">Përshkrimi</th>
                <th style="width: 16%;">Debit (-)</th>
                <th style="width: 16%;">Credit (+)</th>
                <th style="width: 18%;">Gjendja</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row">
            <span>Total Debit:</span>
            <span>${formatMoney(totals.debit)}</span>
        </div>
        <div class="totals-row">
            <span>Total Credit:</span>
            <span>${formatMoney(totals.credit)}</span>
        </div>
        <div class="totals-row">
            <span>DETYRIMI AKTUAL:</span>
            <span>${formatMoney(totals.balance)}</span>
        </div>
    </div>

    <div class="footer">
        Gjeneruar automatikisht • ${profile?.company_name || 'Company'}
    </div>
</body>
</html>
        `;
    };

    if (!selectedVendorId) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft color={textColor} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: textColor }]}>{t('supplierCard', language) || 'Kartela e Furnitorit'}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <Text style={[styles.instruction, { color: mutedColor }]}>
                        Zgjidhni një furnitor për të parë kartelën:
                    </Text>

                    <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor }]}>
                        <Search color={mutedColor} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder={t('search', language)}
                            placeholderTextColor={mutedColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {loading ? (
                        <ActivityIndicator color={primaryColor} size="large" style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={filteredVendors}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.clientListItem, { backgroundColor: cardBg, borderColor }]}
                                    onPress={() => setSelectedVendorId(item.id)}
                                >
                                    <View style={[styles.clientIcon, { backgroundColor: `${primaryColor}20` }]}>
                                        <Building color={primaryColor} size={20} />
                                    </View>
                                    <View>
                                        <Text style={[styles.clientNameHeader, { color: textColor }]}>{item.name}</Text>
                                        {item.email && <Text style={{ color: mutedColor, fontSize: 12 }}>{item.email}</Text>}
                                    </View>
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setSelectedVendorId(null)} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>{selectedVendor?.name}</Text>
                <TouchableOpacity onPress={handleExportPDF} disabled={exporting}>
                    <Download color={exporting ? mutedColor : primaryColor} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        <View style={styles.metricsRow}>
                            <Card style={[styles.metricCard, { backgroundColor: cardBg }]}>
                                <FileText color="#ef4444" size={18} />
                                <Text style={[styles.metricValue, { color: '#ef4444' }]}>{formatCurrency(totals.debit)}</Text>
                                <Text style={[styles.metricLabel, { color: mutedColor }]}>Debit</Text>
                            </Card>
                            <Card style={[styles.metricCard, { backgroundColor: cardBg }]}>
                                <CreditCard color="#10b981" size={18} />
                                <Text style={[styles.metricValue, { color: '#10b981' }]}>{formatCurrency(totals.credit)}</Text>
                                <Text style={[styles.metricLabel, { color: mutedColor }]}>Credit</Text>
                            </Card>
                            <Card style={[styles.metricCard, { backgroundColor: cardBg }]}>
                                <TrendingUp color={primaryColor} size={18} />
                                <Text style={[styles.metricValue, { color: primaryColor }]}>{formatCurrency(totals.balance)}</Text>
                                <Text style={[styles.metricLabel, { color: mutedColor }]}>Gjendja</Text>
                            </Card>
                        </View>

                        <Card style={[styles.tableCard, { backgroundColor: cardBg }]}>
                            <View style={[styles.tableHeader, { backgroundColor: primaryColor }]}>
                                <Text style={[styles.th, { flex: 1.2 }]}>Data</Text>
                                <Text style={[styles.th, { flex: 2.5 }]}>Përshkrimi</Text>
                                <Text style={[styles.th, styles.thRight, { flex: 1.3 }]}>Debit</Text>
                                <Text style={[styles.th, styles.thRight, { flex: 1.3 }]}>Credit</Text>
                                <Text style={[styles.th, styles.thRight, { flex: 1.3 }]}>Gjendja</Text>
                            </View>

                            {ledgerEntries.length === 0 ? (
                                <Text style={[styles.emptyText, { color: mutedColor }]}>Nuk ka transaksione</Text>
                            ) : (
                                ledgerEntries.map((entry, idx) => (
                                    <View
                                        key={entry.id}
                                        style={[
                                            styles.tableRow,
                                            { backgroundColor: idx % 2 === 0 ? 'transparent' : (isDark ? '#1e293b80' : '#f8fafc') },
                                            { borderBottomColor: borderColor }
                                        ]}
                                    >
                                        <Text style={[styles.td, { flex: 1.2, color: mutedColor }]}>
                                            {new Date(entry.date).toLocaleDateString('sq-AL')}
                                        </Text>
                                        <Text style={[styles.td, { flex: 2.5, color: textColor }]} numberOfLines={1}>
                                            {entry.description}
                                        </Text>
                                        <Text style={[styles.td, styles.tdRight, { flex: 1.3, color: entry.debit > 0 ? '#ef4444' : mutedColor }]}>
                                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                        </Text>
                                        <Text style={[styles.td, styles.tdRight, { flex: 1.3, color: entry.credit > 0 ? '#10b981' : mutedColor }]}>
                                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                        </Text>
                                        <Text style={[styles.td, styles.tdRight, { flex: 1.3, color: textColor, fontWeight: 'bold' }]}>
                                            {formatCurrency(entry.balance)}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </Card>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: { padding: 4 },
    title: { fontSize: 20, fontWeight: 'bold', flex: 1, marginHorizontal: 8 },
    content: { padding: 16, paddingBottom: 40 },
    instruction: { fontSize: 14, marginBottom: 16, fontWeight: '500' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 10 },
    searchInput: { flex: 1, fontSize: 16 },
    clientListItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderBottomWidth: 1, marginBottom: 8, gap: 12 },
    clientIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    clientNameHeader: { fontSize: 16, fontWeight: '600' },
    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    metricCard: { flex: 1, padding: 12, alignItems: 'center', gap: 4 },
    metricValue: { fontSize: 14, fontWeight: 'bold' },
    metricLabel: { fontSize: 10 },
    tableCard: { borderRadius: 12, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8 },
    th: { color: '#fff', fontSize: 11, fontWeight: '600' },
    thRight: { textAlign: 'right' },
    tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
    td: { fontSize: 11 },
    tdRight: { textAlign: 'right', fontFamily: 'monospace' },
    emptyText: { padding: 20, textAlign: 'center' },
});
