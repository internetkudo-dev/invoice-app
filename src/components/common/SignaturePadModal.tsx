import React, { useRef, useState } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, PanResponder, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { X, Check, Trash2 } from 'lucide-react-native';

interface SignaturePadModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (signature: string) => void;
    primaryColor: string;
}

export function SignaturePadModal({ visible, onClose, onSave, primaryColor }: SignaturePadModalProps) {
    const [path, setPath] = useState<string>('');
    const [paths, setPaths] = useState<string[]>([]);
    const [layout, setLayout] = useState({ width: 0, height: 0 });

    // Convert paths to SVG path string format
    const currentPath = useRef<string>('');

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                currentPath.current = `M${locationX.toFixed(0)},${locationY.toFixed(0)}`;
                setPath(currentPath.current);
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                const newPoint = `L${locationX.toFixed(0)},${locationY.toFixed(0)}`;
                currentPath.current += newPoint;
                setPath(currentPath.current);
            },
            onPanResponderRelease: () => {
                if (currentPath.current) {
                    setPaths(prev => [...prev, currentPath.current]);
                    setPath('');
                    currentPath.current = '';
                }
            },
            onPanResponderTerminate: () => {
                if (currentPath.current) {
                    setPaths(prev => [...prev, currentPath.current]);
                    setPath('');
                    currentPath.current = '';
                }
            },
        })
    ).current;

    const handleClear = () => {
        setPaths([]);
        setPath('');
        currentPath.current = '';
    };

    const handleSave = () => {
        if (paths.length === 0) return;

        // Construct a full SVG string for saving as a data URI (simplified)
        // In a real app, you might capture the view as an image using view-shot
        // For now, let's save it as a data URI of an SVG.
        // NOTE: React Native Image component usually can't render SVG data URIs directly without some bridging.
        // A better approach for mostly-offline apps without heavy deps is unfortunately complex.
        // However, for PDF generation (expo-print), SVG strings often work or need conversion.
        // Given constraints, let's try to convert to a base64 png if possible or return the SVG string to render.
        // Wait, standard Image component doesn't support SVG string.
        // We will assume 'expo-drawing' or similar isn't here. 
        // We will return a special prefix "SVG:" and handle rendering separately or...
        // Actually, the simplest way is to pass the paths and render them in a preview.
        // But the user wants an image url for the PDF.
        // We can use a trick: save the SVG as a file and return the URI? No, needs conversion.
        // Let's use a very basic approximation: generate an SVG string data URI.
        // "data:image/svg+xml;base64,..."

        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" fill="none">
            <path d="${paths.join(' ')}" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;

        // Encode to base64
        const base64 = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
        // Note: react-native-svg should render this if we use SvgXml.
        // But passing it to the PDF builder needs to be checked.
        // If PDF builder assumes <img src="...">, standard web browsers support svg data uris.

        onSave(base64);
        onClose();
        handleClear();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Sign Here</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#64748b" size={24} />
                        </TouchableOpacity>
                    </View>

                    <View
                        style={styles.padContainer}
                        {...panResponder.panHandlers}
                        onLayout={(e) => setLayout(e.nativeEvent.layout)}
                    >
                        <Svg height="100%" width="100%">
                            {paths.map((d, i) => (
                                <Path key={i} d={d} stroke="black" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            ))}
                            <Path d={path} stroke="black" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                        {paths.length === 0 && path === '' && (
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
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    },
    placeholder: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -70 }, { translateY: -10 }],
        color: '#cbd5e1',
        pointerEvents: 'none'
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
