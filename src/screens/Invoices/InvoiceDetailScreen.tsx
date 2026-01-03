import React, { useEffect, useState } from 'react';
import * as MailComposer from 'expo-mail-composer';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StyleSheet,
    Linking,
} from 'react-native';
import { ArrowLeft, Edit, Share2, FileText, Check, Trash2, Eye, RefreshCw, Mail, Zap, CreditCard } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, StatusBadge, TemplatePreview } from '../../components/common';
import { Invoice, InvoiceItem, TemplateType, InvoiceData, Profile } from '../../types';
import { generatePdf, sharePdf, printPdf } from '../../services/pdf/pdfService';
import { formatCurrency } from '../../utils/format';
import { t } from '../../i18n';

interface InvoiceDetailScreenProps {
    navigation: any;
    route: any;
}

const formats: string[] = ['A4', 'A5', 'Receipt'];

export function InvoiceDetailScreen({ navigation, route }: InvoiceDetailScreenProps) {
    const { user } = useAuth();
    const { isDark, language } = useTheme();
    const invoiceId = route.params?.invoiceId;
    const autoPreview = route.params?.autoPreview;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<string>('A4');
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [pdfUri, setPdfUri] = useState<string | null>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const primaryColor = profile?.primary_color || '#818cf8';

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
            setSelectedFormat(invoiceData.paper_size || 'A4');
        }

        const { data: itemsData } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
        if (itemsData) setItems(itemsData);
    };

    useEffect(() => {
        if (invoice && profile && autoPreview) {
            handlePrint();
        }
    }, [invoice, profile]);

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
                primaryColor: profile.primary_color,
                isGrayscale: profile.is_grayscale,
                paymentLinkStripe: profile.payment_link_stripe,
                paymentLinkPaypal: profile.payment_link_paypal,
            },
            client: {
                name: client?.name || 'Client',
                address: [client?.address, client?.city, client?.zip_code, client?.country].filter(Boolean).join(', ') || '',
                email: client?.email || '',
            },
            details: {
                number: invoice.invoice_number,
                issueDate: invoice.issue_date,
                dueDate: invoice.due_date || '',
                currency: profile.currency || 'EUR',
                language: profile.invoice_language || 'en',
                notes: invoice.notes,
                terms: profile.terms_conditions,
                buyerSignatureUrl: invoice.buyer_signature_url,
                paymentMethod: invoice.payment_method,
                amountReceived: Number(invoice.amount_received),
                changeAmount: Number(invoice.change_amount),
            },
            items: items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unit: item.unit,
                price: Number(item.unit_price),
                total: Number(item.amount),
            })),
            summary: {
                subtotal: items.reduce((sum, item) => sum + Number(item.amount), 0),
                tax: Number(invoice.tax_amount) || 0,
                discount: Number(invoice.discount_amount) || 0,
                total: Number(invoice.total_amount),
                amountReceived: Number(invoice.amount_received),
                changeAmount: Number(invoice.change_amount),
            },
            config: profile.template_config,
        };
    };

    const handleGeneratePdf = async () => {
        const data = buildInvoiceData();
        if (!data) { Alert.alert('Error', 'Unable to generate PDF'); return; }

        await supabase.from('invoices').update({ paper_size: selectedFormat }).eq('id', invoiceId);

        setGenerating(true);
        // Map format to template
        let templateToUse: TemplateType = (profile?.template_config as any)?.style || 'modern';
        if (selectedFormat === 'Receipt') templateToUse = 'receipt';

        const result = await generatePdf(data, templateToUse);
        setGenerating(false);

        if (result.success) {
            setPdfUri(result.uri);
            Alert.alert('Success', 'PDF generated successfully!');
        } else {
            Alert.alert('Error', result.error || 'Failed to generate PDF');
        }
    };

    const handleSendEmail = async () => {
        const clientEmail = (invoice as any).client?.email;
        if (!clientEmail) {
            Alert.alert('No Client Email', 'This client does not have an email address.');
            return;
        }

        setSending(true);
        try {
            const isAvailable = await MailComposer.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'Email composition is not available on this device');
                return;
            }

            const data = buildInvoiceData();
            if (!data) return;

            // 1. Generate PDF
            let templateToUse: TemplateType = (profile?.template_config as any)?.style || 'modern';
            if (selectedFormat === 'Receipt') templateToUse = 'receipt';

            const pdfResult = await generatePdf(data, templateToUse);
            if (!pdfResult.success || !pdfResult.uri) throw new Error('Failed to generate PDF');

            // 2. Open Native Mail Composer
            const status = await MailComposer.composeAsync({
                recipients: [clientEmail],
                subject: `Invoice ${invoice?.invoice_number} from ${profile?.company_name}`,
                body: `Dear ${(invoice as any).client?.name},\n\nPlease find attached invoice ${invoice?.invoice_number}.\n\nBest regards,\n${profile?.company_name}`,
                attachments: [pdfResult.uri],
                isHtml: false,
            });

            if (status.status === 'sent') {
                Alert.alert('Success', 'Email marked as sent');
            }

        } catch (error: any) {
            Alert.alert('Error', 'Failed to compose email: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    const handleShare = async () => {
        const data = buildInvoiceData();
        if (!data) return;

        let templateToUse: TemplateType = (profile?.template_config as any)?.style || 'modern';
        if (selectedFormat === 'Receipt') templateToUse = 'receipt';

        setGenerating(true);
        const result = await generatePdf(data, templateToUse);
        setGenerating(false);

        if (result.success && result.uri) {
            const success = await sharePdf(result.uri);
            if (!success) Alert.alert('Error', 'Failed to share PDF');
        } else {
            Alert.alert('Error', result.error || 'Failed to generate PDF for sharing');
        }
    };

    const handlePrint = async () => {
        const data = buildInvoiceData();
        if (!data) return;

        let templateToUse: TemplateType = (profile?.template_config as any)?.style || 'modern';
        if (selectedFormat === 'Receipt') templateToUse = 'receipt';

        setGenerating(true);
        const success = await printPdf(data, templateToUse);
        setGenerating(false);

        if (!success) Alert.alert('Error', 'Failed to show preview');
    };

    const handleUpdateStatus = async (status: string) => {
        if (!invoice) return;
        const { error } = await supabase.from('invoices').update({ status }).eq('id', invoice.id);
        if (!error) setInvoice({ ...invoice, status: status as any });
    };

    const handleTransformToInvoice = async () => {
        if (!invoice) return;
        Alert.alert(
            'Convert to Invoice',
            'Do you want to transform this offer into a formal invoice?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Convert',
                    onPress: async () => {
                        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
                        const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('type', 'invoice');

                        const nextNumber = (count || 0) + 1;
                        const today = new Date();
                        const dd = String(today.getDate()).padStart(2, '0');
                        const mm = String(today.getMonth() + 1).padStart(2, '0');
                        const yyyy = today.getFullYear();
                        const newInvoiceNumber = `INV-${String(nextNumber).padStart(3, '0')}-${dd}-${mm}-${yyyy}`;

                        const { error } = await supabase
                            .from('invoices')
                            .update({
                                type: 'invoice',
                                invoice_number: newInvoiceNumber,
                                status: 'draft'
                            })
                            .eq('id', invoice.id);

                        if (!error) {
                            Alert.alert('Success', `Transformed into Invoice ${newInvoiceNumber}`);
                            fetchData();
                        } else {
                            Alert.alert('Error', 'Failed to transform offer');
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = async () => {
        if (!invoice) return;
        Alert.alert(
            'Delete Invoice',
            'Are you sure you want to delete this invoice? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);
                            const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
                            if (error) throw error;
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete invoice');
                        }
                    }
                }
            ]
        );
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
                <View style={styles.headerRight}>
                    {invoice.type === 'offer' && (
                        <TouchableOpacity
                            style={[styles.transformButton, { backgroundColor: primaryColor }]}
                            onPress={handleTransformToInvoice}
                        >
                            <RefreshCw color="#fff" size={16} />
                            <Text style={styles.transformText}>CONVERT</Text>
                        </TouchableOpacity>
                    )}
                    {profile?.role !== 'worker' && (
                        <>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#fee2e2', marginRight: 8 }]}
                                onPress={handleDelete}
                            >
                                <Trash2 color="#ef4444" size={18} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.editButton, { backgroundColor: `${primaryColor}20` }]}
                                onPress={() => navigation.navigate('InvoiceForm', { invoiceId: invoice.id })}
                            >
                                <Edit color={primaryColor} size={18} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Status Card */}
                <Card style={styles.statusCard}>
                    <View style={styles.statusCardHeader}>
                        <StatusBadge status={invoice.status} />
                        <Text style={[styles.totalAmount, { color: '#818cf8' }]}>{formatCurrency(Number(invoice.total_amount), profile?.currency)}</Text>
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

                {/* Format Selection */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>{t('paperSize', language) || 'Choose Format'}</Text>
                <View style={styles.statusRow}>
                    {formats.map((format) => (
                        <TouchableOpacity
                            key={format}
                            style={[
                                styles.statusChip,
                                { backgroundColor: cardBg, flex: 1, justifyContent: 'center' },
                                selectedFormat === format && { backgroundColor: primaryColor, borderColor: primaryColor }
                            ]}
                            onPress={() => setSelectedFormat(format)}
                        >
                            <Text style={[styles.statusChipText, { color: mutedColor }, selectedFormat === format && { color: '#fff' }]}>
                                {format}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Line Items */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Items ({items.length})</Text>
                <Card style={styles.card}>
                    {items.map((item, index) => (
                        <View key={item.id} style={[styles.itemRow, index < items.length - 1 && styles.itemRowBorder]}>
                            <View style={styles.itemInfo}>
                                <Text style={[styles.itemName, { color: textColor }]}>{item.description}</Text>
                                <Text style={[styles.itemMeta, { color: mutedColor }]}>
                                    {item.quantity} × {formatCurrency(Number(item.unit_price), profile?.currency)}
                                </Text>
                            </View>
                            <Text style={styles.itemAmount}>{formatCurrency(Number(item.amount), profile?.currency)}</Text>
                        </View>
                    ))}

                    <View style={styles.summarySection}>
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: mutedColor }]}>Subtotal</Text>
                            <Text style={[styles.summaryValue, { color: textColor }]}>
                                {formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0), profile?.currency)}
                            </Text>
                        </View>
                        {Number(invoice.tax_amount) > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>Tax</Text>
                                <Text style={[styles.summaryValue, { color: textColor }]}>{formatCurrency(Number(invoice.tax_amount), profile?.currency)}</Text>
                            </View>
                        )}
                        {Number(invoice.discount_amount) > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>Discount</Text>
                                <Text style={[styles.summaryValue, { color: '#10b981' }]}>-{formatCurrency(Number(invoice.discount_amount), profile?.currency)}</Text>
                            </View>
                        )}
                        <View style={[styles.summaryRow, { marginTop: 4 }]}>
                            <Text style={[styles.summaryLabel, { color: mutedColor }]}>Payment</Text>
                            <Text style={[styles.summaryValue, { color: textColor, textTransform: 'capitalize' }]}>{invoice.payment_method || 'Bank'}</Text>
                        </View>
                        {invoice.payment_method === 'cash' && (
                            <>
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { color: mutedColor }]}>Received</Text>
                                    <Text style={[styles.summaryValue, { color: textColor }]}>{formatCurrency(Number(invoice.amount_received), profile?.currency)}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { color: mutedColor }]}>Change</Text>
                                    <Text style={[styles.summaryValue, { color: primaryColor }]}>{formatCurrency(Number(invoice.change_amount), profile?.currency)}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </Card>

                {/* Signatures Preview */}
                {
                    (profile?.signature_url || invoice.buyer_signature_url) && (
                        <Card style={styles.card}>
                            <Text style={[styles.tinyLabel, { color: mutedColor, marginBottom: 16 }]}>Signatures</Text>
                            <View style={styles.row}>
                                {profile?.signature_url && (
                                    <View style={styles.half}>
                                        <Text style={[styles.dateLabel, { color: mutedColor }]}>Seller</Text>
                                        <View style={styles.signatureSmallBox}>
                                            <Eye color={mutedColor} size={20} />
                                        </View>
                                    </View>
                                )}
                                {invoice.buyer_signature_url && (
                                    <View style={styles.half}>
                                        <Text style={[styles.dateLabel, { color: mutedColor }]}>Buyer</Text>
                                        <View style={styles.signatureSmallBox}>
                                            <Eye color={mutedColor} size={20} />
                                        </View>
                                    </View>
                                )}
                            </View>
                        </Card>
                    )
                }

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Button
                        title={generating ? 'Building Preview...' : 'On-Screen Preview'}
                        onPress={handlePrint}
                        icon={Eye}
                        loading={generating}
                    />

                    <Button
                        title={sending ? 'Sending Email...' : 'Email Client'}
                        onPress={handleSendEmail}
                        icon={Mail}
                        loading={sending}
                        variant="primary" // Or different color
                        style={{ marginTop: 12, backgroundColor: '#f59e0b' }}
                    />

                    <View style={styles.secondaryActions}>
                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBg }]} onPress={handleShare}>
                            <Share2 color="#10b981" size={22} />
                            <Text style={[styles.actionText, { color: '#10b981' }]}>Share PDF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBg }]} onPress={handleGeneratePdf}>
                            <FileText color="#818cf8" size={22} />
                            <Text style={[styles.actionText, { color: '#818cf8' }]}>Export</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Online Payment Actions */}
                    {(profile?.payment_link_stripe || profile?.payment_link_paypal) && (
                        <View style={{ marginTop: 24 }}>
                            <Text style={[styles.tinyLabel, { color: mutedColor, marginBottom: 12 }]}>Online Payment</Text>
                            <View style={styles.row}>
                                {profile?.payment_link_stripe && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#635bff', borderColor: '#635bff' }]}
                                        onPress={() => profile.payment_link_stripe && Linking.openURL(profile.payment_link_stripe)}
                                    >
                                        <Zap color="#fff" size={20} />
                                        <Text style={[styles.actionText, { color: '#fff' }]}>Stripe</Text>
                                    </TouchableOpacity>
                                )}
                                {profile?.payment_link_paypal && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#0070ba', borderColor: '#0070ba' }]}
                                        onPress={() => profile.payment_link_paypal && Linking.openURL(profile.payment_link_paypal)}
                                    >
                                        <CreditCard color="#fff" size={20} />
                                        <Text style={[styles.actionText, { color: '#fff' }]}>PayPal</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView >
        </View >
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
    actionBtn: { padding: 10, borderRadius: 10 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
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
    transformButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6, marginRight: 8 },
    transformText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    row: { flexDirection: 'row', gap: 16 },
    half: { flex: 1 },
    tinyLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    signatureSmallBox: { height: 50, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
