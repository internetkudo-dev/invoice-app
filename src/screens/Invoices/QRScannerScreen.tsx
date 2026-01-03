import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, QrCode } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/common';

interface QRScannerScreenProps {
    navigation: any;
    route: any;
}

export function QRScannerScreen({ navigation, route }: QRScannerScreenProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const mode = route.params?.mode || 'invoice'; // 'invoice' or 'generic'

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);

        if (mode === 'generic') {
            const returnTo = route.params?.returnTo;
            if (returnTo === 'ProductForm') {
                navigation.navigate('MainTabs', {
                    screen: 'Management',
                    params: {
                        screen: 'ProductForm',
                        params: {
                            scannedSKU: data,
                            restoredData: route.params?.currentData
                        },
                        merge: true,
                    },
                    merge: true,
                });
            } else {
                navigation.navigate(returnTo || 'MainTabs', {
                    scannedSKU: data,
                    restoredData: route.params?.currentData,
                    merge: true
                });
            }
            return;
        }

        // Expected format: INVOICE:001-02-01-2026
        if (data.startsWith('INVOICE:')) {
            const invoiceNumber = data.replace('INVOICE:', '');

            // Find invoice by number
            const { data: invoice, error } = await supabase
                .from('invoices')
                .select('id')
                .eq('user_id', user?.id)
                .eq('invoice_number', invoiceNumber)
                .single();

            if (invoice) {
                navigation.navigate('MainTabs', {
                    screen: 'InvoicesTab',
                    params: {
                        screen: 'InvoiceDetail',
                        params: { invoiceId: invoice.id }
                    }
                });
            } else {
                Alert.alert('Not Found', `Invoice ${invoiceNumber} not found`, [
                    { text: 'Scan Again', onPress: () => setScanned(false) },
                ]);
            }
        } else {
            Alert.alert('Invalid QR Code', 'This is not a valid invoice QR code', [
                { text: 'Scan Again', onPress: () => setScanned(false) },
            ]);
        }
    };

    if (!permission) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                <Text style={[styles.text, { color: textColor }]}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                <View style={styles.permissionBox}>
                    <QrCode color="#818cf8" size={64} />
                    <Text style={[styles.title, { color: textColor }]}>Camera Permission Required</Text>
                    <Text style={[styles.text, { color: '#94a3b8' }]}>
                        We need access to your camera to scan invoice QR codes
                    </Text>
                    <Button title="Grant Permission" onPress={requestPermission} style={styles.button} />
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (<View style={styles.container}>
        <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{
                barcodeTypes: mode === 'invoice' ? ['qr'] : ['qr', 'ean13', 'ean8', 'code128', 'upc_a', 'upc_e']
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={styles.overlay}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{mode === 'invoice' ? 'Scan Invoice QR' : 'Scan Barcode'}</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={styles.scanArea}>
                <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                </View>
            </View>
            <View style={styles.footer}>
                <Text style={styles.instruction}>
                    Position the code within the frame to scan
                </Text>
                {scanned && (
                    <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
                        <Text style={styles.rescanText}>Tap to Scan Again</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    </View>);
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    title: { fontSize: 22, fontWeight: 'bold', marginTop: 24, marginBottom: 12, textAlign: 'center' },
    text: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
    button: { marginTop: 24, width: '100%' },
    cancelText: { color: '#818cf8', marginTop: 16, fontSize: 16 },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16 },
    backButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
    scanArea: { alignItems: 'center', justifyContent: 'center' },
    scanFrame: { width: 280, height: 280, position: 'relative' },
    corner: { position: 'absolute', width: 40, height: 40, borderColor: '#818cf8', borderWidth: 4 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    footer: { alignItems: 'center', paddingBottom: 80, paddingHorizontal: 32 },
    instruction: { color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center' },
    rescanButton: { marginTop: 20, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
    rescanText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
