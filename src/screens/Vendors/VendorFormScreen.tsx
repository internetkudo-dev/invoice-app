import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, Building2, MapPin, Globe, FileText } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';
import { t } from '../../i18n';

interface VendorFormScreenProps {
    navigation: any;
    route: any;
}

export function VendorFormScreen({ navigation, route }: VendorFormScreenProps) {
    const { user } = useAuth();
    const { isDark, language } = useTheme();
    const vendorId = route.params?.vendorId;
    const isEditing = !!vendorId;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zip_code: '',
        country: '',
        tax_id: '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        if (isEditing) fetchVendor();
    }, [vendorId]);

    const fetchVendor = async () => {
        const { data } = await supabase.from('vendors').select('*').eq('id', vendorId).single();
        if (data) setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            zip_code: data.zip_code || '',
            country: data.country || '',
            tax_id: data.tax_id || '',
            notes: data.notes || '',
        });
    };

    const handleSave = async () => {
        if (!formData.name) {
            Alert.alert(t('error', language), 'Name is required');
            return;
        }

        if (!user) {
            Alert.alert(t('error', language), 'You must be logged in');
            return;
        }

        setLoading(true);
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('company_id, active_company_id')
                .eq('id', user.id)
                .single();

            // If profile fetch fails, we default companyId to user.id
            const companyId = profileData?.active_company_id || profileData?.company_id || user.id;

            const payload = {
                ...formData,
                email: formData.email || null,
                phone: formData.phone || null,
                address: formData.address || null,
                city: formData.city || null,
                zip_code: formData.zip_code || null,
                country: formData.country || null,
                tax_id: formData.tax_id || null,
                notes: formData.notes || null,
                user_id: user.id,
                company_id: companyId
            };

            if (isEditing) {
                const { error } = await supabase.from('vendors').update(payload).eq('id', vendorId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('vendors').insert(payload);
                if (error) throw error;
            }
            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving vendor:', error);
            Alert.alert(t('error', language), error.message || 'Failed to save vendor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bgColor }]}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{isEditing ? t('edit', language) : t('createNew', language)}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('vendor', language)}</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Contact Info */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Building2 color="#0891b2" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Contact Information</Text>
                    </View>
                    <Input label="Name *" value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Vendor/Supplier name" />
                    <Input label="Email" value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} placeholder="Email address" keyboardType="email-address" />
                    <Input label="Phone" value={formData.phone} onChangeText={(text) => setFormData({ ...formData, phone: text })} placeholder="Phone number" keyboardType="phone-pad" />
                </View>

                {/* Address Details */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <MapPin color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Address Details</Text>
                    </View>
                    <Input label="Street Address" value={formData.address} onChangeText={(text) => setFormData({ ...formData, address: text })} placeholder="Full address" multiline />
                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            <Input label="City" value={formData.city} onChangeText={(text) => setFormData({ ...formData, city: text })} placeholder="City" />
                        </View>
                        <View style={styles.halfField}>
                            <Input label="Zip Code" value={formData.zip_code} onChangeText={(text) => setFormData({ ...formData, zip_code: text })} placeholder="Zip" keyboardType="number-pad" />
                        </View>
                    </View>
                    <Input label="Country" value={formData.country} onChangeText={(text) => setFormData({ ...formData, country: text })} placeholder="Country" />
                </View>

                {/* Business Info */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Globe color="#10b981" size={20} />
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Business Details</Text>
                            <TouchableOpacity
                                style={{ backgroundColor: '#10b98120', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                                onPress={() => WebBrowser.openBrowserAsync('https://apps.atk-ks.org/BizPasiveApp/VatRegist/Index')}
                            >
                                <Text style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>Check Registry ↗</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Input label="Tax ID / VAT Number" value={formData.tax_id} onChangeText={(text) => setFormData({ ...formData, tax_id: text })} placeholder="Tax identification number" />
                </View>

                {/* Notes */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <FileText color="#f59e0b" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Notes</Text>
                    </View>
                    <Input
                        label="Notes"
                        value={formData.notes}
                        onChangeText={(text) => setFormData({ ...formData, notes: text })}
                        placeholder="Additional notes about this vendor..."
                        multiline
                        numberOfLines={3}
                    />
                </View>

                <Button
                    title={isEditing ? t('saveChanges', language) : t('createNew', language)}
                    onPress={handleSave}
                    loading={loading}
                    style={styles.saveButton}
                />
            </ScrollView>
        </KeyboardAvoidingView>
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
    section: { borderRadius: 16, padding: 16, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 12 },
    halfField: { flex: 1 },
    saveButton: { marginTop: 8 },
});
