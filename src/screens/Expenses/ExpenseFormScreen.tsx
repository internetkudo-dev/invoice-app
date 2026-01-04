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
import { ArrowLeft, Tag, DollarSign, Calendar, FileText, Camera, ArrowDown, ArrowUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button, Input } from '../../components/common';
import { ExpenseCategory } from '../../types';

export function ExpenseFormScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const expenseId = route.params?.expenseId;
    const isEditing = !!expenseId;

    const [formData, setFormData] = useState({
        amount: '',
        category: 'Other',
        description: '',
        date: new Date().toISOString().split('T')[0],
        receipt_url: '',
        type: 'expense' as 'expense' | 'income',
    });
    const [loading, setLoading] = useState(false);
    const [showCategories, setShowCategories] = useState(false);

    const defaultCategories = ['Travel', 'Supplies', 'Marketing', 'Software', 'Rent', 'Utilities', 'Other'];
    const incomeCategories = ['Sales', 'Refund', 'Grant', 'Investment', 'Other'];

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);

    useEffect(() => {
        if (isEditing) {
            fetchExpense();
        } else if (route.params?.scannedData) {
            const scan = route.params.scannedData;
            setFormData(prev => ({
                ...prev,
                amount: scan.total_amount ? String(scan.total_amount) : '',
                date: scan.date || new Date().toISOString().split('T')[0],
                // If the AI returns a vendor name, we can put it in description for now or match it if we had a vendor field
                description: scan.vendor_name ? `From ${scan.vendor_name}` : '',
                type: 'expense'
            }));
        }
        fetchCategories();
    }, [expenseId, route.params?.scannedData]);

    const fetchCategories = async () => {
        // Fetch distinct categories from database
        const { data } = await supabase.from('expenses').select('category');
        if (data) {
            const unique = Array.from(new Set(data.map((item: any) => item.category).filter(Boolean)));
            setDynamicCategories(unique as string[]);
        }
    };

    const fetchExpense = async () => {
        const { data } = await supabase.from('expenses').select('*').eq('id', expenseId).single();
        if (data) {
            setFormData({
                amount: String(data.amount),
                category: data.category,
                description: data.description || '',
                date: data.date,
                receipt_url: data.receipt_url || '',
                type: data.type || 'expense',
            });
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setFormData({ ...formData, receipt_url: `data:image/jpeg;base64,${result.assets[0].base64}` });
        }
    };

    const handleSave = async () => {
        if (!formData.amount || Number(formData.amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                amount: Number(formData.amount),
                user_id: user?.id,
            };

            if (isEditing) {
                await supabase.from('expenses').update(dataToSave).eq('id', expenseId);
            } else {
                await supabase.from('expenses').insert(dataToSave);
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save expense');
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
                <Text style={[styles.title, { color: textColor }]}>{isEditing ? 'Edit Expense' : 'New Expense'}</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <Card style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <DollarSign color="#ef4444" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Transaction Details</Text>
                    </View>

                    <View style={styles.typeToggle}>
                        <TouchableOpacity
                            style={[styles.typeOption, formData.type === 'expense' && { backgroundColor: '#ef4444' }]}
                            onPress={() => setFormData({ ...formData, type: 'expense' })}
                        >
                            <ArrowUp color={formData.type === 'expense' ? '#fff' : mutedColor} size={20} />
                            <Text style={[styles.typeText, { color: formData.type === 'expense' ? '#fff' : mutedColor }]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeOption, formData.type === 'income' && { backgroundColor: '#10b981' }]}
                            onPress={() => setFormData({ ...formData, type: 'income' })}
                        >
                            <ArrowDown color={formData.type === 'income' ? '#fff' : mutedColor} size={20} />
                            <Text style={[styles.typeText, { color: formData.type === 'income' ? '#fff' : mutedColor }]}>Income</Text>
                        </TouchableOpacity>
                    </View>

                    <Input
                        label="Amount *"
                        value={formData.amount}
                        onChangeText={(text) => setFormData({ ...formData, amount: text })}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                    />

                    <Text style={[styles.label, { color: textColor }]}>Category</Text>
                    <Input
                        value={formData.category}
                        onChangeText={(text) => setFormData({ ...formData, category: text })}
                        placeholder="Type category"
                    />

                    <View style={styles.categoryGrid}>
                        {Array.from(new Set([...(formData.type === 'expense' ? defaultCategories : incomeCategories), ...dynamicCategories]))
                            .slice(0, 12) // Limit to top 12 to avoid clutter
                            .map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryOption,
                                        { backgroundColor: isDark ? '#334155' : '#f1f5f9' },
                                        formData.category === cat && (formData.type === 'expense' ? styles.activeCategoryExpense : styles.activeCategoryIncome)
                                    ]}
                                    onPress={() => setFormData({ ...formData, category: cat })}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        { color: isDark ? '#94a3b8' : '#64748b' },
                                        formData.category === cat && styles.activeCategoryText
                                    ]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                    </View>

                    <Input
                        label="Date"
                        value={formData.date}
                        onChangeText={(text) => setFormData({ ...formData, date: text })}
                        placeholder="YYYY-MM-DD"
                    />

                    <Input
                        label="Description"
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        placeholder="What was this for?"
                        multiline
                    />
                </Card>

                <Card style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Camera color="#818cf8" size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Receipt / Proof</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.receiptUpload, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                        onPress={pickImage}
                    >
                        {formData.receipt_url ? (
                            <Text style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Receipt Uploaded</Text>
                        ) : (
                            <>
                                <Camera color={isDark ? '#94a3b8' : '#64748b'} size={32} />
                                <Text style={[styles.uploadText, { color: isDark ? '#94a3b8' : '#64748b' }]}>Capture or attach receipt</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Card>

                <Button
                    title={isEditing ? 'Update Expense' : 'Log Expense'}
                    onPress={handleSave}
                    loading={loading}
                    variant="primary"
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
    card: { padding: 16, marginBottom: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600' },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    categoryOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    activeCategoryExpense: { backgroundColor: '#ef4444' },
    activeCategoryIncome: { backgroundColor: '#10b981' },
    categoryText: { fontSize: 13, fontWeight: '500' },
    activeCategoryText: { color: '#fff' },
    receiptUpload: { height: 120, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#334155', alignItems: 'center', justifyContent: 'center', gap: 8 },
    uploadText: { fontSize: 13 },
    saveButton: { marginTop: 8 },
    typeToggle: { flexDirection: 'row', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 4 },
    typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
    typeText: { fontWeight: 'bold' },
});
