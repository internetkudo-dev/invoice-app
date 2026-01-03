import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Image, Switch, Platform } from 'react-native';
import { DollarSign, Percent, ChevronRight, Moon, Sun, Smartphone, Camera, Upload, Download, X, Image as ImageIcon, PenTool, Stamp, Palette, CreditCard, Languages, ShieldCheck, FileText, Trash2, Github, Briefcase, Users, Layout, Plus, Mail } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input, SignaturePadModal } from '../../components/common';
import { SvgXml } from 'react-native-svg';
import { Profile } from '../../types';
import { t } from '../../i18n';

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'ALL'];
const languages = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'German' },
    { code: 'fr', label: 'French' },
    { code: 'es', label: 'Spanish' },
    { code: 'it', label: 'Italian' },
    { code: 'sq', label: 'Albanian' },
];

const companyColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4', '#1e293b'
];

export function SettingsScreen({ navigation }: any) {
    const { user, signOut } = useAuth();
    const { themeMode, setThemeMode, isDark, primaryColor, setPrimaryColor, language, setLanguage } = useTheme();
    const [loading, setLoading] = useState(false);
    const [joinId, setJoinId] = useState('');
    const [profile, setProfile] = useState<Profile>({
        id: user?.id || '',
        company_name: '',
        email: user?.email || '',
        phone: '',
        address: '',
        currency: 'USD',
        tax_rate: 0,
        tax_name: 'VAT',
        primary_color: '#6366f1',
        is_grayscale: false,
        updated_at: new Date().toISOString(),
    });
    const [activeSection, setActiveSection] = useState<string | null>('appearance');
    const [showSignaturePad, setShowSignaturePad] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const accentBg = isDark ? '#1e293b' : '#f1f5f9';

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        if (!user) return;
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('profiles').upsert({
                ...profile,
                updated_at: new Date().toISOString()
            });
            if (error) throw error;
            if (error) throw error;
            setPrimaryColor(profile.primary_color);
            if (profile.invoice_language) setLanguage(profile.invoice_language);
            Alert.alert(t('save', language), 'OK');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (type: 'logo' | 'signature' | 'stamp') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'logo' ? [1, 1] : [4, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const base64 = `data:image/png;base64,${result.assets[0].base64}`;
            setProfile(prev => ({ ...prev, [`${type}_url`]: base64 }));
        }
    };

    const handleExportData = async (format: 'json' | 'csv') => {
        try {
            const { data: invoices } = await supabase.from('invoices').select('*, client:clients(*)').eq('user_id', user?.id);
            const content = format === 'json' ? JSON.stringify(invoices, null, 2) : 'Date,Number,Client,Amount,Status\n' + invoices?.map(i => `${i.issue_date},${i.invoice_number},${i.client?.name},${i.total_amount},${i.status}`).join('\n');
            const folder = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
            const fileUri = `${folder}invoices_backup.${format}`;
            await FileSystem.writeAsStringAsync(fileUri, content);
            await Sharing.shareAsync(fileUri);
        } catch (error) {
            Alert.alert('Error', 'Failed to export data');
        }
    };

    const handleBiometricToggle = async (value: boolean) => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
            Alert.alert('Not Supported', 'Your device does not support biometrics.');
            return;
        }
        setProfile({ ...profile, biometric_enabled: value });
    };

    const copyCompanyId = async () => {
        const id = profile.company_id || user?.id;
        if (id) {
            await Clipboard.setStringAsync(id);
            Alert.alert('Copied', 'Company ID copied to clipboard. Share this with your team.');
        }
    };

    const joinCompany = async (compId: string) => {
        if (!compId.trim()) return;
        Alert.alert(
            'Join Company',
            'Are you sure you want to join this company? You will see their invoices and your role will be "worker".',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Join',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const { error } = await supabase.from('profiles').update({
                                company_id: compId,
                                role: 'worker'
                            }).eq('id', user?.id);
                            if (error) throw error;
                            fetchProfile();
                            Alert.alert('Success', 'Joined company successfully');
                        } catch (err) {
                            Alert.alert('Error', 'Failed to join company. Check if ID is valid.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderHeader = (title: string, icon: any, section: string, color: string) => (
        <TouchableOpacity
            style={[styles.sectionHeader, { backgroundColor: cardBg }]}
            onPress={() => setActiveSection(activeSection === section ? null : section)}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                {React.createElement(icon, { color, size: 20 })}
            </View>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
            <ChevronRight
                color={mutedColor}
                size={20}
                style={{ transform: [{ rotate: activeSection === section ? '90deg' : '0deg' }] }}
            />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>{t('settings', language)}</Text>
                <Button title={t('save', language)} onPress={handleSave} loading={loading} size="small" />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Company Info */}
                {renderHeader(t('companyProfile', language), Briefcase, 'company', '#6366f1')}
                {activeSection === 'company' && (
                    <Card style={styles.sectionContent}>
                        <Input label="Company Name" value={profile.company_name} onChangeText={(t) => setProfile({ ...profile, company_name: t })} />
                        <Input label="Tax ID / Registration" value={profile.tax_id} onChangeText={(t) => setProfile({ ...profile, tax_id: t })} />
                        <Input label="Email" value={profile.email} onChangeText={(t) => setProfile({ ...profile, email: t })} keyboardType="email-address" />
                        <Input label="Phone" value={profile.phone} onChangeText={(t) => setProfile({ ...profile, phone: t })} keyboardType="phone-pad" />
                        <Input label="Address" value={profile.address} onChangeText={(t) => setProfile({ ...profile, address: t })} multiline />
                    </Card>
                )}

                {/* Payments & Bank */}
                {renderHeader(t('bankDetails', language), CreditCard, 'payments', '#10b981')}
                {activeSection === 'payments' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.subLabel, { color: mutedColor }]}>Bank Details (Apps on PDF)</Text>
                        <Input label="Bank Name" value={profile.bank_name} onChangeText={(t) => setProfile({ ...profile, bank_name: t })} />
                        <Input label="IBAN" value={profile.bank_iban} onChangeText={(t) => setProfile({ ...profile, bank_iban: t })} />
                        <Input label="SWIFT/BIC" value={profile.bank_swift} onChangeText={(t) => setProfile({ ...profile, bank_swift: t })} />

                        <View style={styles.divider} />
                        <Text style={[styles.subLabel, { color: mutedColor }]}>Payment Links (Adds Buttons to PDF)</Text>
                        <Input label="Stripe Payment Link" value={profile.payment_link_stripe} onChangeText={(t) => setProfile({ ...profile, payment_link_stripe: t })} placeholder="https://buy.stripe.com/..." />
                        <Input label="PayPal Link" value={profile.payment_link_paypal} onChangeText={(t) => setProfile({ ...profile, payment_link_paypal: t })} placeholder="https://paypal.me/..." />
                    </Card>
                )}

                {/* Email & SMTP */}
                {renderHeader('Email Settings (SMTP)', Mail, 'smtp', '#f59e0b')}
                {activeSection === 'smtp' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.hint, { color: mutedColor, marginBottom: 12 }]}>
                            Configure your SMTP server to send invoices directly to clients via email.
                        </Text>
                        <Input label="SMTP Host" value={profile.smtp_host} onChangeText={(t) => setProfile({ ...profile, smtp_host: t })} placeholder="smtp.gmail.com" />
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Input label="Port" value={String(profile.smtp_port || '')} onChangeText={(t) => setProfile({ ...profile, smtp_port: Number(t) })} placeholder="587" keyboardType="number-pad" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={[styles.label, { color: textColor, marginBottom: 8 }]}>Secure (SSL/TLS)</Text>
                                <Switch value={profile.smtp_secure} onValueChange={(v) => setProfile({ ...profile, smtp_secure: v })} />
                            </View>
                        </View>
                        <Input label="Username" value={profile.smtp_user} onChangeText={(t) => setProfile({ ...profile, smtp_user: t })} />
                        <Input label="Password" value={profile.smtp_pass} onChangeText={(t) => setProfile({ ...profile, smtp_pass: t })} secureTextEntry />
                        <Input label="From Email (Optional)" value={profile.smtp_from_email} onChangeText={(t) => setProfile({ ...profile, smtp_from_email: t })} placeholder="invoicing@yourcompany.com" />
                    </Card>
                )}

                {/* Language Settings */}
                {renderHeader(t('language', language), Languages, 'language', '#f59e0b')}
                {activeSection === 'language' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.label, { color: textColor }]}>{t('language', language)}</Text>
                        <View style={styles.langGrid}>
                            {languages.map(lang => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[styles.langOption, { backgroundColor: accentBg, width: '48%' }, profile.invoice_language === lang.code && { backgroundColor: primaryColor }]}
                                    onPress={() => setProfile({ ...profile, invoice_language: lang.code })}
                                >
                                    <Text style={[styles.langText, { color: textColor, textAlign: 'center' }, profile.invoice_language === lang.code && { color: '#fff' }]}>{lang.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>
                )}

                {/* App Appearance */}
                {renderHeader(t('appTheme', language), Palette, 'appearance', '#818cf8')}
                {activeSection === 'appearance' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.label, { color: textColor }]}>{t('appTheme', language)}</Text>
                        <View style={styles.langGrid}>
                            {[
                                { label: t('systemTheme', language), value: 'system', icon: Smartphone },
                                { label: t('lightMode', language), value: 'light', icon: Sun },
                                { label: t('darkMode', language), value: 'dark', icon: Moon },
                            ].map(mode => (
                                <TouchableOpacity
                                    key={mode.value}
                                    style={[styles.langOption, { backgroundColor: accentBg, flex: 1, alignItems: 'center', gap: 6 }, themeMode === mode.value && { backgroundColor: primaryColor }]}
                                    onPress={() => setThemeMode(mode.value as any)}
                                >
                                    {React.createElement(mode.icon, { size: 16, color: themeMode === mode.value ? '#fff' : textColor })}
                                    <Text style={[styles.langText, { color: textColor }, themeMode === mode.value && { color: '#fff' }]}>{mode.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.divider} />
                        <Text style={[styles.label, { color: textColor }]}>Brand & UI Color</Text>
                        <View style={styles.colorGrid}>
                            {companyColors.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[styles.colorOption, { backgroundColor: color }, profile.primary_color === color && { borderColor: textColor, borderWidth: 3 }]}
                                    onPress={() => setProfile({ ...profile, primary_color: color })}
                                />
                            ))}
                        </View>

                        <View style={styles.rowBetween}>
                            <Text style={[styles.label, { color: textColor }]}>Economical / Grayscale Mode</Text>
                            <Switch value={profile.is_grayscale} onValueChange={(v) => setProfile({ ...profile, is_grayscale: v })} />
                        </View>

                        <Input label="Default Terms & Conditions" value={profile.terms_conditions} onChangeText={(t) => setProfile({ ...profile, terms_conditions: t })} multiline numberOfLines={4} placeholder="Payment is due within 30 days..." />

                        <View style={styles.divider} />
                        <Button
                            title="Edit PDF Template Layout"
                            variant="primary"
                            icon={Layout}
                            onPress={() => navigation.navigate('TemplateEditor')}
                            style={{ marginTop: 8 }}
                        />
                        <Button
                            title="Contract Templates"
                            variant="outline"
                            icon={FileText}
                            onPress={() => navigation.navigate('ContractTemplates')}
                            style={{ marginTop: 8 }}
                        />
                        <Button
                            title="Invoice Template Settings"
                            variant="outline"
                            icon={FileText}
                            onPress={() => navigation.navigate('InvoiceTemplateSettings')}
                            style={{ marginTop: 8 }}
                        />
                    </Card>
                )}

                {/* Identity & Visuals */}
                {renderHeader('Logos & Signatures', Camera, 'visuals', '#ec4899')}
                {activeSection === 'visuals' && (
                    <Card style={styles.sectionContent}>
                        <AssetPicker label="Company Logo" value={profile.logo_url} onPick={() => pickImage('logo')} onClear={() => setProfile({ ...profile, logo_url: '' })} icon={ImageIcon} isDark={isDark} />
                        <AssetPicker
                            label="Signature"
                            value={profile.signature_url}
                            onPick={() => pickImage('signature')}
                            onClear={() => setProfile({ ...profile, signature_url: '' })}
                            onDraw={() => setShowSignaturePad(true)}
                            icon={PenTool}
                            isDark={isDark}
                        />
                        <AssetPicker label="Official Stamp" value={profile.stamp_url} onPick={() => pickImage('stamp')} onClear={() => setProfile({ ...profile, stamp_url: '' })} icon={Stamp} isDark={isDark} />
                    </Card>
                )}

                {/* Team & Collaboration */}
                {renderHeader('Team & Collaboration', Users, 'team', '#10b981')}
                {activeSection === 'team' && (
                    <Card style={styles.sectionContent}>
                        <View style={styles.rowBetween}>
                            <View>
                                <Text style={[styles.label, { color: textColor }]}>Company Status</Text>
                                <Text style={[styles.hint, { color: mutedColor }]}>
                                    Role: <Text style={{ fontWeight: 'bold', color: primaryColor }}>{profile.role?.toUpperCase() || 'OWNER'}</Text>
                                </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: primaryColor + '20' }]}>
                                <Text style={{ color: primaryColor, fontSize: 10, fontWeight: 'bold' }}>ACTIVE</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <Text style={[styles.label, { color: textColor }]}>Invite Team Member</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Your Company ID"
                                    value={profile.company_id || user?.id}
                                    editable={false}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: primaryColor, marginLeft: 8, height: 50, marginTop: 4 }]}
                                onPress={copyCompanyId}
                            >
                                <Mail color="#fff" size={20} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <Text style={[styles.label, { color: textColor }]}>Join another Company</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Input
                                    placeholder="Enter Company ID"
                                    value={joinId}
                                    onChangeText={setJoinId}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: '#10b981', marginLeft: 8, height: 50, marginTop: 4 }]}
                                onPress={() => joinCompany(joinId)}
                            >
                                <Plus color="#fff" size={20} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.hint, { color: mutedColor, marginTop: 12 }]}>
                            Owners can see all company data. Workers can view and create but cannot delete/edit invoices.
                        </Text>
                    </Card>
                )}

                {/* Security */}
                {renderHeader('App Security', ShieldCheck, 'security', '#f59e0b')}
                {activeSection === 'security' && (
                    <Card style={styles.sectionContent}>
                        <View style={styles.rowBetween}>
                            <View style={{ flex: 1, marginRight: 16 }}>
                                <Text style={[styles.label, { color: textColor }]}>Biometric Lock</Text>
                                <Text style={[styles.hint, { color: mutedColor }]}>Requires FaceID/Fingerprint to open the app.</Text>
                            </View>
                            <Switch value={profile.biometric_enabled} onValueChange={handleBiometricToggle} />
                        </View>
                    </Card>
                )}

                {/* Data Management */}
                {renderHeader('Data & Backup', Download, 'data', '#64748b')}
                {activeSection === 'data' && (
                    <Card style={styles.sectionContent}>
                        <Button title="Backup All Data (JSON)" variant="outline" onPress={() => handleExportData('json')} icon={Download} />
                        <View style={{ height: 12 }} />
                        <Button title="Export for Accountant (CSV)" variant="outline" onPress={() => handleExportData('csv')} icon={FileText} />
                        <View style={{ height: 24 }} />
                        <Button title="Sign Out" variant="danger" onPress={signOut} icon={X} />
                    </Card>
                )}

                <View style={styles.footer}>
                    <Text style={[styles.version, { color: mutedColor }]}>Invoice App v2.0.0</Text>
                </View>
            </ScrollView>
            <SignaturePadModal
                visible={showSignaturePad}
                onClose={() => setShowSignaturePad(false)}
                onSave={(sig) => setProfile(prev => ({ ...prev, signature_url: sig }))}
                primaryColor={primaryColor}
            />
        </View>
    );
}

