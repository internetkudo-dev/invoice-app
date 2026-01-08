import React, { useRef, useState, useCallback } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { X, Check, Trash2 } from 'lucide-react-native';

interface SignaturePadModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (signature: string) => void;
    primaryColor: string;
}

export function SignaturePadModal({ visible, onClose, onSave, primaryColor }: SignaturePadModalProps) {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [layout, setLayout] = useState({ width: 300, height: 200 });
    const isDrawingRef = useRef(false);

    // Reset state when modal opens
    const handleModalShow = useCallback(() => {
        setPaths([]);
        setCurrentPath('');
        isDrawingRef.current = false;
    }, []);

    const handleTouchStart = useCallback((event: GestureResponderEvent) => {
        event.stopPropagation();
        const { locationX, locationY } = event.nativeEvent;
        isDrawingRef.current = true;
        setCurrentPath(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
    }, []);

    const handleTouchMove = useCallback((event: GestureResponderEvent) => {
        if (!isDrawingRef.current) return;
        event.stopPropagation();
        const { locationX, locationY } = event.nativeEvent;
        setCurrentPath(prev => prev + ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        setCurrentPath(prev => {
            if (prev && prev.length > 5) {
                setPaths(paths => [...paths, prev]);
            }
            return '';
        });
    }, []);

    const handleClear = useCallback(() => {
        setPaths([]);
        setCurrentPath('');
        isDrawingRef.current = false;
    }, []);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
            setLayout({ width, height });
        }
    }, []);

    const handleSave = useCallback(() => {
        if (paths.length === 0) return;

        // Generate SVG string
        const allPaths = paths.join(' ');
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" fill="none"><path d="${allPaths}" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        // Encode to base64 data URI
        const base64 = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;

        onSave(base64);
        onClose();
        handleClear();
    }, [paths, layout, onSave, onClose, handleClear]);

    const handleClose = useCallback(() => {
        handleClear();
        onClose();
    }, [onClose, handleClear]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onShow={handleModalShow}
        >
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Sign Here</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <X color="#64748b" size={24} />
                        </TouchableOpacity>
                    </View>

                    <View
                        style={styles.padContainer}
                        onLayout={handleLayout}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderGrant={handleTouchStart}
                        onResponderMove={handleTouchMove}
                        onResponderRelease={handleTouchEnd}
                        onResponderTerminate={handleTouchEnd}
                    >
                        <Svg height="100%" width="100%">
                            {paths.map((d, i) => (
                                <Path
                                    key={i}
                                    d={d}
                                    stroke="black"
                                    strokeWidth={3}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ))}
                            {currentPath.length > 0 && (
                                <Path
                                    d={currentPath}
                                    stroke="black"
                                    strokeWidth={3}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                        </Svg>
                        {paths.length === 0 && currentPath === '' && (
                            <Text style={styles.placeholder}>Draw your signature here</Text>
                        )}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                            <Trash2 color="#ef4444" size={20} />
                            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: primaryColor }, paths.length === 0 && { opacity: 0.5 }]}
                            onPress={handleSave}
                            disabled={paths.length === 0}
                        >
                            <Check color="#fff" size={20} />
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Signature</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    content: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 16,
        padding: 16,
        height: 400
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b'
    },
    padContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    placeholder: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 16,
        marginTop: -10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8
    }
});
