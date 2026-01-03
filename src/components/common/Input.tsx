import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, Animated, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: any;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function Input({ label, error, containerStyle, style, onChangeText, keyboardType, leftIcon, rightIcon, ...props }: InputProps) {
    const { isDark, primaryColor } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const bgColor = isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isFocused ? primaryColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');
    const placeholderColor = isDark ? '#475569' : '#94a3b8';

    const handleChangeText = (text: string) => {
        if (!onChangeText) return;

        // Handle comma to dot conversion for numeric/decimal inputs
        if (keyboardType === 'numeric' || keyboardType === 'decimal-pad') {
            const normalized = text.replace(',', '.');
            onChangeText(normalized);
        } else {
            onChangeText(text);
        }
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[styles.label, { color: labelColor }]}>{label}</Text>}
            <View style={[
                styles.inputContainer,
                { backgroundColor: bgColor, borderColor },
                isFocused && styles.inputFocused,
                error && styles.inputError,
            ]}>
                {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                <TextInput
                    style={[
                        styles.input,
                        { color: textColor },
                        !!leftIcon && { paddingLeft: 0 },
                        !!rightIcon && { paddingRight: 0 },
                        style,
                    ]}
                    placeholderTextColor={placeholderColor}
                    onChangeText={handleChangeText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    keyboardType={keyboardType}
                    {...props}
                />
                {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
            </View>
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
        fontWeight: '600',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 14,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    inputFocused: {
        ...Platform.select({
            ios: {
                shadowColor: '#6366f1',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
        }),
    },
    inputError: {
        borderColor: '#ef4444',
    },
    iconLeft: {
        paddingLeft: 14,
    },
    iconRight: {
        paddingRight: 14,
    },
    error: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 6,
        fontWeight: '500',
    },
});
