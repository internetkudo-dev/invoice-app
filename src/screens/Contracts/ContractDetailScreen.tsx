import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    Modal,
} from 'react-native';
import { ArrowLeft, Edit2, Trash2, FileText, User, Calendar, CheckCircle, XCircle, Eye, Printer, Mail, Share2, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, StatusBadge } from '../../components/common';
import { Contract, Client, Profile } from '../../types';
import { SvgXml } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateContractHTML } from '../../services/pdf/contractTemplates';

interface ContractDetailScreenProps {
    navigation: any;
    route: any;
}

export function ContractDetailScreen({ navigation, route }: ContractDetailScreenProps) {
    const { contractId } = route.params;
    const { user } = useAuth();
    const { isDark, primaryColor } = useTheme();
    const [contract, setContract] = useState<Contract | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPreview, setShowPreview] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    useEffect(() => {
        fetchContract();
        fetchProfile();
    }, [contractId]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    };

    const fetchContract = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('contracts')
            .select('*, client:clients(*)')
            .eq('id', contractId)
            .single();

        if (error) {
            Alert.alert('Error', error.message);
        } else if (data) {
            setContract(data);
            setClient(data.client);
        }
        setLoading(false);
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Contract',
            'Are you sure you want to delete this contract? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('contracts').delete().eq('id', contractId);
                        if (error) Alert.alert('Error', error.message);
                        else navigation.goBack();
                    },
                },
            ]
        );
    };

    const generateHTML = () => {
        if (!contract || !profile) return '';
        return generateContractHTML({ contract, client, profile });
    };

    const handlePreview = () => {
        const html = generateHTML();
        setHtmlContent(html);
        setShowPreview(true);
    };

    const handlePrint = async () => {
        const html = generateHTML();
        try {
            await Print.printAsync({ html });
        } catch (error: any) {
            // Ignore cancellation errors
            if (error.message?.includes('Printing did not complete') || error.message?.includes('cancelled')) {
                return;
            }
            Alert.alert('Error', 'Failed to print contract');
        }
    };

    const handleShare = async () => {
        const html = generateHTML();
        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Contract' });
        } catch (error) {
            Alert.alert('Error', 'Failed to share contract');
        }
    };

    const renderSignature = (label: string, signatureUrl: string | undefined) => (
        <View style={styles.signatureSection}>
            <Text style={[styles.signatureLabel, { color: textColor }]}>{label}</Text>
            {signatureUrl ? (
                <View style={[styles.signatureBox, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}>
                    {signatureUrl.startsWith('data:image/svg+xml') ? (
                        <SvgXml xml={decodeURIComponent(signatureUrl.split(',')[1])} width="100%" height="100%" />
                    ) : (
                        <Image source={{ uri: signatureUrl }} style={styles.signatureImage} resizeMode="contain" />
                    )}
                </View>
            ) : (
                <View style={[styles.signatureBox, styles.signatureMissing, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}>
                    <XCircle color="#ef4444" size={24} />
                    <Text style={{ color: '#ef4444', marginTop: 4 }}>Not Signed</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: bgColor }]}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    if (!contract) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: bgColor }]}>
                <Text style={{ color: textColor }}>Contract not found</Text>
            </View>
        );
    }

    const contractContent = contract.content || {};

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Contract Details</Text>
                <TouchableOpacity onPress={handleDelete}>
                    <Trash2 color="#ef4444" size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Card */}
                <Card style={{ backgroundColor: cardBg, marginBottom: 16 }}>
                    <View style={styles.headerCard}>
                        <View style={[styles.iconCircle, { backgroundColor: primaryColor + '20' }]}>
                            <FileText color={primaryColor} size={32} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={[styles.contractTitle, { color: textColor }]}>{contract.title}</Text>
                            <Text style={[styles.contractType, { color: mutedColor }]}>
                                {contract.type?.replace('_', ' ').toUpperCase()}
                            </Text>
                        </View>
                        <StatusBadge status={contract.status} />
                    </View>
                </Card>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: primaryColor }]} onPress={handlePreview}>
                        <Eye color="#fff" size={20} />
                        <Text style={styles.actionBtnText}>Preview</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={handlePrint}>
                        <Printer color="#fff" size={20} />
                        <Text style={styles.actionBtnText}>Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]} onPress={handleShare}>
                        <Share2 color="#fff" size={20} />
                        <Text style={styles.actionBtnText}>Share</Text>
                    </TouchableOpacity>
                </View>

                {/* Client Info */}
                <Card style={{ backgroundColor: cardBg, marginBottom: 16 }}>
                    <View style={styles.sectionHeader}>
                        <User color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Client</Text>
                    </View>
                    {client ? (
                        <View>
                            <Text style={[styles.clientName, { color: textColor }]}>{client.name}</Text>
                            {client.email && <Text style={{ color: mutedColor }}>{client.email}</Text>}
                            {client.address && <Text style={{ color: mutedColor }}>{client.address}</Text>}
                        </View>
                    ) : (
                        <Text style={{ color: mutedColor }}>No client assigned</Text>
                    )}
                </Card>

                {/* Contract Details */}
                <Card style={{ backgroundColor: cardBg, marginBottom: 16 }}>
                    <View style={styles.sectionHeader}>
                        <FileText color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Contract Details</Text>
                    </View>

                    {Object.entries(contractContent).map(([key, value]) => (
                        <View key={key} style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: mutedColor }]}>
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </Text>
                            <Text style={[styles.detailValue, { color: textColor }]}>{String(value)}</Text>
                        </View>
                    ))}

                    {Object.keys(contractContent).length === 0 && (
                        <Text style={{ color: mutedColor }}>No details provided</Text>
                    )}
                </Card>

                {/* Dates */}
                <Card style={{ backgroundColor: cardBg, marginBottom: 16 }}>
                    <View style={styles.sectionHeader}>
                        <Calendar color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Timeline</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Created</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>
                            {new Date(contract.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    {contract.updated_at && (
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: mutedColor }]}>Last Updated</Text>
                            <Text style={[styles.detailValue, { color: textColor }]}>
                                {new Date(contract.updated_at).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                </Card>

                {/* Signatures */}
                <Card style={{ backgroundColor: cardBg, marginBottom: 16 }}>
                    <View style={styles.sectionHeader}>
                        <CheckCircle color={primaryColor} size={20} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Signatures</Text>
                    </View>

                    <View style={styles.signaturesRow}>
                        {renderSignature('Provider', contract.signature_url)}
                        {renderSignature('Client', contract.counterparty_signature_url)}
                    </View>
                </Card>

                {/* Actions */}
                <Button
                    title="Edit Contract"
                    icon={Edit2}
                    onPress={() => navigation.navigate('ContractForm', { contractId: contract.id })}
                    style={{ marginBottom: 16 }}
                />
            </ScrollView>

            {/* Preview Modal */}
            <Modal visible={showPreview} animationType="slide">
                <View style={[styles.previewContainer, { backgroundColor: bgColor }]}>
                    <View style={styles.previewHeader}>
                        <TouchableOpacity onPress={() => setShowPreview(false)}>
                            <X color={textColor} size={24} />
                        </TouchableOpacity>
                        <Text style={[styles.previewTitle, { color: textColor }]}>Contract Preview</Text>
                        <TouchableOpacity onPress={handlePrint}>
                            <Printer color={primaryColor} size={24} />
                        </TouchableOpacity>
                    </View>
                    <WebView
                        source={{ html: htmlContent }}
                        style={styles.webview}
                        originWhitelist={['*']}
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 16 },
    headerCard: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    contractTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    contractType: { fontSize: 14 },
    quickActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
    actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold' },
    clientName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
    detailRow: { marginBottom: 12 },
    detailLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
    detailValue: { fontSize: 16 },
    signaturesRow: { flexDirection: 'row', gap: 16 },
    signatureSection: { flex: 1 },
    signatureLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    signatureBox: { height: 100, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    signatureMissing: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#ef4444' },
    signatureImage: { width: '100%', height: '100%' },
    previewContainer: { flex: 1 },
    previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    previewTitle: { fontSize: 18, fontWeight: 'bold' },
    webview: { flex: 1 },
});
