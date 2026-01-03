import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Image } from 'react-native';
import { DollarSign, Percent, ChevronRight, Moon, Sun, Smartphone, Camera, Upload, Download, X, Image as ImageIcon, PenTool, Stamp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';
import { Profile } from '../../types';
import { ThemeMode } from '../../context/ThemeContext';

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'ALL'];
const taxTypes = ['VAT', 'GST', 'Sales Tax', 'None'];
const themeModes: { mode: ThemeMode; label: string; Icon: any }[] = [
    { mode: 'light', label: 'Light', Icon: Sun },
    { mode: 'dark', label: 'Dark', Icon: Moon },
    { mode: 'system', label: 'System', Icon: Smartphone },
];

export function SettingsScreen() {
    const { user, signOut } = useAuth();
    const { themeMode, setThemeMode, isDark } = useTheme();
    const [profile, setProfile] = useState<Partial<Profile>>({
        company_name: '',
        email: '',
        phone: '',
        address: '',
        currency: 'USD',
        tax_rate: 0,
        tax_name: 'VAT',
        bank_name: '',
        bank_account: '',
        bank_iban: '',
        bank_swift: '',
        website: '',
        tax_id: '',
        logo_url: '',
        signature_url: '',
        stamp_url: '',
    });
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#0f172a' : '#f1f5f9';
    const accentBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await supabase.from('profiles').update(profile).eq('id', user?.id);
            Alert.alert('Success', 'Settings saved successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (type: 'logo' | 'signature' | 'stamp') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: type === 'logo' ? [2, 1] : [3, 1],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const base64Url = `data:image/jpeg;base64,${result.assets[0].base64}`;

            switch (type) {
                case 'logo':
                    setProfile({ ...profile, logo_url: base64Url });
                    break;
                case 'signature':
                    setProfile({ ...profile, signature_url: base64Url });
                    break;
                case 'stamp':
                    setProfile({ ...profile, stamp_url: base64Url });
                    break;
            }
        }
    };

    const removeImage = (type: 'logo' | 'signature' | 'stamp') => {
        switch (type) {
            case 'logo':
                setProfile({ ...profile, logo_url: '' });
                break;
            case 'signature':
                setProfile({ ...profile, signature_url: '' });
                break;
            case 'stamp':
                setProfile({ ...profile, stamp_url: '' });
                break;
        }
    };

    const handleExportInvoices = async () => {
        try {
            const { data: invoices } = await supabase
                .from('invoices')
                .select('*, invoice_items(*), client:clients(*)')
                .eq('user_id', user?.id);

            if (!invoices || invoices.length === 0) {
                Alert.alert('No Data', 'No invoices to export');
                return;
            }

            const exportData = JSON.stringify(invoices, null, 2);
            const fileUri = `${FileSystem.cacheDirectory}invoices_export_${Date.now()}.json`;
            await FileSystem.writeAsStringAsync(fileUri, exportData);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'Export Invoices',
                });
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to export invoices');
        }
    };

    const handleImportInvoices = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
            if (result.canceled || !result.assets?.[0]) return;

            const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
            const invoices = JSON.parse(fileContent);

            Alert.alert('Import Invoices', `Found ${invoices.length} invoices. Import them?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Import',
                    onPress: async () => {
                        for (const inv of invoices) {
                            const { invoice_items, client, ...invoiceData } = inv;
                            invoiceData.user_id = user?.id;
                            delete invoiceData.id;

                            const { data: newInvoice } = await supabase.from('invoices').insert(invoiceData).select().single();

                            if (newInvoice && invoice_items) {
                                const items = invoice_items.map((item: any) => ({ ...item, invoice_id: newInvoice.id, id: undefined }));
                                await supabase.from('invoice_items').insert(items);
                            }
                        }
                        Alert.alert('Success', 'Invoices imported successfully');
                    },
                },
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to import invoices');
        }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
        ]);
    };

    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? null : section);
    };

    const ImageUploadBox = ({ type, label, icon: Icon, imageUrl }: { type: 'logo' | 'signature' | 'stamp'; label: string; icon: any; imageUrl?: string }) => (
        <View style={styles.imageBox}>
            <Text style={[styles.imageLabel, { color: textColor }]}>{label}</Text>
            <TouchableOpacity
                style={[styles.imageUpload, { backgroundColor: cardBg, borderColor: isDark ? '#334155' : '#cbd5e1' }]}
                onPress={() => pickImage(type)}
            >
                {imageUrl ? (
                    <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="contain" />
                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(type)}>
                            <X color="#fff" size={14} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.uploadPlaceholder}>
                        <Icon color={mutedColor} size={32} />
                        <Text style={[styles.uploadText, { color: mutedColor }]}>Tap to upload</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.header, { color: textColor }]}>Settings</Text>

                {/* Appearance */}
                <TouchableOpacity onPress={() => toggleSection('appearance')}>
                    <View style={[styles.sectionHeader, { backgroundColor: accentBg }]}>
                        <View style={styles.sectionHeaderLeft}>
                            <Sun color="#f59e0b" size={20} />
                            <Text style={[styles.sectionHeaderText, { color: textColor }]}>Appearance</Text>
                        </View>
                        <ChevronRight color={mutedColor} size={20} style={{ transform: [{ rotate: activeSection === 'appearance' ? '90deg' : '0deg' }] }} />
                    </View>
                </TouchableOpacity>
                {activeSection === 'appearance' && (
                    <Card style={styles.card}>
                        <View style={styles.themeRow}>
                            {themeModes.map(({ mode, label, Icon }) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[styles.themeButton, { backgroundColor: cardBg }, themeMode === mode && styles.themeButtonActive]}
                                    onPress={() => setThemeMode(mode)}
                                >
                                    <Icon color={themeMode === mode ? '#fff' : mutedColor} size={24} />
                                    <Text style={[styles.themeLabel, { color: mutedColor }, themeMode === mode && styles.themeLabelActive]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>
                )}

                {/* Company Profile */}
                <TouchableOpacity onPress={() => toggleSection('company')}>
                    <View style={[styles.sectionHeader, { backgroundColor: accentBg }]}>
                        <View style={styles.sectionHeaderLeft}>
                            <ImageIcon color="#6366f1" size={20} />
                            <Text style={[styles.sectionHeaderText, { color: textColor }]}>Company Profile</Text>
                        </View>
                        <ChevronRight color={mutedColor} size={20} style={{ transform: [{ rotate: activeSection === 'company' ? '90deg' : '0deg' }] }} />
                    </View>
                </TouchableOpacity>
                {activeSection === 'company' && (
                    <Card style={styles.card}>
                        <Input label="Company Name" value={profile.company_name || ''} onChangeText={(text) => setProfile({ ...profile, company_name: text })} placeholder="Your Company Name" />
                        <Input label="Email" value={profile.email || ''} onChangeText={(text) => setProfile({ ...profile, email: text })} placeholder="company@email.com" keyboardType="email-address" />
                        <Input label="Phone" value={profile.phone || ''} onChangeText={(text) => setProfile({ ...profile, phone: text })} placeholder="+1 234 567 890" keyboardType="phone-pad" />
                        <Input label="Address" value={profile.address || ''} onChangeText={(text) => setProfile({ ...profile, address: text })} placeholder="123 Main St, City, Country" multiline />
                        <Input label="Website" value={profile.website || ''} onChangeText={(text) => setProfile({ ...profile, website: text })} placeholder="www.yourcompany.com" />
                        <Input label="Tax ID / VAT Number" value={profile.tax_id || ''} onChangeText={(text) => setProfile({ ...profile, tax_id: text })} placeholder="Tax identification" />
                    </Card>
                )}

                {/* Logo, Signature & Stamp */}
                <TouchableOpacity onPress={() => toggleSection('branding')}>
                    <View style={[styles.sectionHeader, { backgroundColor: accentBg }]}>
                        <View style={styles.sectionHeaderLeft}>
                            <Camera color="#10b981" size={20} />
                            <Text style={[styles.sectionHeaderText, { color: textColor }]}>Logo, Signature & Stamp</Text>
                        </View>
                        <ChevronRight color={mutedColor} size={20} style={{ transform: [{ rotate: activeSection === 'branding' ? '90deg' : '0deg' }] }} />
                    </View>
                </TouchableOpacity>
                {activeSection === 'branding' && (
                    <Card style={styles.card}>
                        <Text style={[styles.hintText, { color: mutedColor }]}>
                            Upload your company branding assets. These will appear on all invoice PDFs.
                        </Text>
                        <View style={styles.imageGrid}>
                            <ImageUploadBox type="logo" label="Company Logo" icon={ImageIcon} imageUrl={profile.logo_url} />
                            <ImageUploadBox type="signature" label="Signature" icon={PenTool} imageUrl={profile.signature_url} />
                            <ImageUploadBox type="stamp" label="Company Stamp" icon={Stamp} imageUrl={profile.stamp_url} />
                        </View>
                    </Card>
                )}

                {/* Bank Information */}
                <TouchableOpacity onPress={() => toggleSection('bank')}>
                    <View style={[styles.sectionHeader, { backgroundColor: accentBg }]}>
                        <View style={styles.sectionHeaderLeft}>
                            <DollarSign color="#3b82f6" size={20} />
                            <Text style={[styles.sectionHeaderText, { color: textColor }]}>Bank Information</Text>
                        </View>
                        <ChevronRight color={mutedColor} size={20} style={{ transform: [{ rotate: activeSection === 'bank' ? '90deg' : '0deg' }] }} />
                    </View>
                </TouchableOpacity>
                {activeSection === 'bank' && (
                    <Card style={styles.card}>
                        <Text style={[styles.hintText, { color: mutedColor }]}>
                            Payment details shown on invoices for clients to send payments.
                        </Text>
                        <Input label="Bank Name" value={profile.bank_name || ''} onChangeText={(text) => setProfile({ ...profile, bank_name: text })} placeholder="Bank name" />
                        <Input label="Account Number" value={profile.bank_account || ''} onChangeText={(text) => setProfile({ ...profile, bank_account: text })} placeholder="Account number" />
                        <Input label="IBAN" value={profile.bank_iban || ''} onChangeText={(text) => setProfile({ ...profile, bank_iban: text })} placeholder="International Bank Account Number" />
                        <Input label="SWIFT/BIC" value={profile.bank_swift || ''} onChangeText={(text) => setProfile({ ...profile, bank_swift: text })} placeholder="SWIFT/BIC code" />
                    </Card>
                )}

                {/* Currency & Tax */}
                <TouchableOpacity onPress={() => toggleSection('currency')}>
                    <View style={[styles.sectionHeader, { backgroundColor: accentBg }]}>
                        <View style={styles.sectionHeaderLeft}>
                            <Percent color="#ec4899" size={20} />
                            <Text style={[styles.sectionHeaderText, { color: textColor }]}>Currency & Tax</Text>
                        </View>
                        <ChevronRight color={mutedColor} size={20} style={{ transform: [{ rotate: activeSection === 'currency' ? '90deg' : '0deg' }] }} />
                    </View>
                </TouchableOpacity>
                {activeSection === 'currency' && (
                    <Card style={styles.card}>
                        <Text style={[styles.fieldLabel, { color: textColor }]}>Currency</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {currencies.map((curr) => (
                                <TouchableOpacity
                                    key={curr}
                                    style={[styles.chip, { backgroundColor: cardBg }, profile.currency === curr && styles.chipActive]}
                                    onPress={() => setProfile({ ...profile, currency: curr })}
                                >
                                    <Text style={[styles.chipText, profile.currency === curr && styles.chipTextActive]}>{curr}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[styles.fieldLabel, { color: textColor, marginTop: 16 }]}>Tax Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {taxTypes.map((tax) => (
                                <TouchableOpacity
                                    key={tax}
                                    style={[styles.chip, { backgroundColor: cardBg }, profile.tax_name === tax && styles.chipActive]}
                                    onPress={() => setProfile({ ...profile, tax_name: tax })}
                                >
                                    <Text style={[styles.chipText, profile.tax_name === tax && styles.chipTextActive]}>{tax}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Input label="Tax Rate (%)" value={String(profile.tax_rate || 0)} onChangeText={(text) => setProfile({ ...profile, tax_rate: Number(text) || 0 })} placeholder="0" keyboardType="decimal-pad" />
                    </Card>
                )}

                <Button title="Save All Settings" onPress={handleSave} loading={loading} style={styles.saveButton} />

                {/* Data Management */}
                <TouchableOpacity onPress={() => toggleSection('data')}>
                    <View style={[styles.sectionHeader, { backgroundColor: accentBg }]}>
                        <View style={styles.sectionHeaderLeft}>
                            <Download color="#8b5cf6" size={20} />
                            <Text style={[styles.sectionHeaderText, { color: textColor }]}>Data Management</Text>
                        </View>
                        <ChevronRight color={mutedColor} size={20} style={{ transform: [{ rotate: activeSection === 'data' ? '90deg' : '0deg' }] }} />
                    </View>
                </TouchableOpacity>
                {activeSection === 'data' && (
                    <Card style={styles.card}>
                        <TouchableOpacity style={styles.dataRow} onPress={handleExportInvoices}>
                            <View style={styles.dataLeft}>
                                <View style={[styles.dataIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Download color="#10b981" size={20} />
                                </View>
                                <View>
                                    <Text style={[styles.dataLabel, { color: textColor }]}>Export All Invoices</Text>
                                    <Text style={[styles.dataHint, { color: mutedColor }]}>Save as JSON file</Text>
                                </View>
                            </View>
                            <ChevronRight color={mutedColor} size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dataRow} onPress={handleImportInvoices}>
                            <View style={styles.dataLeft}>
                                <View style={[styles.dataIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                    <Upload color="#3b82f6" size={20} />
                                </View>
                                <View>
                                    <Text style={[styles.dataLabel, { color: textColor }]}>Import Invoices</Text>
                                    <Text style={[styles.dataHint, { color: mutedColor }]}>Load from JSON file</Text>
                                </View>
                            </View>
                            <ChevronRight color={mutedColor} size={20} />
                        </TouchableOpacity>
                    </Card>
                )}

                <View style={styles.signOutContainer}>
                    <Button title="Sign Out" variant="danger" onPress={handleSignOut} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingTop: 56, paddingBottom: 40 },
    header: { fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 4 },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sectionHeaderText: { fontSize: 16, fontWeight: '600' },
    card: { marginBottom: 12 },
    themeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    themeButton: { flex: 1, alignItems: 'center', paddingVertical: 16, marginHorizontal: 4, borderRadius: 12 },
    themeButtonActive: { backgroundColor: '#6366f1' },
    themeLabel: { marginTop: 8, fontWeight: '500' },
    themeLabelActive: { color: '#fff' },
    hintText: { fontSize: 13, marginBottom: 16, lineHeight: 20 },
    imageGrid: { gap: 16 },
    imageBox: { marginBottom: 16 },
    imageLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    imageUpload: { height: 100, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', overflow: 'hidden' },
    uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    uploadText: { marginTop: 8, fontSize: 13 },
    imagePreviewContainer: { flex: 1, position: 'relative' },
    imagePreview: { flex: 1, width: '100%' },
    removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#ef4444', borderRadius: 12, padding: 4 },
    fieldLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    chipScroll: { marginBottom: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#334155' },
    chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    chipText: { color: '#94a3b8', fontWeight: '500' },
    chipTextActive: { color: '#fff' },
    saveButton: { marginTop: 16, marginBottom: 8 },
    dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
    dataLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dataIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    dataLabel: { fontSize: 16, fontWeight: '500' },
    dataHint: { fontSize: 12, marginTop: 2 },
    signOutContainer: { marginTop: 24 },
});
