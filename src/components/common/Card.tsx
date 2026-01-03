import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
    const { isDark } = useTheme();

    const getVariantStyle = () => {
        switch (variant) {
            case 'elevated':
                return isDark ? styles.elevatedDark : styles.elevatedLight;
            case 'outlined':
                return isDark ? styles.outlinedDark : styles.outlinedLight;
            default:
                return isDark ? styles.cardDark : styles.cardLight;
        }
    };

    return (
        <View style={[styles.card, getVariantStyle(), style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
    },
    cardDark: {
        backgroundColor: '#1e293b',
        borderColor: 'rgba(255,255,255,0.05)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    cardLight: {
        backgroundColor: '#ffffff',
        borderColor: 'rgba(0,0,0,0.05)',
        ...Platform.select({
            ios: {
                shadowColor: '#64748b',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    elevatedDark: {
        backgroundColor: '#1e293b',
        borderColor: 'transparent',
        ...Platform.select({
            ios: {
                shadowColor: '#6366f1',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    elevatedLight: {
        backgroundColor: '#ffffff',
        borderColor: 'transparent',
        ...Platform.select({
            ios: {
                shadowColor: '#6366f1',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    outlinedDark: {
        backgroundColor: 'transparent',
        borderColor: '#334155',
        borderWidth: 1.5,
    },
    outlinedLight: {
        backgroundColor: 'transparent',
        borderColor: '#e2e8f0',
        borderWidth: 1.5,
    },
});
