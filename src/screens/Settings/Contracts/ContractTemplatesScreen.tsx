import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { supabase } from '../../../api/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, FileText, ChevronRight, Trash2 } from 'lucide-react-native';
import { FAB, Card } from '../../../components/common';
import { ContractTemplate } from '../../../types';

interface ContractTemplatesScreenProps {
    navigation: any;
}

export function ContractTemplatesScreen({ navigation }: ContractTemplatesScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor } = useTheme();
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useFocusEffect(
        useCallback(() => {
            fetchTemplates();
        }, [user])
    );

    const fetchTemplates = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('contract_templates')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) Alert.alert('Error', error.message);
        else setTemplates(data || []);

        setLoading(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Template',
            'Are you sure you want to delete this template?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('contract_templates').delete().eq('id', id);
                        if (error) Alert.alert('Error', error.message);
                        else fetchTemplates();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: ContractTemplate }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ContractTemplateEditor', { templateId: item.id })}
        >
            <Card style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <FileText color={primaryColor} size={24} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>{item.name}</Text>
                        {item.description && (
                            <Text style={[styles.cardDesc, { color: mutedColor }]}>{item.description}</Text>
                        )}
                        <Text style={[styles.fieldCount, { color: mutedColor }]}>
                            {item.fields?.length || 0} fields
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(item.id)}
                    >
                        <Trash2 color="#ef4444" size={20} />
                    </TouchableOpacity>
                    <ChevronRight color={mutedColor} size={20} />
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Contract Templates</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={templates}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: mutedColor }]}>
                                No templates found. Create one to get started.
                            </Text>
                        </View>
                    }
                />
            )}

            <FAB
                onPress={() => navigation.navigate('ContractTemplateEditor')}
                icon={Plus}
                color={primaryColor}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: {},
    title: { fontSize: 20, fontWeight: 'bold' },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16, paddingBottom: 100 },
    card: { marginBottom: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    cardDesc: { fontSize: 13, marginBottom: 4 },
    fieldCount: { fontSize: 12 },
    deleteButton: { padding: 8 },
    emptyContainer: { alignItems: 'center', marginTop: 48 },
    emptyText: { fontSize: 16 },
});
