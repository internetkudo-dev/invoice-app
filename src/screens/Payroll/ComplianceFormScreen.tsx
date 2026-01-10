import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeft, Save, Calendar, Paperclip, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card, Input, Button } from '../../components/common';
import * as DocumentPicker from 'expo-document-picker';
import { t } from '../../i18n';

export function ComplianceFormScreen({ navigation, route }: any) {
    const { isDark, primaryColor, language } = useTheme();
    const { user } = useAuth();
    const { complianceId } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'pending' | 'completed' | 'expired'>('pending');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [attachment, setAttachment] = useState<any>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useEffect(() => {
        if (complianceId) {
            loadCompliance();
        }
    }, [complianceId]);

    const loadCompliance = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('compliances')
            .select('*')
            .eq('id', complianceId)
            .single();

        if (data) {
            setTitle(data.title);
            setDescription(data.description || '');
            setStatus(data.status);
            if (data.due_date) setDueDate(new Date(data.due_date));
        }
        setLoading(false);
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.assets && result.assets.length > 0) {
                setAttachment(result.assets[0]);
            }
        } catch (err) {
            console.error('Document picker error', err);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }

        setSaving(true);
        try {
            // Get company ID
            let companyId;
            const { data: profile } = await supabase.from('profiles').select('active_company_id, company_id').eq('id', user?.id).single();
            companyId = profile?.active_company_id || profile?.company_id;

            if (!companyId) throw new Error('Company ID not found');

            let attachmentUrl = null;
            if (attachment) {
                // Upload logic here if needed, for now just skip or mock
                // In a real implementation, upload to Supabase Storage 'compliance-docs'
            }

            const payload = {
                company_id: companyId,
                title,
                description,
                status,
                due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
                attachment_url: attachmentUrl
            };

            if (complianceId) {
                const { error } = await supabase.from('compliances').update(payload).eq('id', complianceId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('compliances').insert(payload);
                if (error) throw error;
            }

            Alert.alert('Success', 'Compliance record saved', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDueDate(selectedDate);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>
                    {complianceId ? 'Edit Compliance' : 'New Compliance'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={[styles.card, { backgroundColor: cardBg }]}>
                    <Input
                        label="Title"
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Health & Safety Audit"
                    />

                    <View style={{ marginBottom: 16 }}>
                        <Text style={[styles.label, { color: mutedColor }]}>Due Date</Text>
                        <TouchableOpacity
                            style={[styles.dateButton, { borderColor }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Calendar color={mutedColor} size={20} />
                            <Text style={{ color: textColor, marginLeft: 8 }}>
                                {dueDate ? dueDate.toLocaleDateString() : 'Set Due Date'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ marginBottom: 16 }}>
                        <Text style={[styles.label, { color: mutedColor }]}>Description</Text>
                        <TextInput
                            style={[styles.textArea, { color: textColor, borderColor }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Add details..."
                            placeholderTextColor={mutedColor}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={{ marginBottom: 16 }}>
                        <Text style={[styles.label, { color: mutedColor }]}>Status</Text>
                        <View style={styles.statusRow}>
                            {(['pending', 'completed', 'expired'] as const).map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.statusChip,
                                        { borderColor },
                                        status === s && { backgroundColor: primaryColor + '20', borderColor: primaryColor }
                                    ]}
                                    onPress={() => setStatus(s)}
                                >
                                    <Text style={{
                                        color: status === s ? primaryColor : mutedColor,
                                        textTransform: 'capitalize',
                                        fontWeight: '600'
                                    }}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Attachment placeholder */}
                    <TouchableOpacity style={[styles.attachButton, { borderColor, borderStyle: 'dashed' }]} onPress={handlePickDocument}>
                        <Paperclip color={mutedColor} size={20} />
                        <Text style={{ color: mutedColor }}>
                            {attachment ? attachment.name : 'Attach Document (Optional)'}
                        </Text>
                        {attachment && (
                            <TouchableOpacity onPress={() => setAttachment(null)}>
                                <X color={mutedColor} size={16} />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>

                </Card>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
                <Button
                    title="Save Record"
                    onPress={handleSave}
                    loading={saving}
                    icon={Save}
                />
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={dueDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { padding: 8 },
    title: { fontSize: 20, fontWeight: '800' },
    content: { padding: 20 },
    card: { padding: 20, borderRadius: 16 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    dateButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 12 },
    textArea: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 100 },
    footer: { padding: 20, borderTopWidth: 1 },
    statusRow: { flexDirection: 'row', gap: 8 },
    statusChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    attachButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 1, borderRadius: 12, gap: 8, marginTop: 8 }
});
