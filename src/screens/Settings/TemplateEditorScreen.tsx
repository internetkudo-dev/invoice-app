import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { ArrowLeft, Layout, Columns, Type, Eye, Save, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Input } from '../../components/common';
import { supabase } from '../../api/supabase';
import { TemplateConfig, Profile } from '../../types';

const defaultLabels = {
    invoice: 'INVOICE',
    billTo: 'Bill To',
    date: 'Date',
    due: 'Due Date',
    item: 'Description',
    quantity: 'Qty',
    price: 'Unit Price',
    total: 'Amount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    totalDue: 'Total Due',
    notes: 'Notes',
    terms: 'Terms'
};

const defaultConfig: TemplateConfig = {
    showLogo: true,
    showSignature: true,
    showStamp: true,
    visibleColumns: {
        sku: false,
        unit: true,
        tax: false,
        quantity: true,
        price: true,
    },
    labels: defaultLabels,
    pageSize: 'A4'
};

export function TemplateEditorScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [config, setConfig] = useState<TemplateConfig>(defaultConfig);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'layout' | 'columns' | 'labels'>('layout');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const accentBg = isDark ? '#1e293b' : '#f1f5f9';

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('template_config').eq('id', user.id).single();
        if (data?.template_config) {
            setConfig(data.template_config as TemplateConfig);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await supabase.from('profiles').update({ template_config: config }).eq('id', user?.id);
            Alert.alert('Success', 'Settings saved successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const resetToDefault = () => {
        Alert.alert(
            'Reset Settings',
            'Are you sure you want to reset all template customizations to default?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => setConfig(defaultConfig) }
            ]
        );
    };

    const updateLabel = (key: string, value: string) => {
        setConfig({
            ...config,
            labels: { ...config.labels, [key]: value }
        });
    };

    const toggleColumn = (key: keyof TemplateConfig['visibleColumns']) => {
        setConfig({
            ...config,
            visibleColumns: { ...config.visibleColumns, [key]: !config.visibleColumns[key] }
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>PDF Editor</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    <Save color={loading ? mutedColor : '#6366f1'} size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
                {[
                    { id: 'layout', label: 'Layout', icon: Layout },
                    { id: 'columns', label: 'Columns', icon: Columns },
                    { id: 'labels', label: 'Labels', icon: Type },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                        onPress={() => setActiveTab(tab.id as any)}
                    >
                        <tab.icon size={18} color={activeTab === tab.id ? '#6366f1' : mutedColor} />
                        <Text style={[styles.tabLabel, { color: activeTab === tab.id ? '#6366f1' : mutedColor }]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {activeTab === 'layout' && (
                    <Card style={styles.card}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Visibility Toggle</Text>
                        <View style={styles.row}>
                            <Text style={[styles.itemLabel, { color: textColor }]}>Show Logo</Text>
                            <Switch value={config.showLogo} onValueChange={(v) => setConfig({ ...config, showLogo: v })} />
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.itemLabel, { color: textColor }]}>Show Signature</Text>
                            <Switch value={config.showSignature} onValueChange={(v) => setConfig({ ...config, showSignature: v })} />
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.itemLabel, { color: textColor }]}>Show Official Stamp</Text>
                            <Switch value={config.showStamp} onValueChange={(v) => setConfig({ ...config, showStamp: v })} />
                        </View>

                        <View style={styles.divider} />

                        <Text style={[styles.sectionTitle, { color: textColor, marginTop: 8 }]}>Page Size</Text>
                        <View style={styles.pageSizeContainer}>
                            {['A4', 'A5'].map((size) => (
                                <TouchableOpacity
                                    key={size}
                                    style={[
                                        styles.pageSizeOption,
                                        { backgroundColor: cardBg },
                                        config.pageSize === size && styles.activePageSize
                                    ]}
                                    onPress={() => setConfig({ ...config, pageSize: size as any })}
                                >
                                    <View style={[styles.paperIcon, { height: size === 'A4' ? 30 : 22, width: size === 'A4' ? 22 : 16 }]} />
                                    <Text style={[styles.pageSizeText, { color: config.pageSize === size ? '#6366f1' : mutedColor }]}>{size}</Text>
                                    {config.pageSize === size && <View style={styles.checkDot} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>
                )}

                {activeTab === 'columns' && (
                    <Card style={styles.card}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Table Columns</Text>
                        <Text style={[styles.hint, { color: mutedColor }]}>Choose which columns appear in the items table.</Text>

                        <View style={styles.row}>
                            <Text style={[styles.itemLabel, { color: textColor }]}>SKU / Code</Text>
                            <Switch value={config.visibleColumns.sku} onValueChange={() => toggleColumn('sku')} />
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.itemLabel, { color: textColor }]}>Unit (pcs, hrs, etc)</Text>
                            <Switch value={config.visibleColumns.unit} onValueChange={() => toggleColumn('unit')} />
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.itemLabel, { color: textColor }]}>Item Tax Rate</Text>
                            <Switch value={config.visibleColumns.tax} onValueChange={() => toggleColumn('tax')} />
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.itemLabel, { color: textColor }]}>Quantity</Text>
                            <Switch value={config.visibleColumns.quantity} onValueChange={() => toggleColumn('quantity')} disabled />
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.itemLabel, { color: textColor }]}>Price</Text>
                            <Switch value={config.visibleColumns.price} onValueChange={() => toggleColumn('price')} />
                        </View>
                    </Card>
                )}

                {activeTab === 'labels' && (
                    <Card style={styles.card}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Custom Labels</Text>
                        <Text style={[styles.hint, { color: mutedColor }]}>Rename fields as they appear on the PDF.</Text>

                        <View style={styles.grid}>
                            <Input label="Invoice Title" value={config.labels.invoice} onChangeText={(t) => updateLabel('invoice', t)} />
                            <Input label="Recipient Label" value={config.labels.billTo} onChangeText={(t) => updateLabel('billTo', t)} />
                            <Input label="Quantity Label" value={config.labels.quantity} onChangeText={(t) => updateLabel('quantity', t)} />
                            <Input label="Price Label" value={config.labels.price} onChangeText={(t) => updateLabel('price', t)} />
                            <Input label="Total Label" value={config.labels.total} onChangeText={(t) => updateLabel('total', t)} />
                            <Input label="Note Section Header" value={config.labels.notes} onChangeText={(t) => updateLabel('notes', t)} />
                        </View>
                    </Card>
                )}

                <Button
                    title="Reset to Defaults"
                    variant="outline"
                    icon={RotateCcw}
                    onPress={resetToDefault}
                    style={{ marginTop: 20 }}
                />

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: 'bold' },
    tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 12 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
    activeTab: { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderWidth: 1, borderColor: '#6366f1' },
    tabLabel: { fontSize: 13, fontWeight: '600' },
    content: { flex: 1 },
    scrollContent: { padding: 16 },
    card: { padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    itemLabel: { fontSize: 15 },
    hint: { fontSize: 13, marginBottom: 16 },
    grid: { gap: 4 },
    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 16 },
    pageSizeContainer: { flexDirection: 'row', gap: 12, marginTop: 8 },
    pageSizeOption: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', position: 'relative' },
    activePageSize: { borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.05)' },
    paperIcon: { borderWidth: 1.5, borderColor: '#6366f1', borderRadius: 2, marginBottom: 8 },
    pageSizeText: { fontSize: 14, fontWeight: '700' },
    checkDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' }
});
