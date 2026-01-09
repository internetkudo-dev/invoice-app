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
    const { isDark, primaryColor } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const mode = route.params?.mode || 'invoice'; // 'invoice' or 'generic'

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

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
                    <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}>
                        <QrCode color={primaryColor} size={64} />
                    </View>
                    <Text style={[styles.title, { color: textColor }]}>Camera Access Needed</Text>
                    <Text style={[styles.text, { color: mutedColor }]}>
                        We need access to your camera to scan invoice QR codes and product barcodes.
                    </Text>
                    <Button title="Grant Permission" onPress={requestPermission} style={styles.button} />
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={[styles.cancelText, { color: primaryColor }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
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
                        <View style={[styles.corner, styles.cornerTL, { borderColor: primaryColor }]} />
                        <View style={[styles.corner, styles.cornerTR, { borderColor: primaryColor }]} />
                        <View style={[styles.corner, styles.cornerBL, { borderColor: primaryColor }]} />
                        <View style={[styles.corner, styles.cornerBR, { borderColor: primaryColor }]} />
                    </View>
                </View>
                <View style={styles.footer}>
                    <Text style={styles.instruction}>
                        Position the code within the frame to scan automatically
                    </Text>
                    {scanned && (
                        <TouchableOpacity
                            style={[styles.rescanButton, { backgroundColor: primaryColor }]}
                            onPress={() => setScanned(false)}
                        >
                            <Text style={styles.rescanText}>Tap to Scan Again</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // Permission
    permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    iconContainer: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
    text: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
    button: { width: '100%', minHeight: 50 },
    cancelText: { marginTop: 24, fontSize: 16, fontWeight: '600' },

    // Camera Overlay
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
    backButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

    scanArea: { alignItems: 'center', justifyContent: 'center' },
    scanFrame: { width: 280, height: 280, position: 'relative' },
    corner: { position: 'absolute', width: 40, height: 40, borderWidth: 4, borderRadius: 2 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

    footer: { alignItems: 'center', paddingBottom: 80, paddingHorizontal: 32 },
    instruction: { color: 'rgba(255,255,255,0.9)', fontSize: 16, textAlign: 'center', fontWeight: '500' },
    rescanButton: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
    rescanText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
