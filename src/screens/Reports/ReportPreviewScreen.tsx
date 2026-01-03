import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { ArrowLeft, Download, Share2, FileText, Calendar, TrendingUp } from 'lucide-react-native';
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
                    title: 'Daily Business Report',
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
                setData({
                    title: 'Sales Book (Libri i Shitjes)',
                    date: 'Monthly View',
                    metrics: [],
                    transactions: []
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
                            title="Export PDF"
                            icon={Download}
                            onPress={() => Alert.alert('Export', 'PDF generation is coming soon!')}
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
