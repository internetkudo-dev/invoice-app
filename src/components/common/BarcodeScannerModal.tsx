import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Zap, ZapOff } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';

interface BarcodeScannerModalProps {
    visible: boolean;
    onClose: () => void;
    onScanned: (data: string) => void;
}

export function BarcodeScannerModal({ visible, onClose, onScanned }: BarcodeScannerModalProps) {
    const { isDark } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [torch, setTorch] = useState(false);

    if (!visible) return null;

    if (!permission?.granted) {
        return (
            <Modal visible={visible} animationType="slide">
                <View style={[styles.permissionContainer, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
                    <Text style={[styles.title, { color: isDark ? '#fff' : '#1e293b' }]}>Camera Permission</Text>
                    <Text style={styles.text}>We need your camera to scan barcodes.</Text>
                    <Button title="Grant Permission" onPress={requestPermission} style={styles.btn} />
                    <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
                        <Text style={{ color: '#6366f1' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.container}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    barcodeScannerSettings={{
                        barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar'],
                    }}
                    onBarcodeScanned={({ data }) => {
                        onScanned(data);
                        onClose();
                    }}
                    enableTorch={torch}
                />

                <View style={styles.overlay}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                            <X color="#fff" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Scan Barcode</Text>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setTorch(!torch)}>
                            {torch ? <ZapOff color="#fff" size={24} /> : <Zap color="#fff" size={24} />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.scanArea}>
                        <View style={styles.scanFrame} />
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.hint}>Align barcode within the frame</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    text: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
    btn: { width: '100%' },
    overlay: { flex: 1, justifyContent: 'space-between', paddingVertical: 60 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
    iconBtn: { padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
    scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: 280, height: 180, borderWidth: 2, borderColor: '#6366f1', borderRadius: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
    footer: { alignItems: 'center', paddingBottom: 40 },
    hint: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});
