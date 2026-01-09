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
import { ArrowLeft, User, Percent, FileText, MapPin, Globe } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';

interface ClientFormScreenProps {
    navigation: any;
    route: any;
}

export function ClientFormScreen({ navigation, route }: ClientFormScreenProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const clientId = route.params?.clientId;
    const isEditing = !!clientId;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zip_code: '',
        country: '',
        tax_id: '',
        nui: '',
        fiscal_number: '',
        vat_number: '',
        discount_percent: 0,
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        if (isEditing) fetchClient();
    }, [clientId]);

    const fetchClient = async () => {
        const { data } = await supabase.from('clients').select('*').eq('id', clientId).single();
        if (data) setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            zip_code: data.zip_code || '',
            country: data.country || '',
            tax_id: data.tax_id || '',
            nui: data.nui || '',
            fiscal_number: data.fiscal_number || '',
            vat_number: data.vat_number || '',
            discount_percent: data.discount_percent || 0,
            notes: data.notes || '',
        });
    };

    const handleSave = async () => {
        if (!formData.name) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        setLoading(true);
        try {
            const { data: profileData, error: profileError } = await supabase.from('profiles').select('company_id, active_company_id').eq('id', user?.id).single();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                Alert.alert('Error', 'Failed to load profile: ' + profileError.message);
                setLoading(false);
                return;
            }

            const companyId = profileData?.active_company_id || profileData?.company_id || user?.id;

            if (isEditing) {
                const { error } = await supabase.from('clients').update(formData).eq('id', clientId);
                if (error) {
                    console.error('Update error:', error);
                    Alert.alert('Error', 'Failed to update client: ' + error.message);
                    setLoading(false);
                    return;
                }
            } else {
                const { error } = await supabase.from('clients').insert({ ...formData, user_id: user?.id, company_id: companyId });
                if (error) {
                    console.error('Insert error:', error);
                    Alert.alert('Error', 'Failed to create client: ' + error.message);
                    setLoading(false);
                    return;
                }
            }
            navigation.goBack();
        } catch (error: any) {
            console.error('Exception:', error);
            Alert.alert('Error', 'Failed to save client: ' + (error.message || 'Unknown error'));
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
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{isEditing ? 'Update Client' : 'New Client'}</Text>
                    <Text style={[styles.title, { color: textColor }]}>Client Details</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Contact Info */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <User color="#818cf8" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Contact Information</Text>
                    </View>
                    <Input label="Name *" value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Client name" />
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
                    <Input label="Tax ID / NUI (Numri Unik Identifikues)" value={formData.nui || formData.tax_id} onChangeText={(text) => setFormData({ ...formData, nui: text, tax_id: text })} placeholder="NUI / Tax ID" />
                    <Input label="Numri Fiskal" value={formData.fiscal_number} onChangeText={(text) => setFormData({ ...formData, fiscal_number: text })} placeholder="Numri Fiskal" />
                    <Input label="Numri i TVSH (VAT Number)" value={formData.vat_number} onChangeText={(text) => setFormData({ ...formData, vat_number: text })} placeholder="VAT Number" />
                </View>

                {/* Discount */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Percent color="#f59e0b" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Client Discount</Text>
                    </View>
                    <Text style={[styles.hintText, { color: mutedColor }]}>
                        Set a default discount percentage that will be automatically applied to invoices for this client.
                    </Text>
                    <Input
                        label="Discount (%)"
                        value={String(formData.discount_percent || 0)}
                        onChangeText={(text) => setFormData({ ...formData, discount_percent: Number(text) || 0 })}
                        placeholder="0"
                        keyboardType="decimal-pad"
                    />
                </View>

                {/* Notes */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <Input
                        label="Notes"
                        value={formData.notes}
                        onChangeText={(text) => setFormData({ ...formData, notes: text })}
                        placeholder="Additional notes about this client..."
                        multiline
                        numberOfLines={3}
                    />
                </View>

                <Button
                    title={isEditing ? 'Update Client' : 'Create Client'}
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
    hintText: { fontSize: 13, marginBottom: 12, lineHeight: 20 },
    row: { flexDirection: 'row', gap: 12 },
    halfField: { flex: 1 },
    saveButton: { marginTop: 8 },
});
