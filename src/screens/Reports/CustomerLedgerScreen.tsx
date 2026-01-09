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
import { ArrowLeft, Download, User, FileText, CreditCard, TrendingUp, Search, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button, Card } from '../../components/common';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/format';
import { Client, Profile } from '../../types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface LedgerEntry {
    id: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    type: 'invoice' | 'payment';
}

export function CustomerLedgerScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { isDark, language, primaryColor } = useTheme();
    const preselectedClientId = route.params?.clientId;

    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(preselectedClientId || null);
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
        if (selectedClientId) {
            fetchLedgerData();
        }
    }, [selectedClientId]);

    useEffect(() => {
        if (searchQuery) {
            const filtered = clients.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.phone?.includes(searchQuery)
            );
            setFilteredClients(filtered);
        } else {
            setFilteredClients(clients);
        }
    }, [searchQuery, clients]);

    const fetchInitialData = async () => {
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
            setProfile(profileData);
            const companyId = profileData.active_company_id || profileData.company_id || user.id;

            const { data: clientsData } = await supabase
                .from('clients')
                .select('*')
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .order('name');
            if (clientsData) {
                setClients(clientsData);
                setFilteredClients(clientsData);
            }
        }
        setLoading(false);
    };

    const fetchLedgerData = async () => {
        if (!selectedClientId || !user) return;
        setLoading(true);

        try {
            const { data: invoices } = await supabase
                .from('invoices')
                .select('*')
                .eq('client_id', selectedClientId)
                .eq('type', 'invoice')
                .order('issue_date', { ascending: true });

            const { data: payments } = await supabase
                .from('payments')
                .select('*')
                .eq('client_id', selectedClientId)
                .order('payment_date', { ascending: true });

            const entries: LedgerEntry[] = [];

            invoices?.forEach(inv => {
                entries.push({
                    id: inv.id,
                    date: inv.issue_date,
                    description: `Fatura ${inv.invoice_number}`,
                    debit: Number(inv.total_amount) || 0,
                    credit: 0,
                    balance: 0,
                    type: 'invoice',
                });
            });

            payments?.forEach(pmt => {
                entries.push({
                    id: pmt.id,
                    date: pmt.payment_date,
                    description: `Pagesë ${pmt.payment_number}`,
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

    const selectedClient = clients.find(c => c.id === selectedClientId);

    const handleExportPDF = async () => {
        if (!selectedClient || !profile) return;
        setExporting(true);
        try {
            const html = generateLedgerHTML();
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Kartela - ${selectedClient.name}`,
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
            <div class="title">KARTELA E BLERËSIT</div>
            <div style="color: #64748b; text-align: right; margin-top: 5px;">
                Data: ${new Date().toLocaleDateString('sq-AL')}
            </div>
        </div>
    </div>

    <div class="client-section">
        <div class="client-name">${selectedClient?.name}</div>
        <div class="client-details">
            ${selectedClient?.email ? `Email: ${selectedClient.email}` : ''}
            ${selectedClient?.phone ? ` | Tel: ${selectedClient.phone}` : ''}
            ${selectedClient?.address ? `<br/>Adresa: ${selectedClient.address}` : ''}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 15%;">Data</th>
                <th style="width: 35%;">Përshkrimi</th>
                <th style="width: 16%;">Debit (Borxh)</th>
                <th style="width: 16%;">Credit (Kredi)</th>
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
            <span>GJENDJA AKTUALE:</span>
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

    if (!selectedClientId) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                <View style={[styles.mainHeader, { borderBottomColor: borderColor }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: cardBg }]}>
                        <ArrowLeft color={textColor} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.mainTitle, { color: textColor }]}>{t('customerCard', language)}</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.content}>
                    <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                        <Search color={mutedColor} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder={t('search', language)}
                            placeholderTextColor={mutedColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X color={mutedColor} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {loading ? (
                        <ActivityIndicator color={primaryColor} size="large" style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={filteredClients}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.clientListItem, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}
                                    onPress={() => setSelectedClientId(item.id)}
                                >
                                    <View style={[styles.clientIcon, { backgroundColor: `${primaryColor}15` }]}>
                                        <User color={primaryColor} size={24} />
                                    </View>
                                    <View>
                                        <Text style={[styles.clientNameHeader, { color: textColor }]}>{item.name}</Text>
                                        {item.email && <Text style={{ color: mutedColor, fontSize: 13 }}>{item.email}</Text>}
                                    </View>
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingBottom: 20, gap: 12 }}
                            ListEmptyComponent={
                                <Text style={[styles.emptyText, { color: mutedColor }]}>No clients found</Text>
                            }
                        />
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={[styles.mainHeader, { borderBottomColor: borderColor }]}>
                <TouchableOpacity onPress={() => setSelectedClientId(null)} style={[styles.backButton, { backgroundColor: cardBg }]}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.mainTitle, { color: textColor, fontSize: 18 }]} numberOfLines={1}>{selectedClient?.name}</Text>
                    <Text style={{ color: mutedColor, fontSize: 12 }}>Customer Ledger</Text>
                </View>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: cardBg }]}
                    onPress={handleExportPDF}
                    disabled={exporting}
                >
                    <Download color={exporting ? mutedColor : primaryColor} size={20} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        <View style={styles.metricsRow}>
                            <Card style={[styles.metricCard, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                                <FileText color="#ef4444" size={20} />
                                <View>
                                    <Text style={[styles.metricLabel, { color: mutedColor }]}>DEBIT</Text>
                                    <Text style={[styles.metricValue, { color: '#ef4444' }]}>{formatCurrency(totals.debit)}</Text>
                                </View>
                            </Card>
                            <Card style={[styles.metricCard, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                                <CreditCard color="#10b981" size={20} />
                                <View>
                                    <Text style={[styles.metricLabel, { color: mutedColor }]}>CREDIT</Text>
                                    <Text style={[styles.metricValue, { color: '#10b981' }]}>{formatCurrency(totals.credit)}</Text>
                                </View>
                            </Card>
                        </View>
                        <Card style={[styles.metricCard, { backgroundColor: cardBg, borderColor, borderWidth: 1, marginBottom: 20 }]}>
                            <TrendingUp color={primaryColor} size={24} />
                            <View>
                                <Text style={[styles.metricLabel, { color: mutedColor }]}>CURRENT BALANCE</Text>
                                <Text style={[styles.metricValue, { color: primaryColor, fontSize: 24 }]}>{formatCurrency(totals.balance)}</Text>
                            </View>
                        </Card>

                        <Card style={[styles.tableCard, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                            <View style={[styles.tableHeader, { backgroundColor: primaryColor }]}>
                                <Text style={[styles.th, { flex: 1.2 }]}>DATE</Text>
                                <Text style={[styles.th, { flex: 2.5 }]}>DESCRIPTION</Text>
                                <Text style={[styles.th, styles.thRight, { flex: 1.3 }]}>DEBIT</Text>
                                <Text style={[styles.th, styles.thRight, { flex: 1.3 }]}>CREDIT</Text>
                                <Text style={[styles.th, styles.thRight, { flex: 1.3 }]}>BAL</Text>
                            </View>

                            {ledgerEntries.length === 0 ? (
                                <Text style={[styles.emptyText, { color: mutedColor }]}>No transactions found</Text>
                            ) : (
                                ledgerEntries.map((entry, idx) => (
                                    <View
                                        key={entry.id}
                                        style={[
                                            styles.tableRow,
                                            { backgroundColor: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.5)') },
                                            { borderBottomWidth: idx === ledgerEntries.length - 1 ? 0 : 1, borderBottomColor: borderColor }
                                        ]}
                                    >
                                        <Text style={[styles.td, { flex: 1.2, color: mutedColor }]}>
                                            {new Date(entry.date).toLocaleDateString(language === 'sq' ? 'sq-AL' : 'en-US')}
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
                                        <Text style={[styles.td, styles.tdRight, { flex: 1.3, color: textColor, fontWeight: '700' }]}>
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
    mainHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1 },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    mainTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    actionBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    content: { padding: 20, paddingBottom: 40 },

    searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, gap: 12 },
    searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },

    clientListItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 16 },
    clientIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    clientNameHeader: { fontSize: 16, fontWeight: '700', marginBottom: 2 },

    metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    metricCard: { flex: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16 },
    metricLabel: { fontSize: 11, fontWeight: '700', opacity: 0.7, marginBottom: 2 },
    metricValue: { fontSize: 16, fontWeight: '800' },

    tableCard: { borderRadius: 16, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12 },
    th: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    thRight: { textAlign: 'right' },
    tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12 },
    td: { fontSize: 12, fontWeight: '500' },
    tdRight: { textAlign: 'right', fontFamily: 'monospace' },

    emptyText: { padding: 40, textAlign: 'center', fontSize: 14, fontWeight: '500' },
});
