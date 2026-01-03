import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
    const { isDark } = useTheme();

    return (
        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    cardDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    cardLight: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
    },
});
