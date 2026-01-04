import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common';
import { FileText, Download, Eye, FileLock, Upload } from 'lucide-react-native';

export function EmployeeVaultScreen({ navigation }: any) {
    const { isDark, primaryColor } = useTheme();

    // Mock data
    const documents = [
        { id: '1', name: 'Contract_2024.pdf', type: 'contract', date: '2024-01-01', size: '2.4 MB' },
        { id: '2', name: 'ID_Card_Copy.jpg', type: 'id', date: '2023-11-15', size: '1.1 MB' },
        { id: '3', name: 'Tax_Form_A.pdf', type: 'tax', date: '2024-02-20', size: '0.8 MB' },
    ];

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const renderItem = ({ item }: any) => (
        <Card style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={[styles.iconBox, { backgroundColor: primaryColor + '10' }]}>
                <FileText color={primaryColor} size={24} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.docName, { color: textColor }]}>{item.name}</Text>
                <Text style={[styles.docMeta, { color: mutedColor }]}>{item.date} • {item.size}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton}>
                    <Eye color={mutedColor} size={20} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Download color={mutedColor} size={20} />
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Digital Vault</Text>
                <TouchableOpacity style={[styles.uploadButton, { backgroundColor: primaryColor }]}>
                    <Upload color="#fff" size={20} />
                    <Text style={styles.uploadText}>Upload</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.infoBanner}>
                <FileLock color={primaryColor} size={20} />
                <Text style={[styles.infoText, { color: mutedColor }]}>
                    Securely store sensitive employee documents, contracts, and identifications.
                </Text>
            </View>

            <FlatList
                data={documents}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800' },
    uploadButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, gap: 8 },
    uploadText: { color: '#fff', fontWeight: '600' },
    infoBanner: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, padding: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 12, gap: 10, alignItems: 'center' },
    infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
    list: { paddingHorizontal: 20 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, gap: 16 },
    iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    docMeta: { fontSize: 13 },
    actions: { flexDirection: 'row', gap: 8 },
    actionButton: { padding: 8 },
});
