import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import {
    CreditCard,
    Mail,
    Download,
    User,
    ArrowLeft,
    ShieldCheck,
    ChevronRight,
    FileText,
    Settings,
    Layout
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';
import { t } from '../../i18n';

export function AdvancedSettingsScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language, setLanguage } = useTheme();
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [activeSection, setActiveSection] = useState<string | null>('integrations');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    };

    const updateField = async (field: string, value: any) => {
        if (!user) return;

        // Update local state immediately for snappy UI
        setProfile((prev: any) => ({ ...prev, [field]: value }));

        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ [field]: value, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            if (error) throw error;
            setLastSaved(new Date());
        } catch (error: any) {
            console.error('Auto-save error:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleExportData = async (format: 'json' | 'csv') => {
        try {
            Alert.alert('Exporting...', 'Please wait while we prepare your data.');

            const { data: invoices, error: invoicesError } = await supabase.from('invoices').select('*').eq('user_id', user?.id);
            const { data: clients, error: clientsError } = await supabase.from('clients').select('*').eq('user_id', user?.id);
            const { data: products, error: productsError } = await supabase.from('products').select('*').eq('user_id', user?.id);
            const { data: expenses, error: expensesError } = await supabase.from('expenses').select('*').eq('user_id', user?.id);
            const { data: vendors, error: vendorsError } = await supabase.from('vendors').select('*').eq('user_id', user?.id);

            if (invoicesError) console.error('Invoices error:', invoicesError);
            if (clientsError) console.error('Clients error:', clientsError);
            if (productsError) console.error('Products error:', productsError);
            if (expensesError) console.error('Expenses error:', expensesError);
            if (vendorsError) console.error('Vendors error:', vendorsError);

            // Create a map of client IDs to names
            const clientMap: { [key: string]: string } = {};
            clients?.forEach(c => { clientMap[c.id] = c.name; });

            if (format === 'json') {
                const backupData = {
                    exportDate: new Date().toISOString(),
                    invoices: invoices || [],
                    clients: clients || [],
                    products: products || [],
                    expenses: expenses || [],
                    vendors: vendors || []
                };
                const content = JSON.stringify(backupData, null, 2);
                const folder = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
                const dateStr = new Date().toISOString().split('T')[0];
                const fileUri = `${folder}backup_${dateStr}.json`;
                await FileSystem.writeAsStringAsync(fileUri, content);
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'Export Backup Data'
                });
            } else {
                const csvHeader = 'Date,Invoice Number,Client,Total Amount,Status\n';
                const csvRows = invoices?.map(inv => {
                    const clientName = clientMap[inv.client_id] || 'Unknown';
                    return `${inv.issue_date || ''},${inv.invoice_number || ''},"${clientName}",${inv.total_amount || 0},${inv.status || 'draft'}`;
                }).join('\n') || '';

                const folder = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
                const dateStr = new Date().toISOString().split('T')[0];
                const fileUri = `${folder}invoices_${dateStr}.csv`;
                await FileSystem.writeAsStringAsync(fileUri, csvHeader + csvRows);
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Export Invoices'
                });
            }

            Alert.alert('Success', `Export completed successfully!`);
        } catch (error: any) {
            console.error('Export error:', error);
            Alert.alert('Error', `Export failed: ${error.message || 'Unknown error'}`);
        }
    };

    const renderHeader = (title: string, Icon: any, section: string, color: string) => {
        const isActive = activeSection === section;
        return (
            <TouchableOpacity
                style={[styles.sectionHeader, { backgroundColor: cardBg }]}
                onPress={() => setActiveSection(isActive ? null : section)}
            >
                <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionIcon, { backgroundColor: color + '15' }]}>
                        <Icon color={color} size={20} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
                </View>
                <ChevronRight
                    color={mutedColor}
                    size={20}
                    style={{ transform: [{ rotate: isActive ? '90deg' : '0deg' }] }}
                />
            </TouchableOpacity>
        );
    };

    if (!profile) return null;

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{t('settings', language) || 'Settings'}</Text>
                    <Text style={[styles.title, { color: textColor }]}>Advanced</Text>
                </View>

                <View style={styles.statusIndicator}>
                    {saving ? (
                        <View style={styles.savingBadge}>
                            <ActivityIndicator size="small" color={primaryColor} style={{ marginRight: 6 }} />
                            <Text style={{ color: primaryColor, fontSize: 12, fontWeight: '600' }}>Saving...</Text>
                        </View>
                    ) : lastSaved ? (
                        <View style={styles.savedBadge}>
                            <ShieldCheck color="#10b981" size={14} style={{ marginRight: 4 }} />
                            <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '500' }}>Synced</Text>
                        </View>
                    ) : null}
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Document Layout */}
                {renderHeader('Document Layout', Layout, 'appearance', primaryColor)}
                {activeSection === 'appearance' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.label, { color: textColor }]}>Default Terms & Conditions</Text>
                        <Input
                            value={profile.terms_conditions}
                            onChangeText={(t) => updateField('terms_conditions', t)}
                            multiline
                            numberOfLines={4}
                            placeholder="Payment is due within 30 days..."
                        />

                        <View style={styles.divider} />
                        <Text style={[styles.label, { color: textColor }]}>Default Paper Size</Text>
                        <View style={styles.langGrid}>
                            {['A4', 'A5', 'Receipt'].map(size => (
                                <TouchableOpacity
                                    key={size}
                                    style={[
                                        styles.langOption,
                                        { backgroundColor: isDark ? '#334155' : '#f1f5f9', flex: 1, alignItems: 'center' },
                                        profile.template_config?.pageSize === size && { backgroundColor: primaryColor }
                                    ]}
                                    onPress={() => updateField('template_config', {
                                        ...(profile.template_config || { showLogo: true, showSignature: true, showBuyerSignature: true, showStamp: true, visibleColumns: { sku: true, unit: true, tax: true, quantity: true, price: true }, labels: {} }),
                                        pageSize: size
                                    })}
                                >
                                    <Text style={[styles.langText, { color: textColor }, profile.template_config?.pageSize === size && { color: '#fff' }]}>{size}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.divider} />
                        <Button
                            title="Invoice Design & Style"
                            variant="shortcut"
                            icon={Layout}
                            onPress={() => navigation.navigate('TemplateEditor')}
                            style={{ marginTop: 8 }}
                        />
                        <Button
                            title="Contract Templates"
                            variant="shortcut"
                            icon={FileText}
                            onPress={() => navigation.navigate('ContractTemplates')}
                            style={{ marginTop: 8 }}
                        />
                        <Button
                            title="Invoice Fields & Defaults"
                            variant="shortcut"
                            icon={Settings}
                            onPress={() => navigation.navigate('InvoiceTemplateSettings')}
                            style={{ marginTop: 8 }}
                        />
                    </Card>
                )}

                {/* Stripe/PayPal Integration */}
                {renderHeader('Payment Integrations', CreditCard, 'integrations', primaryColor)}
                {activeSection === 'integrations' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.subLabel, { color: mutedColor }]}>Native Integrations</Text>
                        <Text style={[styles.hint, { color: mutedColor, marginBottom: 12 }]}>
                            Connect your Stripe or PayPal account to accept online payments and sync transactions.
                        </Text>
                        <Button
                            title="Manage Stripe / PayPal"
                            variant="shortcut"
                            icon={CreditCard}
                            onPress={() => navigation.navigate('PaymentIntegrations')}
                        />
                    </Card>
                )}

                {/* Email & SMTP */}
                {renderHeader('Email Server (SMTP)', Mail, 'smtp', primaryColor)}
                {activeSection === 'smtp' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.hint, { color: mutedColor, marginBottom: 16 }]}>
                            Configure your SMTP server to send invoices directly via email.
                        </Text>
                        <Input
                            label="SMTP Host"
                            value={profile.smtp_host}
                            onChangeText={(val) => updateField('smtp_host', val)}
                            placeholder="smtp.gmail.com"
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Port"
                                    value={String(profile.smtp_port || '')}
                                    onChangeText={(val) => updateField('smtp_port', val ? Number(val) : null)}
                                    placeholder="587"
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.inputLabel, { color: textColor, marginBottom: 8 }]}>Secure (SSL/TLS)</Text>
                                <View style={styles.switchContainer}>
                                    <Switch
                                        value={profile.smtp_secure}
                                        onValueChange={(v) => updateField('smtp_secure', v)}
                                        trackColor={{ false: '#cbd5e1', true: primaryColor + '50' }}
                                        thumbColor={profile.smtp_secure ? primaryColor : '#f4f3f4'}
                                    />
                                    <Text style={[styles.switchText, { color: mutedColor }]}>
                                        {profile.smtp_secure ? 'Encrypted' : 'Standard'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <Input
                            label="Username"
                            value={profile.smtp_user}
                            onChangeText={(val) => updateField('smtp_user', val)}
                        />
                        <Input
                            label="Password"
                            value={profile.smtp_pass}
                            onChangeText={(val) => updateField('smtp_pass', val)}
                            secureTextEntry
                        />
                        <Input
                            label="From Email"
                            value={profile.smtp_from_email}
                            onChangeText={(val) => updateField('smtp_from_email', val)}
                            placeholder="billing@yourcompany.com"
                        />
                    </Card>
                )}

                {/* Backup & Data */}
                {renderHeader('Backup & Restore', Download, 'backup', primaryColor)}
                {activeSection === 'backup' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.hint, { color: mutedColor, marginBottom: 12 }]}>
                            Export all your data for backup or accounting purposes.
                        </Text>
                        <Button title="Backup All Data (JSON)" variant="shortcut" onPress={() => handleExportData('json')} icon={Download} />
                        <View style={{ height: 12 }} />
                        <Button title="Export Invoices (CSV)" variant="shortcut" onPress={() => handleExportData('csv')} icon={FileText} />
                    </Card>
                )}

                {/* Account Settings */}
                {renderHeader('Account & Security', User, 'account', primaryColor)}
                {activeSection === 'account' && (
                    <Card style={styles.sectionContent}>
                        <Button
                            title="Manage Profile & Security"
                            variant="shortcut"
                            icon={User}
                            onPress={() => navigation.navigate('Settings', { screen: 'SettingsMain' })}
                        />
                        <View style={{ height: 12 }} />
                        <Button
                            title="Manage Companies"
                            variant="shortcut"
                            icon={Settings}
                            onPress={() => navigation.navigate('ManageCompanies')}
                        />
                    </Card>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, gap: 16 },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    statusIndicator: {
        position: 'absolute',
        top: 60,
        right: 20,
    },
    savingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20
    },
    savedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20
    },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 60 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 14,
        marginBottom: 10,
    },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    sectionContent: { padding: 20, borderRadius: 20, marginTop: -6, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    subLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    hint: { fontSize: 13, lineHeight: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600' },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: 10,
        borderRadius: 12
    },
    switchText: { fontSize: 12, fontWeight: '600', marginLeft: 8 },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 },
    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    langOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    langText: { fontSize: 13, fontWeight: '600' },
});
