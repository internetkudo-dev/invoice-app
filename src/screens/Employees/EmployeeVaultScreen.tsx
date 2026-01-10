import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Button } from '../../components/common';
import { FileText, Download, Eye, FileLock, Upload, Trash2, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export function EmployeeVaultScreen({ navigation, route }: any) {
    const { isDark, primaryColor } = useTheme();
    const employeeId = route.params?.id;
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [userEmployee, setUserEmployee] = useState<any>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([
            fetchCurrentUserEmployee(),
            fetchDocuments()
        ]);
        setLoading(false);
    };

    const fetchCurrentUserEmployee = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('employees')
                .select('id, company_id, role')
                .eq('user_id', user.id)
                .single();
            setUserEmployee(data);
        }
    };

    const fetchDocuments = async () => {
        try {
            let query = supabase
                .from('employee_documents')
                .select(`
                    *,
                    employees (first_name, last_name)
                `)
                .order('uploaded_at', { ascending: false });

            if (employeeId) {
                query = query.eq('employee_id', employeeId);
            }

            const { data, error } = await query;
            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDocuments();
        setRefreshing(false);
    };

    const handleUpload = async () => {
        // If no employee profile, check if user is an OWNER or ADMIN via memberships
        let uEmp = userEmployee;
        if (!uEmp) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // First try to get from profiles
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id, active_company_id')
                    .eq('id', user.id)
                    .single();

                if (profile?.active_company_id || profile?.company_id) {
                    uEmp = {
                        id: user.id,
                        company_id: profile.active_company_id || profile.company_id,
                        role: 'admin'
                    };
                } else {
                    // Try memberships as fallback
                    const { data: membership } = await supabase
                        .from('memberships')
                        .select('company_id, role')
                        .eq('user_id', user.id)
                        .in('role', ['owner', 'admin'])
                        .single();

                    if (membership) {
                        uEmp = {
                            id: user.id,
                            company_id: membership.company_id,
                            role: membership.role
                        };
                    }
                }
            }
        }

        if (!uEmp || !uEmp.company_id) {
            Alert.alert('Error', 'Unable to upload. Please make sure you are part of a company.');
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            const file = result.assets[0];
            setUploading(true);

            // 1. Read file as base64
            const base64 = await FileSystem.readAsStringAsync(file.uri, {
                encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
            });

            // 2. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const targetEmployeeId = employeeId || uEmp.id;
            const filePath = `${uEmp.company_id}/${targetEmployeeId}/${fileName}`;

            const { data: storageData, error: storageError } = await supabase.storage
                .from('employee-documents')
                .upload(filePath, decode(base64), {
                    contentType: file.mimeType || 'application/octet-stream',
                    upsert: true
                });

            if (storageError) {
                console.error('Storage error:', storageError);
                throw new Error(storageError.message || 'Failed to upload file to storage');
            }

            // 3. Save metadata to database
            const { error: dbError } = await supabase
                .from('employee_documents')
                .insert({
                    employee_id: targetEmployeeId,
                    company_id: uEmp.company_id,
                    name: file.name,
                    document_type: 'other',
                    file_url: filePath
                });

            if (dbError) {
                console.error('Database error:', dbError);
                throw new Error(dbError.message || 'Failed to save document metadata');
            }

            Alert.alert('Success', 'Document uploaded successfully');
            fetchDocuments();
        } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert('Upload Failed', error.message || 'Unknown error occurred');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, filePath: string) => {
        Alert.alert(
            'Delete Document',
            'Are you sure you want to delete this document?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete from storage
                            const { error: storageError } = await supabase.storage
                                .from('employee-documents')
                                .remove([filePath]);

                            // Delete from DB (even if storage fail, to keep it clean, though ideally atomic)
                            const { error: dbError } = await supabase
                                .from('employee_documents')
                                .delete()
                                .eq('id', id);

                            if (dbError) throw dbError;

                            fetchDocuments();
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleView = async (filePath: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('employee-documents')
                .createSignedUrl(filePath, 3600); // 1 hour link

            if (error) throw error;
            if (data?.signedUrl) {
                await Linking.openURL(data.signedUrl);
            }
        } catch (error: any) {
            Alert.alert('Error', 'Could not open document: ' + error.message);
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const renderItem = ({ item }: any) => (
        <Card style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={[styles.iconBox, { backgroundColor: primaryColor + '10' }]}>
                <FileText color={primaryColor} size={24} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.docName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.docMeta, { color: mutedColor }]}>
                    {new Date(item.uploaded_at).toLocaleDateString()} • {item.employees?.first_name} {item.employees?.last_name}
                </Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleView(item.file_url)}>
                    <Eye color={mutedColor} size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(item.id, item.file_url)}
                >
                    <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                        <ArrowLeft color={textColor} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: textColor }]}>Digital Vault</Text>
                </View>
                <TouchableOpacity
                    style={[styles.uploadButton, { backgroundColor: primaryColor }]}
                    onPress={handleUpload}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Upload color="#fff" size={20} />
                            <Text style={styles.uploadText}>Upload</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.infoBanner}>
                <FileLock color={primaryColor} size={20} />
                <Text style={[styles.infoText, { color: mutedColor }]}>
                    Securely store sensitive employee documents, contracts, and identifications.
                </Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 50 }} color={primaryColor} />
            ) : (
                <FlatList
                    data={documents}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FileText color={mutedColor} size={48} />
                            <Text style={[styles.emptyText, { color: mutedColor }]}>No documents found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800' },
    uploadButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, gap: 8, minWidth: 100, justifyContent: 'center' },
    uploadText: { color: '#fff', fontWeight: '600' },
    infoBanner: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, padding: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 12, gap: 10, alignItems: 'center' },
    infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
    list: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, gap: 16, borderRadius: 16 },
    iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    docMeta: { fontSize: 12 },
    actions: { flexDirection: 'row', gap: 4 },
    actionButton: { padding: 8 },
    emptyContainer: { alignItems: 'center', marginTop: 100, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: '500' }
});
