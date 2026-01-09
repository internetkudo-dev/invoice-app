import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
    Modal,
} from 'react-native';
import { ArrowLeft, Edit, Share2, FileText, Check, Trash2, Eye, RefreshCw, Mail, Zap, CreditCard, Download, Printer, X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, StatusBadge, TemplatePreview } from '../../components/common';
import { Invoice, InvoiceItem, TemplateType, InvoiceData, Profile } from '../../types';
import { generatePdf, sharePdf, printPdf } from '../../services/pdf/pdfService';
import { generateInvoiceHtml } from '../../services/pdf/TemplateFactory';
import { formatCurrency } from '../../utils/format';
import { t } from '../../i18n';

interface InvoiceDetailScreenProps {
    navigation: any;
    route: any;
}



export function InvoiceDetailScreen({ navigation, route }: InvoiceDetailScreenProps) {
    const { user } = useAuth();
    const { isDark, language } = useTheme();
    const invoiceId = route.params?.invoiceId;
    const autoPreview = route.params?.autoPreview;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [pdfUri, setPdfUri] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';
    const primaryColor = profile?.primary_color || '#818cf8';

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [invoiceId])
    );

    const fetchData = async () => {
        if (!user || !invoiceId) return;

        let { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();

        if (profileData?.active_company_id) {
            const { data: companyData } = await supabase
                .from('companies')
                .select('*')
                .eq('id', profileData.active_company_id)
                .single();

            if (companyData) {
                profileData = { ...profileData, ...companyData };
            }
        }

        if (profileData) setProfile(profileData);

        const { data: invoiceData } = await supabase
            .from('invoices')
            .select(`*, client:clients(*)`)
            .eq('id', invoiceId)
            .single();

        if (invoiceData) {
            setInvoice(invoiceData);
        }

        const { data: itemsData } = await supabase.from('invoice_items').select('*, product:products(sku, name)').eq('invoice_id', invoiceId);
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
                city: profile.city,
                country: profile.country,
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
                phone: client?.phone || '',
                taxId: client?.tax_id || '',
                nui: client?.nui || '',
                fiscalNumber: client?.fiscal_number || '',
                vatNumber: client?.vat_number || '',
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
                type: invoice.type,
                subtype: (invoice as any).subtype || 'regular',
            },
            items: items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unit: item.unit,
                sku: (item as any).product?.sku || (item as any).sku,
                price: Number(item.unit_price),
                discount: (item as any).discount || 0,
                total: Number(item.amount),
                taxRate: Number(item.tax_rate) || 0,
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

        setGenerating(true);
        let templateToUse: TemplateType = 'hidroterm';
        const result = await generatePdf(data, templateToUse);
        setGenerating(false);

        if (result.success && result.uri) {
            // "Save to phone files" implies opening the share sheet or saving directly.
            // sharingAsync is the most reliable way to allow both on iOS/Android without complex perm setup for direct download folder access.
            await sharePdf(result.uri);
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

            let templateToUse: TemplateType = 'hidroterm';
            const pdfResult = await generatePdf(data, templateToUse);
            if (!pdfResult.success || !pdfResult.uri) throw new Error('Failed to generate PDF');

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

        let templateToUse: TemplateType = 'hidroterm';
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

        let templateToUse: TemplateType = 'hidroterm';
        setGenerating(true);
        const result = await printPdf(data, templateToUse);
        setGenerating(false);

        if (!result.success && !result.canceled) {
            Alert.alert('Error', result.error || 'Failed to show preview');
        }
    };

    const handlePreview = () => {
        const data = buildInvoiceData();
        if (!data) return;

        const html = generateInvoiceHtml(data, 'hidroterm');
        setHtmlContent(html);
        setShowPreview(true);
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
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                        <ArrowLeft color={textColor} size={24} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.subtitle, { color: mutedColor }]} numberOfLines={1}>{(invoice as any).client?.name || 'No client'}</Text>
                        <Text style={[styles.title, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>{invoice.invoice_number}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    {invoice.type === 'offer' && (
                        <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: primaryColor, marginRight: 8 }]}
                            onPress={handleTransformToInvoice}
                        >
                            <RefreshCw color="#fff" size={20} />
                        </TouchableOpacity>
                    )}
                    {profile?.role !== 'worker' && (
                        <>
                            <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: '#fee2e2', marginRight: 8 }]}
                                onPress={handleDelete}
                            >
                                <Trash2 color="#ef4444" size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => navigation.navigate('InvoiceForm', { invoiceId: invoice.id })}
                            >
                                <Edit color={textColor} size={20} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Status Card */}
                <Card style={styles.mainCard}>
                    <View style={styles.mainCardHeader}>
                        <View>
                            <Text style={[styles.amountLabel, { color: mutedColor }]}>Total Amount</Text>
                            <Text style={[styles.totalAmount, { color: primaryColor }]}>{formatCurrency(Number(invoice.total_amount), profile?.currency)}</Text>
                        </View>
                        <StatusBadge status={invoice.status} />
                    </View>

                    <View style={[styles.divider, { backgroundColor: borderColor }]} />

                    <View style={styles.datesRow}>
                        <View>
                            <Text style={[styles.dateLabel, { color: mutedColor }]}>Issued</Text>
                            <Text style={[styles.dateValue, { color: textColor }]}>{invoice.issue_date}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.dateLabel, { color: mutedColor }]}>Due</Text>
                            <Text style={[styles.dateValue, { color: textColor }]}>{invoice.due_date || 'On Receipt'}</Text>
                        </View>
                    </View>
                </Card>

                {/* Status Selector */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Status Update</Text>
                <View style={styles.statusScroll}>
                    {['draft', 'sent', 'paid', 'overdue'].map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.statusChip,
                                { backgroundColor: cardBg, borderColor },
                                invoice.status === status && { backgroundColor: primaryColor, borderColor: primaryColor }
                            ]}
                            onPress={() => handleUpdateStatus(status)}
                        >
                            <Text style={[styles.statusChipText, { color: invoice.status === status ? '#fff' : mutedColor }]}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>



                {/* Items */}
                <Text style={[styles.sectionTitle, { color: textColor }]}>Items ({items.length})</Text>
                <Card style={styles.itemsCard}>
                    {items.map((item, index) => (
                        <View key={item.id} style={[styles.itemRow, index < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor }]}>
                            <View style={styles.itemInfo}>
                                <Text style={[styles.itemName, { color: textColor }]}>{item.description}</Text>
                                <Text style={[styles.itemMeta, { color: mutedColor }]}>
                                    {item.quantity} x {formatCurrency(Number(item.unit_price), profile?.currency)}
                                </Text>
                            </View>
                            <Text style={[styles.itemTotal, { color: textColor }]}>{formatCurrency(Number(item.amount), profile?.currency)}</Text>
                        </View>
                    ))}

                    <View style={[styles.summarySection, { borderTopColor: borderColor }]}>
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
                        <View style={[styles.summaryRow, { marginTop: 8 }]}>
                            <Text style={[styles.totalLabel, { color: textColor }]}>Total</Text>
                            <Text style={[styles.totalValue, { color: primaryColor }]}>{formatCurrency(Number(invoice.total_amount), profile?.currency)}</Text>
                        </View>
                    </View>
                </Card>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <Button
                        title={generating ? 'Building Preview...' : 'Preview Document'}
                        onPress={handlePreview}
                        icon={Eye}
                        loading={generating}
                        style={{ marginBottom: 12 }}
                    />

                    <View style={styles.actionGrid}>
                        <Button
                            title="Share"
                            onPress={handleShare}
                            icon={Share2}
                            variant="secondary"
                            style={{ flex: 1 }}
                        />
                        <Button
                            title="Email"
                            onPress={handleSendEmail}
                            icon={Mail}
                            variant="secondary"
                            style={{ flex: 1 }}
                            loading={sending}
                        />
                    </View>

                    <View style={[styles.actionGrid, { marginTop: 12 }]}>
                        <Button
                            title="Print"
                            onPress={handlePrint}
                            icon={Printer}
                            variant="primary" // Changed to primary for visibility/differentiation logic or kept utility
                            style={{ flex: 1, backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
                            textStyle={{ color: textColor }}
                        />
                        <Button
                            title="Download PDF"
                            onPress={handleGeneratePdf}
                            icon={Download}
                            variant="primary"
                            style={{ flex: 1, backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
                            textStyle={{ color: textColor }}
                        />
                    </View>
                </View>

                {/* Online Payment Actions */}
                {(profile?.payment_link_stripe || profile?.payment_link_paypal) && (
                    <View style={{ marginTop: 24 }}>
                        <Text style={[styles.dateLabel, { color: mutedColor, marginBottom: 12, textTransform: 'uppercase' }]}>Online Payment Links</Text>
                        <View style={styles.actionGrid}>
                            {profile?.payment_link_stripe && (
                                <Button
                                    title="Stripe Link"
                                    onPress={() => profile.payment_link_stripe && Linking.openURL(profile.payment_link_stripe)}
                                    icon={Zap}
                                    style={{ flex: 1, backgroundColor: '#635bff', borderColor: '#635bff' }}
                                    textStyle={{ color: '#fff' }}
                                />
                            )}
                            {profile?.payment_link_paypal && (
                                <Button
                                    title="PayPal Link"
                                    onPress={() => profile.payment_link_paypal && Linking.openURL(profile.payment_link_paypal)}
                                    icon={CreditCard}
                                    style={{ flex: 1, backgroundColor: '#0070ba', borderColor: '#0070ba' }}
                                    textStyle={{ color: '#fff' }}
                                />
                            )}
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal visible={showPreview} animationType="slide">
                <View style={{ flex: 1, backgroundColor: bgColor }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 }}>
                        <TouchableOpacity onPress={() => setShowPreview(false)}>
                            <X color={textColor} size={24} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor }}>Invoice Preview</Text>
                        <TouchableOpacity onPress={handlePrint}>
                            <Printer color={primaryColor} size={24} />
                        </TouchableOpacity>
                    </View>
                    <WebView
                        source={{ html: htmlContent }}
                        style={{ flex: 1 }}
                        originWhitelist={['*']}
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },

    title: { fontSize: 22, fontWeight: '800' },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },

    smallActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    scroll: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },

    mainCard: { padding: 20, borderRadius: 20, marginBottom: 24 },
    mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    amountLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    totalAmount: { fontSize: 32, fontWeight: '800' },

    divider: { height: 1, marginVertical: 16 },
    datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dateLabel: { fontSize: 12, marginBottom: 4 },
    dateValue: { fontSize: 15, fontWeight: '600' },

    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 8 },

    statusScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    statusChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    statusChipText: { fontSize: 13, fontWeight: '600' },

    itemsCard: { padding: 0, borderRadius: 20, marginBottom: 24, overflow: 'hidden' },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
    itemMeta: { fontSize: 13 },
    itemTotal: { fontSize: 15, fontWeight: '700' },

    summarySection: { padding: 16, backgroundColor: 'rgba(0,0,0,0.02)', borderTopWidth: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 14 },
    summaryValue: { fontSize: 14, fontWeight: '600' },
    totalLabel: { fontSize: 16, fontWeight: 'bold' },
    totalValue: { fontSize: 18, fontWeight: '800' },

    actionsContainer: { gap: 0 },
    actionGrid: { flexDirection: 'row', gap: 12 },
});
