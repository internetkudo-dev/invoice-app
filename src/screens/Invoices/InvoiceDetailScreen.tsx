import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { ArrowLeft, Share2, Printer, Check, Edit, FileText } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, StatusBadge, TemplatePreview } from '../../components/common';
import { Invoice, InvoiceItem, TemplateType, InvoiceData, Profile } from '../../types';
import { generatePdf, sharePdf, printPdf } from '../../services/pdf/pdfService';

interface InvoiceDetailScreenProps {
    navigation: any;
    route: any;
}

const templates: TemplateType[] = ['classic', 'modern', 'minimalist', 'corporate', 'creative'];

export function InvoiceDetailScreen({ navigation, route }: InvoiceDetailScreenProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const invoiceId = route.params?.invoiceId;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('modern');
    const [generating, setGenerating] = useState(false);
    const [pdfUri, setPdfUri] = useState<string | null>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        fetchData();
    }, [invoiceId]);

    const fetchData = async () => {
        if (!user || !invoiceId) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) setProfile(profileData);

        const { data: invoiceData } = await supabase
            .from('invoices')
            .select(`*, client:clients(*)`)
            .eq('id', invoiceId)
            .single();

        if (invoiceData) {
            setInvoice(invoiceData);
            setSelectedTemplate((invoiceData.template_id as TemplateType) || 'modern');
        }

        const { data: itemsData } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
        if (itemsData) setItems(itemsData);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: profile?.currency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const buildInvoiceData = (): InvoiceData | null => {
        if (!invoice || !profile) return null;
        const client = (invoice as any).client;

        return {
            company: {
                name: profile.company_name || 'Your Company',
                address: profile.address || '',
                email: profile.email,
                phone: profile.phone,
                website: profile.website,
                taxId: profile.tax_id,
                logoUrl: profile.logo_url,
                signatureUrl: profile.signature_url,
                stampUrl: profile.stamp_url,
                bankName: profile.bank_name,
                bankAccount: profile.bank_account,
                bankIban: profile.bank_iban,
                bankSwift: profile.bank_swift,
            },
            client: {
                name: client?.name || 'Client',
                address: client?.address || '',
                email: client?.email || '',
            },
            details: {
                number: invoice.invoice_number,
                issueDate: invoice.issue_date,
                dueDate: invoice.due_date || '',
                currency: profile.currency || 'USD',
            },
            items: items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                price: Number(item.unit_price),
                total: Number(item.amount),
            })),
            summary: {
                subtotal: items.reduce((sum, item) => sum + Number(item.amount), 0),
                tax: Number(invoice.tax_amount) || 0,
                discount: Number(invoice.discount_amount) || 0,
                total: Number(invoice.total_amount),
            },
        };
    };

    const handleGeneratePdf = async () => {
        const data = buildInvoiceData();
        if (!data) { Alert.alert('Error', 'Unable to generate PDF'); return; }

        // Save selected template to invoice
        await supabase.from('invoices').update({ template_id: selectedTemplate }).eq('id', invoiceId);

        setGenerating(true);
        const result = await generatePdf(data, selectedTemplate);
        setGenerating(false);

        if (result.success) {
            setPdfUri(result.uri);
            Alert.alert('Success', 'PDF generated successfully!');
        } else {
            Alert.alert('Error', result.error || 'Failed to generate PDF');
        }
    };

    const handleShare = async () => {
        const data = buildInvoiceData();
        if (!data) { await handleGeneratePdf(); return; }

        setGenerating(true);
        const result = await generatePdf(data, selectedTemplate);
        setGenerating(false);

        if (result.success && result.uri) {
            const success = await sharePdf(result.uri);
            if (!success) Alert.alert('Error', 'Failed to share PDF');
        }
    };

    const handlePrint = async () => {
        const data = buildInvoiceData();
        if (!data) { Alert.alert('Error', 'Unable to print'); return; }

        setGenerating(true);
        const success = await printPdf(data, selectedTemplate);
        setGenerating(false);

        if (!success) Alert.alert('Error', 'Failed to print');
    };

    const handleUpdateStatus = async (status: string) => {
        await supabase.from('invoices').update({ status }).eq('id', invoiceId);
        fetchData();
    };

    if (!invoice) {
        return (
            <View style={[styles.loading, { backgroundColor: bgColor }]}>
                <ActivityIndicator size="large" color="#818cf8" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft color={textColor} size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.title, { color: textColor }]}>{invoice.invoice_number}</Text>
                        <Text style={[styles.subtitle, { color: mutedColor }]}>{(invoice as any).client?.name || 'No client'}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: cardBg }]}
                    onPress={() => navigation.navigate('InvoiceForm', { invoiceId: invoice.id })}
                >
                    <Edit color="#818cf8" size={18} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Status Card */}
                <Card style={styles.statusCard}>
                    <View style={styles.statusCardHeader}>
                        <StatusBadge status={invoice.status} />
                        <Text style={[styles.totalAmount, { color: '#818cf8' }]}>{formatCurrency(Number(invoice.total_amount))}</Text>
                    </View>
                    <View style={styles.statusCardDates}>
                        <View style={styles.dateBox}>
                            <Text style={[styles.dateLabel, { color: mutedColor }]}>Issue Date</Text>
                            <Text style={[styles.dateValue, { color: textColor }]}>{invoice.issue_date}</Text>
                        </View>
                        <View style={styles.dateBox}>
                            <Text style={[styles.dateLabel, { color: mutedColor }]}>Due Date</Text>
                            <Text style={[styles.dateValue, { color: textColor }]}>{invoice.due_date || 'On Receipt'}</Text>
                        </View>
                    </View>
                </Card>

                {/* Quick Status Update */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Update Status</Text>
                <View style={styles.statusRow}>
                    {['draft', 'sent', 'paid', 'overdue'].map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[styles.statusChip, { backgroundColor: cardBg }, invoice.status === status && styles.statusChipActive]}
                            onPress={() => handleUpdateStatus(status)}
                        >
                            {invoice.status === status && <Check color="#fff" size={14} />}
                            <Text style={[styles.statusChipText, { color: mutedColor }, invoice.status === status && styles.statusChipTextActive]}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Template Selection with Previews */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Choose Template</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll} contentContainerStyle={styles.templateScrollContent}>
                    {templates.map((template) => (
                        <TouchableOpacity key={template} onPress={() => setSelectedTemplate(template)} activeOpacity={0.8}>
                            <TemplatePreview template={template} selected={selectedTemplate === template} isDark={isDark} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Line Items */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Items ({items.length})</Text>
                <Card style={styles.card}>
                    {items.map((item, index) => (
                        <View key={item.id} style={[styles.itemRow, index < items.length - 1 && styles.itemRowBorder]}>
                            <View style={styles.itemInfo}>
                                <Text style={[styles.itemName, { color: textColor }]}>{item.description}</Text>
                                <Text style={[styles.itemMeta, { color: mutedColor }]}>
                                    {item.quantity} × {formatCurrency(Number(item.unit_price))}
                                </Text>
                            </View>
                            <Text style={styles.itemAmount}>{formatCurrency(Number(item.amount))}</Text>
                        </View>
                    ))}

                    <View style={styles.summarySection}>
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: mutedColor }]}>Subtotal</Text>
                            <Text style={[styles.summaryValue, { color: textColor }]}>
                                {formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}
                            </Text>
                        </View>
                        {Number(invoice.tax_amount) > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>Tax</Text>
                                <Text style={[styles.summaryValue, { color: textColor }]}>{formatCurrency(Number(invoice.tax_amount))}</Text>
                            </View>
                        )}
                        {Number(invoice.discount_amount) > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>Discount</Text>
                                <Text style={[styles.summaryValue, { color: '#10b981' }]}>-{formatCurrency(Number(invoice.discount_amount))}</Text>
                            </View>
                        )}
                    </View>
                </Card>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Button
                        title={generating ? 'Generating...' : 'Generate PDF'}
                        onPress={handleGeneratePdf}
                        loading={generating}
                    />

                    <View style={styles.secondaryActions}>
                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBg }]} onPress={handleShare}>
                            <Share2 color="#10b981" size={22} />
                            <Text style={[styles.actionText, { color: '#10b981' }]}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBg }]} onPress={handlePrint}>
                            <Printer color="#3b82f6" size={22} />
                            <Text style={[styles.actionText, { color: '#3b82f6' }]}>Print</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    backButton: { marginRight: 16, padding: 4 },
    title: { fontSize: 22, fontWeight: 'bold' },
    subtitle: { fontSize: 14, marginTop: 2 },
    editButton: { padding: 10, borderRadius: 10 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    statusCard: { marginBottom: 20 },
    statusCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    totalAmount: { fontSize: 28, fontWeight: 'bold' },
    statusCardDates: { flexDirection: 'row', gap: 16 },
    dateBox: { flex: 1 },
    dateLabel: { fontSize: 12, marginBottom: 4 },
    dateValue: { fontSize: 15, fontWeight: '600' },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#334155' },
    statusChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    statusChipText: { fontWeight: '500', textTransform: 'capitalize' },
    statusChipTextActive: { color: '#fff' },
    templateScroll: { marginBottom: 20 },
    templateScrollContent: { paddingRight: 16 },
    card: { marginBottom: 20 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
    itemRowBorder: { borderBottomWidth: 1, borderBottomColor: '#334155' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 15, marginBottom: 4 },
    itemMeta: { fontSize: 13 },
    itemAmount: { color: '#818cf8', fontSize: 16, fontWeight: '600' },
    summarySection: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16, marginTop: 8 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    summaryLabel: { fontSize: 14 },
    summaryValue: { fontSize: 14, fontWeight: '600' },
    actions: { marginTop: 8 },
    secondaryActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#334155' },
    actionText: { fontSize: 15, fontWeight: '600' },
});
