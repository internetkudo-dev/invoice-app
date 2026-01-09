import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Input } from './Input';
import { Button } from './Button';

interface QuickAddModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    onAdd: (data: any) => Promise<void>;
    fields: Array<{
        key: string;
        label: string;
        placeholder?: string;
        keyboardType?: any;
        multiline?: boolean;
    }>;
}

export function QuickAddModal({ visible, onClose, title, onAdd, fields }: QuickAddModalProps) {
    const { isDark, primaryColor } = useTheme();
    const [data, setData] = useState<any>({});
    const [loading, setLoading] = useState(false);

    const bgColor = isDark ? '#1e293b' : '#ffffff';
    const textColor = isDark ? '#fff' : '#1e293b';
    const overlayColor = 'rgba(0,0,0,0.5)';

    const handleAdd = async () => {
        setLoading(true);
        try {
            await onAdd(data);
            setData({});
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableOpacity style={styles.dismiss} onPress={onClose} />
                <View style={[styles.content, { backgroundColor: bgColor }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color={isDark ? '#94a3b8' : '#64748b'} size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
                        {fields.map(field => (
                            <Input
                                key={field.key}
                                label={field.label}
                                placeholder={field.placeholder}
                                value={data[field.key]}
                                onChangeText={(t) => setData({ ...data, [field.key]: t })}
                                keyboardType={field.keyboardType}
                                multiline={field.multiline}
                            />
                        ))}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Button
                            title="Add"
                            onPress={handleAdd}
                            loading={loading}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    dismiss: {
        flex: 1,
    },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    scroll: {
        marginBottom: 24,
    },
    footer: {
        paddingBottom: 24,
    },
});