function AssetPicker({ label, value, onPick, onClear, onDraw, icon, isDark }: any) {
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    return (
        <View style={styles.assetContainer}>
            <Text style={[styles.assetLabel, { color: textColor }]}>{label}</Text>
            {value ? (
                <View style={styles.assetPreview}>
                    {value.startsWith('data:image/svg+xml') ? (
                        <View style={{ width: '100%', height: '100%', padding: 4 }}>
                            <SvgXml xml={decodeURIComponent(value.split(',')[1])} width="100%" height="100%" />
                        </View>
                    ) : (
                        <Image source={{ uri: value }} style={styles.assetImage} resizeMode="contain" />
                    )}
                    <TouchableOpacity style={styles.clearBadge} onPress={onClear}>
                        <X color="#fff" size={12} />
                    </TouchableOpacity>
                </View>
            ) : (
                onDraw ? (
                    <View style={[styles.assetPreview, { flexDirection: 'row', gap: 10, padding: 10 }]}>
                        <TouchableOpacity style={[styles.uploadPlaceholder, { backgroundColor: isDark ? '#334155' : '#f1f5f9', borderRadius: 8 }]} onPress={onDraw}>
                            <PenTool color={mutedColor} size={20} />
                            <Text style={{ color: mutedColor, fontSize: 11, marginTop: 4 }}>Draw</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.uploadPlaceholder, { backgroundColor: isDark ? '#334155' : '#f1f5f9', borderRadius: 8 }]} onPress={onPick}>
                            <Upload color={mutedColor} size={20} />
                            <Text style={{ color: mutedColor, fontSize: 11, marginTop: 4 }}>Upload</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.assetPreview} onPress={onPick}>
                        <View style={styles.uploadPlaceholder}>
                            {React.createElement(icon, { color: mutedColor, size: 24 })}
                            <Text style={{ color: mutedColor, fontSize: 12, marginTop: 4 }}>Tap to upload</Text>
                        </View>
                    </TouchableOpacity>
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: 'bold' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 60 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8 },
    iconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
    sectionContent: { padding: 16, marginBottom: 16 },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
    subLabel: { fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
    divider: { height: 1, backgroundColor: '#334155', marginVertical: 16, opacity: 0.1 },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    hint: { fontSize: 13, marginTop: 4 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    colorOption: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    langOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    langText: { fontSize: 13, fontWeight: '600' },
    assetContainer: { marginBottom: 16 },
    assetLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    assetPreview: { height: 80, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#334155', overflow: 'hidden' },
    assetImage: { width: '100%', height: '100%' },
    clearBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 10, padding: 4 },
    uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    footer: { marginTop: 32, alignItems: 'center' },
    version: { fontSize: 12, fontWeight: '500' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    smallActionBtn: {
        width: 50,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
