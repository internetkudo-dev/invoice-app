import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Switch,
    Alert,
} from 'react-native';
import { ArrowLeft, Save, FileText, Type, Hash, Calendar, Percent, User, Package, Plus, Trash2, GripVertical } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../api/supabase';
import { Card, Input, Button } from '../../../components/common';

interface FieldConfig {
    id: string;
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'textarea';
    required: boolean;
    enabled: boolean;
    placeholder?: string;
    defaultValue?: string;
}

interface InvoiceTemplateSettings {
    id?: string;
    name: string;
    fields: FieldConfig[];
    showLogo: boolean;
    showSignature: boolean;
    showNotes: boolean;
    showDiscount: boolean;
    showTax: boolean;
    defaultDueDays: number;
    defaultTaxRate: number;
    primaryColor: string;
    footerText: string;
}

const defaultFields: FieldConfig[] = [
    { id: '1', key: 'invoice_number', label: 'Invoice Number', type: 'text', required: true, enabled: true, placeholder: 'INV-001' },
    { id: '2', key: 'issue_date', label: 'Issue Date', type: 'date', required: true, enabled: true },
    { id: '3', key: 'due_date', label: 'Due Date', type: 'date', required: false, enabled: true },
    { id: '4', key: 'client', label: 'Client', type: 'select', required: true, enabled: true },
    { id: '5', key: 'items', label: 'Line Items', type: 'text', required: true, enabled: true },
    { id: '6', key: 'subtotal', label: 'Subtotal', type: 'number', required: true, enabled: true },
    { id: '7', key: 'tax', label: 'Tax', type: 'number', required: false, enabled: true },
    { id: '8', key: 'discount', label: 'Discount', type: 'number', required: false, enabled: true },
    { id: '9', key: 'total', label: 'Total', type: 'number', required: true, enabled: true },
    { id: '10', key: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: true, placeholder: 'Payment terms, thank you message...' },
];

const defaultTemplate: InvoiceTemplateSettings = {
    name: 'Default Template',
    fields: defaultFields,
    showLogo: true,
    showSignature: true,
    showNotes: true,
    showDiscount: true,
    showTax: true,
    defaultDueDays: 30,
    defaultTaxRate: 18,
    primaryColor: '#6366f1',
    footerText: 'Thank you for your business!',
};

export function InvoiceTemplateSettingsScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();
    const { user } = useAuth();
    const [template, setTemplate] = useState<InvoiceTemplateSettings>(defaultTemplate);
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';

    useEffect(() => {
        loadTemplate();
    }, []);

    const loadTemplate = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('invoice_templates')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single();

        if (data) {
            setTemplate({
                id: data.id,
                name: data.name,
                fields: data.fields || defaultFields,
                showLogo: data.show_logo ?? true,
                showSignature: data.show_signature ?? true,
                showNotes: data.show_notes ?? true,
                showDiscount: data.show_discount ?? true,
                showTax: data.show_tax ?? true,
                defaultDueDays: data.default_due_days ?? 30,
                defaultTaxRate: data.default_tax_rate ?? 18,
                primaryColor: data.primary_color || '#6366f1',
                footerText: data.footer_text || '',
            });
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const templateData = {
                user_id: user.id,
                name: template.name,
                fields: template.fields,
                show_logo: template.showLogo,
                show_signature: template.showSignature,
                show_notes: template.showNotes,
                show_discount: template.showDiscount,
                show_tax: template.showTax,
                default_due_days: template.defaultDueDays,
                default_tax_rate: template.defaultTaxRate,
                primary_color: template.primaryColor,
                footer_text: template.footerText,
                is_default: true,
            };

            if (template.id) {
                await supabase.from('invoice_templates').update(templateData).eq('id', template.id);
            } else {
                await supabase.from('invoice_templates').insert(templateData);
            }

            Alert.alert('Success', 'Template settings saved!');
            setHasChanges(false);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (fieldId: string, updates: Partial<FieldConfig>) => {
        setTemplate(prev => ({
            ...prev,
            fields: prev.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
        }));
        setHasChanges(true);
    };

    const toggleSection = (key: keyof InvoiceTemplateSettings, value: boolean) => {
        setTemplate(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const renderFieldEditor = (field: FieldConfig) => (
        <View key={field.id} style={[styles.fieldItem, { backgroundColor: inputBg }]}>
            <View style={styles.fieldHeader}>
                <View style={styles.fieldInfo}>
                    <GripVertical color={mutedColor} size={16} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Input
                            value={field.label}
                            onChangeText={(text) => updateField(field.id, { label: text })}
                            placeholder="Field Label"
                            containerStyle={{ marginBottom: 0 }}
                        />
                    </View>
                </View>
                <Switch
                    value={field.enabled}
                    onValueChange={(val) => updateField(field.id, { enabled: val })}
                    trackColor={{ false: '#334155', true: primaryColor + '50' }}
                    thumbColor={field.enabled ? primaryColor : '#64748b'}
                />
            </View>
            {field.enabled && (
                <View style={styles.fieldOptions}>
                    <View style={styles.optionRow}>
                        <Text style={[styles.optionLabel, { color: mutedColor }]}>Required</Text>
                        <Switch
                            value={field.required}
                            onValueChange={(val) => updateField(field.id, { required: val })}
                            trackColor={{ false: '#334155', true: '#10b98150' }}
                            thumbColor={field.required ? '#10b981' : '#64748b'}
                        />
                    </View>
                    {field.type === 'text' && (
                        <Input
                            label="Placeholder"
                            value={field.placeholder || ''}
                            onChangeText={(text) => updateField(field.id, { placeholder: text })}
                            placeholder="Enter placeholder text"
                        />
                    )}
                </View>
            )}
        </View>
    );

    const SettingRow = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) => (
        <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: textColor }]}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#334155', true: primaryColor + '50' }}
                thumbColor={value ? primaryColor : '#64748b'}
            />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Invoice Template</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    <Save color={hasChanges ? primaryColor : mutedColor} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Template Name */}
                <Card style={{ backgroundColor: cardBg, marginBottom: 16 }}>
                    <View style={styles.sectionHeader}>
                        <FileText color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Template Info</Text>
                    </View>
                    <Input
                        label="Template Name"
                        value={template.name}
                        onChangeText={(text) => {
                            setTemplate(prev => ({ ...prev, name: text }));
                            setHasChanges(true);
                        }}
                        placeholder="My Invoice Template"
                    />
                    <Input
                        label="Footer Text"
                        value={template.footerText}
                        onChangeText={(text) => {
                            setTemplate(prev => ({ ...prev, footerText: text }));
                            setHasChanges(true);
                        }}
                        placeholder="Thank you for your business!"
                        multiline
                    />
                </Card>

                {/* Display Options */}
                <Card style={{ backgroundColor: cardBg, marginBottom: 16 }}>
                    <View style={styles.sectionHeader}>
                        <Type color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Display Options</Text>
                    </View>
                    <SettingRow label="Show Company Logo" value={template.showLogo} onToggle={(v) => toggleSection('showLogo', v)} />
                    <SettingRow label="Show Signature Field" value={template.showSignature} onToggle={(v) => toggleSection('showSignature', v)} />
                    <SettingRow label="Show Notes Section" value={template.showNotes} onToggle={(v) => toggleSection('showNotes', v)} />
                    <SettingRow label="Show Discount Field" value={template.showDiscount} onToggle={(v) => toggleSection('showDiscount', v)} />
                    <SettingRow label="Show Tax Field" value={template.showTax} onToggle={(v) => toggleSection('showTax', v)} />
                </Card>

                {/* Default Values */}
                <Card style={{ backgroundColor: cardBg, marginBottom: 16 }}>
                    <View style={styles.sectionHeader}>
                        <Hash color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Default Values</Text>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Due Days"
                                value={String(template.defaultDueDays)}
                                onChangeText={(text) => {
                                    setTemplate(prev => ({ ...prev, defaultDueDays: Number(text) || 30 }));
                                    setHasChanges(true);
                                }}
                                keyboardType="numeric"
                                placeholder="30"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Tax Rate %"
                                value={String(template.defaultTaxRate)}
                                onChangeText={(text) => {
                                    setTemplate(prev => ({ ...prev, defaultTaxRate: Number(text) || 0 }));
                                    setHasChanges(true);
                                }}
                                keyboardType="numeric"
                                placeholder="18"
                            />
                        </View>
                    </View>
                </Card>

                {/* Field Configuration */}
                <Card style={{ backgroundColor: cardBg, marginBottom: 16 }}>
                    <View style={styles.sectionHeader}>
                        <Package color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Invoice Fields</Text>
                    </View>
                    <Text style={[styles.helperText, { color: mutedColor }]}>
                        Customize field labels and toggle which fields appear on your invoices.
                    </Text>
                    {template.fields.map(renderFieldEditor)}
                </Card>

                {/* Save Button */}
                <Button
                    title="Save Template"
                    icon={Save}
                    onPress={handleSave}
                    loading={loading}
                    disabled={!hasChanges}
                    style={{ marginBottom: 32 }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold' },
    row: { flexDirection: 'row', gap: 12 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    settingLabel: { fontSize: 15 },
    fieldItem: { padding: 16, borderRadius: 12, marginBottom: 12 },
    fieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fieldInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    fieldOptions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    optionLabel: { fontSize: 13 },
    helperText: { fontSize: 13, marginBottom: 16 },
});
