import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
    const { isDark } = useTheme();

    const bgColor = isDark ? '#0f172a' : '#f1f5f9';
    const textColor = isDark ? '#fff' : '#1e293b';
    const labelColor = isDark ? '#e2e8f0' : '#475569';
    const borderColor = isDark ? '#334155' : '#cbd5e1';
    const placeholderColor = isDark ? '#64748b' : '#94a3b8';

    return (
        <View style={styles.container}>
            {label && <Text style={[styles.label, { color: labelColor }]}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: bgColor, borderColor, color: textColor },
                    error && styles.inputError,
                    style,
                ]}
                placeholderTextColor={placeholderColor}
                {...props}
            />
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    inputError: {
        borderColor: '#ef4444',
    },
    error: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
    },
});
