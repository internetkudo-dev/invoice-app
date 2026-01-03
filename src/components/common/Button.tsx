import React, { ReactNode } from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    View,
    Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    size?: 'small' | 'medium' | 'large';
    icon?: any;
    fullWidth?: boolean;
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
    fullWidth = true,
}: ButtonProps) {
    const { primaryColor, isDark } = useTheme();

    const getButtonStyle = () => {
        switch (variant) {
            case 'secondary':
                return { backgroundColor: `${primaryColor}15` };
            case 'danger':
                return styles.danger;
            case 'success':
                return styles.success;
            case 'outline':
                return [styles.outline, { borderColor: isDark ? '#334155' : '#e2e8f0' }];
            case 'ghost':
                return styles.ghost;
            default:
                return {
                    backgroundColor: primaryColor,
                    ...Platform.select({
                        ios: {
                            shadowColor: primaryColor,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                        },
                        android: {
                            elevation: 4,
                        },
                    }),
                };
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'secondary':
                return { color: primaryColor };
            case 'outline':
                return { color: isDark ? '#fff' : '#1e293b' };
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
            style={[
                styles.button,
                getButtonStyle(),
                getSizeStyle(),
                disabled && styles.disabled,
                !fullWidth && { alignSelf: 'flex-start' },
                style
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' || variant === 'danger' || variant === 'success' ? '#fff' : primaryColor} size="small" />
            ) : (
                <View style={styles.content}>
                    {Icon && <Icon size={size === 'small' ? 14 : size === 'large' ? 20 : 18} color={iconColor} />}
                    <Text style={[styles.text, getTextStyle(), { fontSize: size === 'small' ? 13 : size === 'large' ? 17 : 15 }]}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    small: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        minHeight: 40,
        borderRadius: 10,
    },
    medium: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        minHeight: 52,
    },
    large: {
        paddingVertical: 18,
        paddingHorizontal: 32,
        minHeight: 60,
        borderRadius: 16,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: '#ef4444',
        ...Platform.select({
            ios: {
                shadowColor: '#ef4444',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    success: {
        backgroundColor: '#10b981',
        ...Platform.select({
            ios: {
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    primaryText: {
        color: '#fff',
    },
});
