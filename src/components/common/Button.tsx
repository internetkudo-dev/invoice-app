import React, { ReactNode } from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    View,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    size?: 'small' | 'medium' | 'large';
    icon?: any;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    size = 'medium',
    icon: Icon,
}: ButtonProps) {
    const { primaryColor } = useTheme();

    const getButtonStyle = () => {
        switch (variant) {
            case 'secondary':
                return { backgroundColor: `${primaryColor}20` };
            case 'danger':
                return styles.danger;
            case 'outline':
                return [styles.outline, { borderColor: primaryColor }];
            case 'ghost':
                return styles.ghost;
            default:
                return { backgroundColor: primaryColor };
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'secondary':
                return { color: primaryColor };
            case 'outline':
                return { color: primaryColor };
            case 'ghost':
                return { color: primaryColor };
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

    const iconColor = getTextStyle().color;

    return (
        <TouchableOpacity
            style={[styles.button, getButtonStyle(), getSizeStyle(), disabled && styles.disabled, style]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : primaryColor} size="small" />
            ) : (
                <View style={styles.content}>
                    {Icon && <Icon size={size === 'small' ? 14 : 18} color={iconColor} />}
                    <Text style={[styles.text, getTextStyle(), { fontSize: size === 'small' ? 13 : 15 }]}>{title}</Text>
                </View>
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
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
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
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: '#ef4444',
    },
    disabled: {
        opacity: 0.6,
    },
    text: {
        fontWeight: 'bold',
    },
    primaryText: {
        color: '#fff',
    },
});
