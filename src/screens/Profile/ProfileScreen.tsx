import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Switch, Platform, Image } from 'react-native';
import { User, ShieldCheck, Languages, Palette, Moon, Sun, Smartphone, LogOut, ChevronRight, Mail, Phone, MapPin, Building, FileText } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';
import { Profile } from '../../types';
import { t } from '../../i18n';

const languages = [
    { code: 'en', label: 'English' },
    { code: 'sq', label: 'Albanian' },
];

const appColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4', '#1e293b'
];

export function ProfileScreen({ navigation }: any) {
    const { user, signOut } = useAuth();
    const { isDark, themeMode, setThemeMode, primaryColor, setPrimaryColor, language, setLanguage } = useTheme();
    const [profile, setProfile] = useState<Partial<Profile>>({});
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>('personal');

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
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('profiles').update({
                biometric_enabled: profile.biometric_enabled,
                invoice_language: profile.invoice_language,
                primary_color: profile.primary_color,
                default_client_discount: profile.default_client_discount,
                updated_at: new Date().toISOString()
            }).eq('id', user?.id);

            if (error) throw error;

            if (profile.primary_color) setPrimaryColor(profile.primary_color);
            if (profile.invoice_language) setLanguage(profile.invoice_language);

            Alert.alert(t('success', language), t('profileUpdated', language) || 'Profile updated successfully');
        } catch (error: any) {
            Alert.alert(t('error', language), error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricToggle = async (value: boolean) => {
        setProfile({ ...profile, biometric_enabled: value });
    };

    const renderHeader = (title: string, Icon: any, section: string, color: string) => (
        <TouchableOpacity
            style={[styles.sectionHeader, { borderLeftColor: color }]}
            onPress={() => setActiveSection(activeSection === section ? null : section)}
        >
            <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: color + '15' }]}>
                    <Icon color={color} size={20} />
                </View>
                <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
            </View>
            <ChevronRight color={mutedColor} size={20} style={{ transform: [{ rotate: activeSection === section ? '90deg' : '0deg' }] }} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>{t('profile', language)}</Text>
                <Button title={t('save', language)} onPress={handleSave} loading={loading} size="small" />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* User Info Overview */}
                <Card style={styles.userCard}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: textColor }]}>{user?.email?.split('@')[0]}</Text>
                        <Text style={[styles.userEmail, { color: mutedColor }]}>{user?.email}</Text>
                    </View>
                </Card>

                {/* Personal Settings */}
                {renderHeader(t('language', language), Languages, 'personal', '#f59e0b')}
                {activeSection === 'personal' && (
                    <Card style={styles.sectionContent}>
                        <Text style={[styles.label, { color: textColor }]}>{t('appLanguage', language) || 'App Language'}</Text>
                        <View style={styles.grid}>
                            {languages.map(lang => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[styles.optionChip, { backgroundColor: accentBg }, profile.invoice_language === lang.code && { backgroundColor: primaryColor }]}
                                    onPress={() => setProfile({ ...profile, invoice_language: lang.code })}
                                >
                                    <Text style={[styles.optionText, { color: textColor }, profile.invoice_language === lang.code && { color: '#fff' }]}>{lang.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>
                )}

                {/* Appearance */}
                {renderHeader(t('appTheme', language), Palette, 'appearance', '#818cf8')}
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
                                    style={[styles.optionChip, { backgroundColor: accentBg, flex: 1, alignItems: 'center', gap: 6 }, themeMode === mode.value && { backgroundColor: primaryColor }]}
                                    onPress={() => setThemeMode(mode.value as any)}
                                >
                                    {React.createElement(mode.icon, { size: 16, color: themeMode === mode.value ? '#fff' : textColor })}
                                    <Text style={[styles.optionText, { color: textColor }, themeMode === mode.value && { color: '#fff' }]}>{mode.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.divider} />
                        <Text style={[styles.label, { color: textColor }]}>Brand / Accent Color</Text>
                        <View style={styles.colorGrid}>
                            {appColors.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[styles.colorOption, { backgroundColor: color }, profile.primary_color === color && { borderColor: textColor, borderWidth: 3 }]}
                                    onPress={() => setProfile({ ...profile, primary_color: color })}
                                />
                            ))}
                        </View>
                    </Card>
                )}

                {/* Security */}
                {renderHeader(t('security', language) || 'Security', ShieldCheck, 'security', '#10b981')}
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

                {/* Invoice Defaults */}
                {renderHeader(t('invoiceDefaults', language) || 'Invoice Defaults', FileText, 'invoiceDefaults', '#3b82f6')}
                {activeSection === 'invoiceDefaults' && (
                    <Card style={styles.sectionContent}>
                        <View style={styles.rowBetween}>
                            <View style={{ flex: 1, marginRight: 16 }}>
                                <Text style={[styles.label, { color: textColor }]}>Default Client Discount (%)</Text>
                                <Text style={[styles.hint, { color: mutedColor }]}>Auto-applied to new invoices.</Text>
                            </View>
                            <View style={{ width: 80 }}>
                                <Input
                                    value={String(profile.default_client_discount || 0)}
                                    onChangeText={(t) => {
                                        const val = t ? parseFloat(t) : 0;
                                        setProfile(prev => ({ ...prev, default_client_discount: val }));
                                    }}
                                    keyboardType="numeric"
                                    placeholder="0"
                                />
                            </View>
                        </View>
                    </Card>
                )}

                {/* Switch to Business */}
                <TouchableOpacity
                    style={[styles.businessLink, { backgroundColor: `${primaryColor}10` }]}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <Building color={primaryColor} size={20} />
                    <Text style={[styles.businessLinkText, { color: primaryColor }]}>Manage Business Settings</Text>
                    <ChevronRight color={primaryColor} size={20} />
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Button
                        title={t('signOut', language)}
                        variant="danger"
                        onPress={signOut}
                        icon={LogOut}
                        style={{ width: '100%' }}
                    />
                    <Text style={[styles.version, { color: mutedColor, marginTop: 24 }]}>Invoice App v2.0.0</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    userCard: { flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 24 },
    userAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#818cf8', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    userDetails: { marginLeft: 16 },
    userName: { fontSize: 18, fontWeight: 'bold' },
    userEmail: { fontSize: 14, marginTop: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'transparent', borderLeftWidth: 4, marginBottom: 8 },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '600' },
    sectionContent: { padding: 16, marginBottom: 16 },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, minWidth: '30%', alignItems: 'center' },
    optionText: { fontSize: 13, fontWeight: '600' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorOption: { width: 36, height: 36, borderRadius: 18 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    hint: { fontSize: 12, marginTop: 4 },
    businessLink: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 8, marginBottom: 24 },
    businessLinkText: { flex: 1, marginLeft: 12, fontWeight: 'bold' },
    footer: { marginTop: 24, alignItems: 'center' },
    version: { fontSize: 12 },
});
