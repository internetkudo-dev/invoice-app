import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from 'react-native';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { supabase } from '../../../api/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { Button, Input, Card } from '../../../components/common';
import { ContractTemplate, ContractTemplateField } from '../../../types';

interface ContractTemplateEditorScreenProps {
    navigation: any;
    route: any;
}

const FIELD_TYPES = [
    { value: 'text', label: 'Short Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
];

export function ContractTemplateEditorScreen({ navigation, route }: ContractTemplateEditorScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor } = useTheme();
    const templateId = route.params?.templateId;
    const isEditing = !!templateId;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState<ContractTemplateField[]>([]);
    const [loading, setLoading] = useState(false);

    // Field Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [currentField, setCurrentField] = useState<Partial<ContractTemplateField>>({});
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';

    useEffect(() => {
        if (isEditing) fetchTemplate();
    }, [templateId]);

    const fetchTemplate = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('contract_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (data) {
            setName(data.name);
            setDescription(data.description || '');
            setFields(data.fields || []);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!name) {
            Alert.alert('Error', 'Template name is required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                user_id: user?.id,
                name,
                description,
                fields,
            };

            let error;
            if (isEditing) {
                ({ error } = await supabase.from('contract_templates').update(payload).eq('id', templateId));
            } else {
                ({ error } = await supabase.from('contract_templates').insert(payload));
            }

            if (error) throw error;
            Alert.alert('Success', 'Template saved successfully');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddField = () => {
        if (!currentField.label || !currentField.type) {
            Alert.alert('Error', 'Label and Type are required');
            return;
        }

        const newField: ContractTemplateField = {
            id: currentField.id || Math.random().toString(36).substr(2, 9),
            label: currentField.label,
            type: currentField.type as any,
            placeholder: currentField.placeholder,
            required: currentField.required ?? true,
        };

        if (editingFieldIndex !== null) {
            const updated = [...fields];
            updated[editingFieldIndex] = newField;
            setFields(updated);
        } else {
            setFields([...fields, newField]);
        }

        setModalVisible(false);
        resetModal();
    };

    const resetModal = () => {
        setCurrentField({});
        setEditingFieldIndex(null);
    };

    const deleteField = (index: number) => {
        const updated = [...fields];
        updated.splice(index, 1);
        setFields(updated);
    };

    const openFieldModal = (field?: ContractTemplateField, index?: number) => {
        if (field && index !== undefined) {
            setCurrentField(field);
            setEditingFieldIndex(index);
        } else {
            resetModal();
            setCurrentField({ type: 'text', required: true });
        }
        setModalVisible(true);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>{isEditing ? 'Edit Template' : 'New Template'}</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    <Save color={primaryColor} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={[styles.section, { backgroundColor: cardBg }]}>
                    <Input label="Template Name" value={name} onChangeText={setName} placeholder="e.g. Website Development Contract" />
                    <Input label="Description" value={description} onChangeText={setDescription} placeholder="Optional description..." multiline />
                </Card>

                <View style={styles.fieldsHeader}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Fields / Questions</Text>
                    <TouchableOpacity onPress={() => openFieldModal()}>
                        <View style={[styles.addButton, { backgroundColor: primaryColor }]}>
                            <Plus color="white" size={16} />
                            <Text style={styles.addButtonText}>Add Field</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {fields.map((field, index) => (
                    <TouchableOpacity
                        key={field.id}
                        onPress={() => openFieldModal(field, index)}
                        activeOpacity={0.7}
                    >
                        <Card style={[styles.fieldCard, { backgroundColor: cardBg }]}>
                            <View style={styles.dragHandle}>
                                <GripVertical color={mutedColor} size={20} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.fieldLabel, { color: textColor }]}>{field.label}</Text>
                                <Text style={[styles.fieldType, { color: mutedColor }]}>{field.type} {field.required ? '*' : ''}</Text>
                            </View>
                            <TouchableOpacity onPress={() => deleteField(index)} style={{ padding: 8 }}>
                                <Trash2 color="#ef4444" size={18} />
                            </TouchableOpacity>
                        </Card>
                    </TouchableOpacity>
                ))}

                {fields.length === 0 && (
                    <Text style={{ textAlign: 'center', color: mutedColor, marginTop: 24 }}>
                        No fields added yet. Add questions for the contract.
                    </Text>
                )}
            </ScrollView>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <Text style={[styles.modalTitle, { color: textColor }]}>
                            {editingFieldIndex !== null ? 'Edit Field' : 'Add Field'}
                        </Text>

                        <Input
                            label="Question Label"
                            value={currentField.label}
                            onChangeText={t => setCurrentField({ ...currentField, label: t })}
                            placeholder="e.g. Project Duration"
                        />

                        <Input
                            label="Placeholder"
                            value={currentField.placeholder}
                            onChangeText={t => setCurrentField({ ...currentField, placeholder: t })}
                            placeholder="e.g. 2 months"
                        />

                        <Text style={[styles.label, { color: textColor }]}>Type</Text>
                        <View style={styles.typeRow}>
                            {FIELD_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t.value}
                                    style={[
                                        styles.typeOption,
                                        { borderColor: currentField.type === t.value ? primaryColor : mutedColor },
                                        currentField.type === t.value && { backgroundColor: primaryColor + '20' }
                                    ]}
                                    onPress={() => setCurrentField({ ...currentField, type: t.value as any })}
                                >
                                    <Text style={{ color: currentField.type === t.value ? primaryColor : mutedColor, fontSize: 12 }}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                onPress={() => setModalVisible(false)}
                                variant="outline"
                                style={{ flex: 1 }}
                            />
                            <View style={{ width: 12 }} />
                            <Button
                                title="Save Field"
                                onPress={handleAddField}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: {},
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 16 },
    section: { marginBottom: 24, padding: 16 },
    fieldsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold' },
    addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4 },
    addButtonText: { color: 'white', fontWeight: '600', fontSize: 12 },
    fieldCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8, gap: 12 },
    dragHandle: {},
    fieldLabel: { fontSize: 16, fontWeight: '600' },
    fieldType: { fontSize: 12 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modalContent: { borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    typeOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
    modalActions: { flexDirection: 'row' },
});
