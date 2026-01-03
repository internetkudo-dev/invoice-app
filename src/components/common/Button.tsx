import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
} from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    size?: 'small' | 'medium' | 'large';
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    size = 'medium',
}: ButtonProps) {
    const getButtonStyle = () => {
        switch (variant) {
            case 'secondary':
                return styles.secondary;
            case 'danger':
                return styles.danger;
            default:
                return styles.primary;
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'secondary':
                return styles.secondaryText;
            default:
                return styles.primaryText;
        }
    };

    const getSizeStyle = () => {
        switch (size) {
            case 'small':
                return styles.small;
            case 'large':
                return styles.large;
            default:
                return styles.medium;
        }
    };

    return (
        <TouchableOpacity
            style={[styles.button, getButtonStyle(), getSizeStyle(), disabled && styles.disabled, style]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'secondary' ? '#818cf8' : '#fff'} size="small" />
            ) : (
                <Text style={[styles.text, getTextStyle()]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    small: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        minHeight: 36,
    },
    medium: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        minHeight: 48,
    },
    large: {
        paddingVertical: 18,
        paddingHorizontal: 24,
        minHeight: 56,
    },
    primary: {
        backgroundColor: '#6366f1',
    },
    secondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#334155',
    },
    danger: {
        backgroundColor: '#ef4444',
    },
    disabled: {
        opacity: 0.6,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
    primaryText: {
        color: '#fff',
    },
    secondaryText: {
        color: '#818cf8',
    },
});
