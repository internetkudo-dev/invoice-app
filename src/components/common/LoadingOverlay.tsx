import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, Text } from 'react-native';

interface LoadingOverlayProps {
    visible: boolean;
    text?: string;
}

export const LoadingOverlay = ({ visible, text = 'Loading...' }: LoadingOverlayProps) => {
    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.container}>
                <View style={styles.content}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    {text && <Text style={styles.text}>{text}</Text>}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        gap: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    text: {
        color: '#1e293b',
        fontSize: 14,
        fontWeight: '500',
    },
});
