import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Image, Switch, Platform } from 'react-native';
import {
    ChevronRight, Moon, Sun, Smartphone, Camera, Upload, Download, X,
    Image as ImageIcon, PenTool, Stamp, Palette, CreditCard, Languages,
    ShieldCheck, FileText, Briefcase, Users, Mail, Building, ArrowLeft,
    User, Zap, Settings, LogOut
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Clipboard from 'expo-clipboard';
import { SvgXml } from 'react-native-svg';

import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input, SignaturePadModal } from '../../components/common';
import { Profile } from '../../types';
import { t } from '../../i18n';

const languages = [
    { code: 'en', label: 'English' },
    { code: 'sq', label: 'Albanian' },
];

const appColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4', '#1e293b'
];

export function SettingsScreen({ navigation }: any) {
    const { user, signOut } = useAuth();
    const { themeMode, setThemeMode, isDark, primaryColor, setPrimaryColor, language, setLanguage } = useTheme();
    const [profile, setProfile] = useState<Profile>({
        id: user?.id || '',
        company_name: '',
        email: user?.email || '',
        phone: '',
        address: '',
        city: '',
        country: '',
        website: '',
        currency: 'USD',
        tax_rate: 0,
        tax_name: 'VAT',
        primary_color: '#6366f1',
        is_grayscale: false,
        updated_at: new Date().toISOString(),
    });
    const [activeSection, setActiveSection] = useState<string | null>('personal');
    const [showSignaturePad, setShowSignaturePad] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const accentBg = isDark ? '#334155' : '#f1f5f9';

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        if (!user) return;
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
            let combined = { ...profileData };
            if (profileData.active_company_id) {
                const { data: companyData } = await supabase.from('companies').select('*').eq('id', profileData.active_company_id).single();
                if (companyData) {
                    combined = { ...combined, ...companyData };
                }
            }
            setProfile(combined);
        }
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        // Optimistic update
        setProfile(prev => ({ ...prev, ...updates }));

        // Global state updates
        if (updates.primary_color) setPrimaryColor(updates.primary_color);
        if (updates.invoice_language) setLanguage(updates.invoice_language);

        try {
            // Determine if we are updating profile or company fields
            let profileUpdates: any = {};
            let companyUpdates: any = {};
            const profileKeys = ['biometric_enabled', 'invoice_language', 'primary_color', 'default_client_discount'];

            Object.keys(updates).forEach(key => {
                if (profileKeys.includes(key)) {
                    profileUpdates[key] = (updates as any)[key];
                } else if (profile.active_company_id) {
                    companyUpdates[key] = (updates as any)[key];
                } else {
                    // If no company, everything goes to profile (fallback)
                    profileUpdates[key] = (updates as any)[key];
                }
            });

            // Update Profile Table
            if (Object.keys(profileUpdates).length > 0) {
                const { error: pErr } = await supabase.from('profiles').update({
                    ...profileUpdates,
                    updated_at: new Date().toISOString()
                }).eq('id', user?.id);
                if (pErr) throw pErr;
            }

            // Update Company Table if applicable
            if (profile.active_company_id && Object.keys(companyUpdates).length > 0) {
                const { error: cErr } = await supabase.from('companies').update({
                    ...companyUpdates
                }).eq('id', profile.active_company_id);
                if (cErr) throw cErr;
            }

        } catch (error: any) {
            console.error('Error auto-saving:', error);
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
            const field = `${type}_url` as keyof Profile;
            updateProfile({ [field]: base64 });
        }
    };

    const copyCompanyId = async () => {
        const id = profile.active_company_id || profile.company_id || user?.id;
        if (id) {
            await Clipboard.setStringAsync(id);
            Alert.alert('Copied', 'Company ID copied to clipboard.');
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

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{t('settings', language) || 'Configuration'}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('businessSettings', language) || 'Settings'}</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* User Info Overview (Merged from Profile) */}
                <Card style={[styles.userCard, { backgroundColor: cardBg }]}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: textColor }]}>{user?.email?.split('@')[0]}</Text>
                        <Text style={[styles.userEmail, { color: mutedColor }]}>{user?.email}</Text>
                    </View>
                </Card>

                {/* Personal Settings (Merged from Profile) */}
                {renderHeader(t('language', language), Languages, 'personal', primaryColor)}
                {activeSection === 'personal' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.label, { color: textColor }]}>{t('appLanguage', language) || 'App Language'}</Text>
                        <View style={styles.grid}>
                            {languages.map(lang => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[
                                        styles.optionChip,
                                        { backgroundColor: accentBg, flex: 1 },
                                        profile.invoice_language === lang.code && { backgroundColor: primaryColor }
                                    ]}
                                    onPress={() => updateProfile({ invoice_language: lang.code })}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        { color: textColor },
                                        profile.invoice_language === lang.code && { color: '#fff' }
                                    ]}>{lang.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>
                )}

                {/* Appearance (Merged from Profile) */}
                {renderHeader(t('appTheme', language), Palette, 'appearance', primaryColor)}
                {activeSection === 'appearance' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.label, { color: textColor }]}>{t('appTheme', language)}</Text>
                        <View style={styles.grid}>
                            {[
                                { label: t('systemTheme', language), value: 'system', icon: Smartphone },
                                { label: t('lightMode', language), value: 'light', icon: Sun },
                                { label: t('darkMode', language), value: 'dark', icon: Moon },
                            ].map(mode => (
                                <TouchableOpacity
                                    key={mode.value}
                                    style={[
                                        styles.optionChip,
                                        { backgroundColor: accentBg, flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center' },
                                        themeMode === mode.value && { backgroundColor: primaryColor }
                                    ]}
                                    onPress={() => setThemeMode(mode.value as any)}
                                >
                                    {React.createElement(mode.icon, { size: 16, color: themeMode === mode.value ? '#fff' : textColor })}
                                    <Text style={[
                                        styles.optionText,
                                        { color: textColor },
                                        themeMode === mode.value && { color: '#fff' }
                                    ]}>{mode.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.divider} />
                        <Text style={[styles.label, { color: textColor }]}>Brand / Accent Color</Text>
                        <View style={styles.colorGrid}>
                            {appColors.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color },
                                        profile.primary_color === color && { borderColor: textColor, borderWidth: 3 }
                                    ]}
                                    onPress={() => updateProfile({ primary_color: color })}
                                />
                            ))}
                        </View>
                    </Card>
                )}

                {/* Advanced Settings Link */}
                <TouchableOpacity
                    style={[styles.sectionHeader, { backgroundColor: cardBg }]}
                    onPress={() => navigation.navigate('AdvancedSettings')}
                >
                    <View style={styles.sectionHeaderLeft}>
                        <View style={[styles.sectionIcon, { backgroundColor: primaryColor + '15' }]}>
                            <Zap color={primaryColor} size={20} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Advanced Settings</Text>
                    </View>
                    <ChevronRight color={mutedColor} size={20} />
                </TouchableOpacity>

                {/* Company Info */}
                {renderHeader(t('companyProfile', language), Briefcase, 'company', primaryColor)}
                {activeSection === 'company' && (
                    <Card style={styles.sectionContent}>
                        <Input label="Company Name" value={profile.company_name} onChangeText={(t) => setProfile({ ...profile, company_name: t })} onEndEditing={() => updateProfile({ company_name: profile.company_name })} />
                        <Input label="Tax ID / Registration" value={profile.tax_id} onChangeText={(t) => setProfile({ ...profile, tax_id: t })} onEndEditing={() => updateProfile({ tax_id: profile.tax_id })} />
                        <Input label="Email" value={profile.email} onChangeText={(t) => setProfile({ ...profile, email: t })} onEndEditing={() => updateProfile({ email: profile.email })} keyboardType="email-address" />
                        <Input label="Phone" value={profile.phone} onChangeText={(t) => setProfile({ ...profile, phone: t })} onEndEditing={() => updateProfile({ phone: profile.phone })} keyboardType="phone-pad" />
                        <Input label="Address" value={profile.address} onChangeText={(t) => setProfile({ ...profile, address: t })} onEndEditing={() => updateProfile({ address: profile.address })} multiline />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Input label="City" value={profile.city} onChangeText={(t) => setProfile({ ...profile, city: t })} onEndEditing={() => updateProfile({ city: profile.city })} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Input label="Country" value={profile.country} onChangeText={(t) => setProfile({ ...profile, country: t })} onEndEditing={() => updateProfile({ country: profile.country })} />
                            </View>
                        </View>
                        <Input label="Website" value={profile.website} onChangeText={(t) => setProfile({ ...profile, website: t })} onEndEditing={() => updateProfile({ website: profile.website })} placeholder="www.example.com" />
                    </Card>
                )}

                {/* Identity & Visuals */}
                {renderHeader('Logos & Signatures', Camera, 'visuals', primaryColor)}
                {activeSection === 'visuals' && (
                    <Card style={styles.sectionContent}>
                        <AssetPicker label="Company Logo" value={profile.logo_url} onPick={() => pickImage('logo')} onClear={() => updateProfile({ logo_url: '' })} icon={ImageIcon} isDark={isDark} />
                        <AssetPicker
                            label="Signature"
                            value={profile.signature_url}
                            onPick={() => pickImage('signature')}
                            onClear={() => updateProfile({ signature_url: '' })}
                            onDraw={() => setShowSignaturePad(true)}
                            icon={PenTool}
                            isDark={isDark}
                        />
                        <AssetPicker label="Official Stamp" value={profile.stamp_url} onPick={() => pickImage('stamp')} onClear={() => updateProfile({ stamp_url: '' })} icon={Stamp} isDark={isDark} />
                    </Card>
                )}

                {/* Bank Details */}
                {renderHeader(t('bankDetails', language), CreditCard, 'payments', primaryColor)}
                {activeSection === 'payments' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.subLabel, { color: mutedColor }]}>Bank Details (Apps on PDF)</Text>
                        <Input label="Bank Name" value={profile.bank_name} onChangeText={(t) => setProfile({ ...profile, bank_name: t })} onEndEditing={() => updateProfile({ bank_name: profile.bank_name })} />
                        <Input label="IBAN" value={profile.bank_iban} onChangeText={(t) => setProfile({ ...profile, bank_iban: t })} onEndEditing={() => updateProfile({ bank_iban: profile.bank_iban })} />
                        <Input label="SWIFT/BIC" value={profile.bank_swift} onChangeText={(t) => setProfile({ ...profile, bank_swift: t })} onEndEditing={() => updateProfile({ bank_swift: profile.bank_swift })} />
                    </Card>
                )}

                {/* Team & Collaboration */}
                {renderHeader('Team & Collaboration', Users, 'team', primaryColor)}
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

                        <Input
                            label="Your Company ID"
                            value={profile.company_id || user?.id}
                            editable={false}
                        />
                        <Button
                            title="Manage Companies"
                            variant="shortcut"
                            icon={Building}
                            onPress={() => navigation.navigate('ManageCompanies')}
                            style={{ marginTop: 8 }}
                        />
                    </Card>
                )}

                {/* Security (Merged from Profile) */}
                {renderHeader(t('security', language) || 'Security', ShieldCheck, 'security', primaryColor)}
                {activeSection === 'security' && (
                    <Card style={styles.sectionContent}>
                        <View style={styles.rowBetween}>
                            <View style={{ flex: 1, marginRight: 16 }}>
                                <Text style={[styles.label, { color: textColor }]}>Biometric Lock</Text>
                                <Text style={[styles.hint, { color: mutedColor }]}>Requires FaceID/Fingerprint to open.</Text>
                            </View>
                            <Switch
                                value={profile.biometric_enabled}
                                onValueChange={(val) => updateProfile({ biometric_enabled: val })}
                                trackColor={{ false: '#767577', true: primaryColor }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                    </Card>
                )}




                <View style={styles.footer}>
                    <Button
                        title={t('signOut', language)}
                        variant="danger"
                        onPress={signOut}
                        icon={LogOut}
                        style={{ width: '100%' }}
                    />
                    <Text style={[styles.version, { color: mutedColor }]}>Invoice App v2.0.0</Text>
                </View>
            </ScrollView>
            <SignaturePadModal
                visible={showSignaturePad}
                onClose={() => setShowSignaturePad(false)}
                onSave={(sig) => updateProfile({ signature_url: sig })}
                primaryColor={primaryColor}
            />
        </View >
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, gap: 16 },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },

    userCard: { flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 24, borderRadius: 16 },
    userAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#818cf8', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    userDetails: { marginLeft: 16 },
    userName: { fontSize: 18, fontWeight: 'bold' },
    userEmail: { fontSize: 14, marginTop: 2 },

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
    sectionTitle: { fontSize: 16, fontWeight: '600' },

    sectionContent: { padding: 20, borderRadius: 20, marginTop: -6, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },

    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
    subLabel: { fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    hint: { fontSize: 12, marginTop: 4 },
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
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionChip: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    optionText: { fontSize: 13, fontWeight: '600' },
});
