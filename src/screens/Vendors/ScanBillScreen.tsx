import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ArrowLeft, Camera, Image as ImageIcon, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useTheme } from '../../hooks/useTheme';
import { t } from '../../i18n';
import { Button, Card } from '../../components/common';

export function ScanBillScreen({ navigation }: any) {
    const { isDark, primaryColor, language } = useTheme();
    const [image, setImage] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState<any | null>(null);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.4,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setScanResult(null);
        }
    };

    const takePhoto = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert(t('error', language), 'Permission to access camera is required!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.4,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setScanResult(null);
        }
    };

    const handleScan = async () => {
        if (!image) return;

        setScanning(true);
        try {
            // 1. Read the image as base64
            const base64 = await FileSystem.readAsStringAsync(image, {
                encoding: 'base64',
            });

            // 2. Call the Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('process-bill', {
                body: { image: base64 },
            });

            if (error) throw error;

            if (data) {
                if (data.error) {
                    throw new Error(data.error);
                }
                setScanResult(data);
            } else {
                throw new Error('No data returned from AI');
            }

        } catch (error: any) {
            console.error('Scan Error Details:', {
                message: error.message,
                status: error.status,
                details: error.context ? await error.context.json().catch(() => 'No JSON body') : 'No context'
            });

            let errorMessage = t('scanError', language);
            if (error.status === 500) errorMessage = "Server Error (500). Please check logs.";
            if (error.status === 413) errorMessage = "Image too large (413). Try a smaller photo.";
            if (error.status === 401) errorMessage = "Unauthorized (401). Check API keys.";

            // Try to extract more detail from Supabase error
            if (error.context && typeof error.context.json === 'function') {
                try {
                    const errorDetails = await error.context.json();
                    if (errorDetails.error) errorMessage = errorDetails.error;
                } catch (e) { }
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert(t('error', language), `${errorMessage} (Status: ${error.status || 'N/A'})`);
        } finally {
            setScanning(false);
        }
    };

    const confirmAndNavigate = () => {
        Alert.alert(
            t('selectType', language) || 'Select Type',
            t('selectTypeMsg', language) || 'Is this a Supplier Bill or a simple Receipt?',
            [
                {
                    text: t('cancel', language) || 'Cancel',
                    style: 'cancel'
                },
                {
                    text: t('expense', language) || 'Expense/Receipt',
                    onPress: () => navigation.navigate('ExpenseForm', { scannedData: scanResult })
                },
                {
                    text: t('supplierBill', language) || 'Supplier Bill',
                    onPress: () => navigation.navigate('SupplierBillForm', { scannedData: scanResult })
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{t('aiAnalysis', language)}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('scanBill', language)}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {!image ? (
                    <View style={styles.emptyContainer}>
                        <View style={[styles.iconPlaceholder, { backgroundColor: primaryColor + '10' }]}>
                            <Camera color={primaryColor} size={48} />
                        </View>
                        <Text style={[styles.emptyText, { color: textColor }]}>
                            Skanoni faturat tuaja fizike për t'i regjistruar automatikisht
                        </Text>
                        <Text style={[styles.emptySubtext, { color: mutedColor }]}>
                            AI do të lexojë furnitorin, shumën dhe datën për ju.
                        </Text>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: primaryColor }]}
                                onPress={takePhoto}
                            >
                                <Camera color="#fff" size={20} />
                                <Text style={styles.actionBtnText}>{t('takePhoto', language)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardBg, borderWidth: 1, borderColor: primaryColor }]}
                                onPress={pickImage}
                            >
                                <ImageIcon color={primaryColor} size={20} />
                                <Text style={[styles.actionBtnText, { color: primaryColor }]}>{t('pickFromGallery', language)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.previewContainer}>
                        <Card style={styles.imageCard}>
                            <Image source={{ uri: image }} style={styles.previewImage} resizeMode="contain" />
                            <TouchableOpacity
                                style={styles.retakeBtn}
                                onPress={() => setImage(null)}
                            >
                                <Text style={styles.retakeText}>Ndrysho foton</Text>
                            </TouchableOpacity>
                        </Card>

                        {scanning ? (
                            <View style={styles.scanningOverlay}>
                                <ActivityIndicator size="large" color={primaryColor} />
                                <Text style={[styles.scanningText, { color: textColor }]}>
                                    {t('scanningInProgress', language)}
                                </Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBar, { backgroundColor: primaryColor, width: '70%' }]} />
                                </View>
                            </View>
                        ) : scanResult ? (
                            <Card style={styles.resultCard}>
                                <View style={styles.resultHeader}>
                                    <CheckCircle2 color="#10b981" size={24} />
                                    <Text style={[styles.resultTitle, { color: textColor }]}>{t('scanSuccess', language)}</Text>
                                </View>

                                <View style={styles.resultDetails}>
                                    <View style={styles.detailItem}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Furnitori</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>{scanResult.vendor_name}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Shuma</Text>
                                        <Text style={[styles.detailValue, { color: textColor, fontWeight: 'bold' }]}>€{scanResult.total_amount}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Nr. Faturës</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>{scanResult.bill_number}</Text>
                                    </View>
                                </View>

                                <Button
                                    title={t('extractData', language)}
                                    onPress={confirmAndNavigate}
                                    variant="primary"
                                />
                            </Card>
                        ) : (
                            <Button
                                title="Fillo Skanimin"
                                onPress={handleScan}
                                icon={Sparkles}
                                style={styles.scanBtn}
                            />
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, gap: 16 },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    content: { flexGrow: 1, padding: 20 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    iconPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    emptyText: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12, paddingHorizontal: 20 },
    emptySubtext: { fontSize: 14, textAlign: 'center', marginBottom: 32, paddingHorizontal: 40 },
    buttonRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
    actionBtnText: { color: '#fff', fontWeight: '600' },
    previewContainer: { flex: 1 },
    imageCard: { padding: 8, overflow: 'hidden', marginBottom: 20 },
    previewImage: { width: '100%', height: 350, borderRadius: 12 },
    retakeBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    retakeText: { color: '#fff', fontSize: 12 },
    scanningOverlay: { alignItems: 'center', padding: 20 },
    scanningText: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 12 },
    progressBarContainer: { width: '80%', height: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%' },
    resultCard: { padding: 20 },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    resultTitle: { fontSize: 18, fontWeight: '700' },
    resultDetails: { marginBottom: 24, gap: 16 },
    detailItem: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: 12 },
    detailLabel: { fontSize: 12, marginBottom: 4 },
    detailValue: { fontSize: 16 },
    scanBtn: { marginTop: 20 },
});
