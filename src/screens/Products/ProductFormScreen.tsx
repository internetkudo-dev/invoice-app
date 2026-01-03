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
    Switch,
} from 'react-native';
import { ArrowLeft, Package, DollarSign, Percent, Tag, Box, Scan } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';

interface ProductFormScreenProps {
    navigation: any;
    route: any;
}

const units = ['pcs', 'hrs', 'kg', 'lbs', 'mt', 'ft', 'l', 'gal', 'unit'];
const defaultCategories = ['Service', 'Product', 'Subscription', 'Consulting'];

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
        stock_quantity: 0,
        track_stock: false,
        low_stock_threshold: 5,
    });
    const [loading, setLoading] = useState(false);
    const [showUnits, setShowUnits] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [majorPrice, setMajorPrice] = useState('0');
    const [minorPrice, setMinorPrice] = useState('00');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';

    useEffect(() => {
        if (isEditing) fetchProduct();
    }, [productId]);

    useEffect(() => {
        if (route.params?.scannedSKU) {
            setFormData(prev => ({
                ...(route.params?.restoredData || prev), // Restore if passed, else keep prev
                sku: route.params.scannedSKU
            }));

            // Clear params
            navigation.setParams({ scannedSKU: undefined, restoredData: undefined });
        }
    }, [route.params?.scannedSKU]);

    const fetchProduct = async () => {
        const { data } = await supabase.from('products').select('*').eq('id', productId).single();
        if (data) {
            const price = Number(data.unit_price) || 0;
            const parts = price.toFixed(2).split('.');

            setMajorPrice(parts[0]);
            setMinorPrice(parts[1] === '00' ? '' : parts[1]);

            setFormData({
                name: data.name || '',
                description: data.description || '',
                sku: data.sku || '',
                unit_price: price,
                tax_rate: Number(data.tax_rate) || 0,
                tax_included: data.tax_included || false,
                unit: data.unit || 'pcs',
                category: data.category || '',
                stock_quantity: Number(data.stock_quantity) || 0,
                track_stock: data.track_stock || false,
                low_stock_threshold: Number(data.low_stock_threshold) || 5,
            });
        }
    };

    const updateUnitPrice = (major: string, minor: string) => {
        const majorVal = parseInt(major.replace(/\D/g, '')) || 0;
        const minorVal = parseInt(minor.replace(/\D/g, '')) || 0;

        let total = majorVal;
        if (minor.length > 0) {
            // Treat minor as decimal part: "5" -> 0.5, "05" -> 0.05
            total += minorVal / Math.pow(10, minor.length);
        }

        setFormData(prev => ({ ...prev, unit_price: total }));
    };

    const handleScan = () => {
        navigation.navigate('QRScanner', {
            mode: 'generic',
            returnTo: 'ProductForm',
            currentData: formData // Pass current state to preserve it
        });
    };

    const handleSave = async () => {
        if (!formData.name) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        setLoading(true);
        console.log('Saving product...', { isEditing, user_id: user?.id, ...formData });

        try {
            if (isEditing) {
                const { error } = await supabase.from('products').update(formData).eq('id', productId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('products').insert({ ...formData, user_id: user?.id }).select();
                console.log('Insert result:', { data, error });
                if (error) throw error;
            }
            setLoading(false);
            navigation.goBack();
        } catch (error) {
            console.error('Error saving product:', error);
            setLoading(false);
            Alert.alert('Error', 'Failed to save product: ' + (error as any).message);
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

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="SKU / Code"
                                value={formData.sku}
                                onChangeText={(text) => setFormData({ ...formData, sku: text })}
                                placeholder="Product code (optional)"
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.scanIconBtn, { backgroundColor: inputBg }]}
                            onPress={handleScan}
                        >
                            <Scan color={textColor} size={24} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Pricing & Units */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <DollarSign color="#f59e0b" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Pricing & Quantity</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 2 }}>
                            <Text style={[styles.fieldLabel, { color: textColor }]}>Price</Text>
                            <View style={styles.priceGrid}>
                                <Input
                                    value={majorPrice}
                                    onChangeText={(text) => {
                                        const clean = text.replace(/\D/g, '');
                                        setMajorPrice(clean);
                                        updateUnitPrice(clean, minorPrice);
                                    }}
                                    placeholder="0"
                                    keyboardType="number-pad"
                                    containerStyle={{ flex: 2, marginBottom: 0 }}
                                />
                                <View style={styles.decimalSeparator}>
                                    <Text style={{ color: textColor, fontWeight: 'bold', fontSize: 20 }}>.</Text>
                                </View>
                                <Input
                                    value={minorPrice}
                                    onChangeText={(text) => {
                                        const clean = text.replace(/\D/g, '').slice(0, 2);
                                        setMinorPrice(clean);
                                        updateUnitPrice(majorPrice, clean);
                                    }}
                                    placeholder="00"
                                    keyboardType="number-pad"
                                    containerStyle={{ flex: 1, marginBottom: 0 }}
                                    maxLength={2}
                                />
                            </View>
                        </View>
                    </View>
                    <View style={{ marginTop: 16 }}>
                        <Text style={[styles.fieldLabel, { color: textColor }]}>Unit</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {units.map((unit) => (
                                <TouchableOpacity
                                    key={unit}
                                    style={[
                                        styles.option,
                                        { backgroundColor: inputBg, paddingVertical: 8, paddingHorizontal: 16 },
                                        formData.unit === unit && styles.optionActive
                                    ]}
                                    onPress={() => setFormData({ ...formData, unit })}
                                >
                                    <Text style={[styles.optionText, formData.unit === unit && styles.optionTextActive, { fontSize: 13 }]}>
                                        {unit}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* Stock Management */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Box color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Inventory Control</Text>
                        <Switch
                            value={formData.track_stock}
                            onValueChange={(val) => setFormData({ ...formData, track_stock: val })}
                            trackColor={{ false: '#334155', true: '#818cf8' }}
                        />
                    </View>

                    {formData.track_stock && (
                        <>
                            <View style={styles.row}>
                                <View style={styles.flex1}>
                                    <Input label="Current Stock" value={String(formData.stock_quantity)} onChangeText={(text) => setFormData({ ...formData, stock_quantity: Number(text) || 0 })} placeholder="0" keyboardType="number-pad" />
                                </View>
                                <View style={styles.flex1}>
                                    <Input label="Low Stock Alert" value={String(formData.low_stock_threshold)} onChangeText={(text) => setFormData({ ...formData, low_stock_threshold: Number(text) || 0 })} placeholder="5" keyboardType="number-pad" />
                                </View>
                            </View>
                            <Text style={[styles.hintText, { color: mutedColor }]}>
                                The app will notify you when stock falls below this threshold.
                            </Text>
                        </>
                    )}
                </View>

                {/* Category */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Tag color="#10b981" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Classification</Text>
                    </View>

                    {!showCategories && (
                        <View style={{ marginBottom: 16 }}>
                            <Input
                                label="Custom Category"
                                value={formData.category}
                                onChangeText={(text) => setFormData({ ...formData, category: text })}
                                placeholder="Type or select below"
                            />
                        </View>
                    )}

                    <TouchableOpacity style={[styles.picker, { backgroundColor: inputBg }]} onPress={() => setShowCategories(!showCategories)}>
                        <Text style={formData.category ? { color: textColor } : { color: mutedColor }}>
                            {formData.category || 'Select from list'}
                        </Text>
                    </TouchableOpacity>
                    {showCategories && (
                        <View style={styles.optionGrid}>
                            {defaultCategories.map((cat) => (
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

                {/* Tax */}
                <View style={[styles.section, { backgroundColor: cardBg }]}>
                    <View style={styles.sectionHeader}>
                        <Percent color="#ec4899" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Tax Rules</Text>
                    </View>
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
    sectionTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
    hintText: { fontSize: 12, marginTop: 4, lineHeight: 18 },
    row: { flexDirection: 'row', gap: 12 },
    flex1: { flex: 1 },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, opacity: 0.8 },
    priceGrid: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    decimalSeparator: { paddingBottom: 8 },
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
    scanIconBtn: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
});
