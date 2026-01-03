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
import { ArrowLeft, Package, DollarSign, Percent, Tag } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';

interface ProductFormScreenProps {
    navigation: any;
    route: any;
}

const units = ['pcs', 'hrs', 'kg', 'lbs', 'mt', 'ft', 'l', 'gal', 'unit'];
const categories = ['Service', 'Product', 'Subscription', 'Consulting', 'Other'];

export function ProductFormScreen({ navigation, route }: ProductFormScreenProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const productId = route.params?.productId;
    const isEditing = !!productId;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sku: '',
        unit_price: 0,
        tax_rate: 0,
        tax_included: false,
        unit: 'pcs',
        category: '',
    });
    const [loading, setLoading] = useState(false);
    const [showUnits, setShowUnits] = useState(false);
    const [showCategories, setShowCategories] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';

    useEffect(() => {
        if (isEditing) fetchProduct();
    }, [productId]);

    const fetchProduct = async () => {
        const { data } = await supabase.from('products').select('*').eq('id', productId).single();
        if (data) setFormData({
            name: data.name || '',
            description: data.description || '',
            sku: data.sku || '',
            unit_price: data.unit_price || 0,
            tax_rate: data.tax_rate || 0,
            tax_included: data.tax_included || false,
            unit: data.unit || 'pcs',
            category: data.category || '',
        });
    };

    const handleSave = async () => {
        if (!formData.name) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        if (formData.unit_price <= 0) {
            Alert.alert('Error', 'Price must be greater than 0');
            return;
        }

        setLoading(true);
        try {
            if (isEditing) {
                await supabase.from('products').update(formData).eq('id', productId);
            } else {
                await supabase.from('products').insert({ ...formData, user_id: user?.id });
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save product');
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
                <Text style={[styles.title, { color: textColor }]}>{isEditing ? 'Edit Product' : 'New Product'}</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Basic Info */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Package color="#818cf8" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Product Information</Text>
                    </View>
                    <Input label="Name *" value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Product or service name" />
                    <Input label="Description" value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Detailed description" multiline numberOfLines={3} />
                    <Input label="SKU / Code" value={formData.sku} onChangeText={(text) => setFormData({ ...formData, sku: text })} placeholder="Product code (optional)" />
                </View>

                {/* Category */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Tag color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Category</Text>
                    </View>
                    <TouchableOpacity style={[styles.picker, { backgroundColor: inputBg }]} onPress={() => setShowCategories(!showCategories)}>
                        <Text style={formData.category ? { color: textColor } : { color: mutedColor }}>
                            {formData.category || 'Select category'}
                        </Text>
                    </TouchableOpacity>
                    {showCategories && (
                        <View style={styles.optionGrid}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.option, { backgroundColor: inputBg }, formData.category === cat && styles.optionActive]}
                                    onPress={() => { setFormData({ ...formData, category: cat }); setShowCategories(false); }}
                                >
                                    <Text style={[styles.optionText, formData.category === cat && styles.optionTextActive]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Pricing */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <DollarSign color="#f59e0b" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Pricing</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.flex1}>
                            <Input label="Price *" value={String(formData.unit_price || '')} onChangeText={(text) => setFormData({ ...formData, unit_price: Number(text) || 0 })} placeholder="0.00" keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.flex1}>
                            <Text style={[styles.fieldLabel, { color: textColor }]}>Unit</Text>
                            <TouchableOpacity style={[styles.picker, { backgroundColor: inputBg }]} onPress={() => setShowUnits(!showUnits)}>
                                <Text style={{ color: textColor }}>{formData.unit}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showUnits && (
                        <View style={styles.optionGrid}>
                            {units.map((unit) => (
                                <TouchableOpacity
                                    key={unit}
                                    style={[styles.option, { backgroundColor: inputBg }, formData.unit === unit && styles.optionActive]}
                                    onPress={() => { setFormData({ ...formData, unit }); setShowUnits(false); }}
                                >
                                    <Text style={[styles.optionText, formData.unit === unit && styles.optionTextActive]}>{unit}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Tax */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Percent color="#ec4899" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Tax Settings</Text>
                    </View>
                    <Text style={[styles.hintText, { color: mutedColor }]}>
                        Set a specific tax rate for this product. Leave at 0 to use the default tax rate from settings.
                    </Text>
                    <Input label="Tax Rate (%)" value={String(formData.tax_rate || '')} onChangeText={(text) => setFormData({ ...formData, tax_rate: Number(text) || 0 })} placeholder="0" keyboardType="decimal-pad" />

                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setFormData({ ...formData, tax_included: !formData.tax_included })}
                    >
                        <View style={[styles.checkbox, formData.tax_included && styles.checkboxChecked]}>
                            {formData.tax_included && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.checkboxLabel, { color: textColor }]}>Price includes tax</Text>
                    </TouchableOpacity>
                </View>

                <Button
                    title={isEditing ? 'Update Product' : 'Create Product'}
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: { marginRight: 16, padding: 4 },
    title: { fontSize: 22, fontWeight: 'bold' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    section: { borderRadius: 16, padding: 16, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600' },
    hintText: { fontSize: 13, marginBottom: 12, lineHeight: 20 },
    row: { flexDirection: 'row', gap: 12 },
    flex1: { flex: 1 },
    fieldLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    picker: { padding: 16, borderRadius: 12 },
    optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    option: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
    optionActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    optionText: { color: '#94a3b8', fontWeight: '500' },
    optionTextActive: { color: '#fff' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    checkboxLabel: { fontSize: 15 },
    saveButton: { marginTop: 8 },
});
