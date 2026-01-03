import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InvoiceStatus } from '../../types';

interface StatusBadgeProps {
    status: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8' },
    sent: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
    paid: { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981' },
    overdue: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
    // Contract statuses
    signed: { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981' },
    active: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
    terminated: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
};

const defaultColor = { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8' };

export function StatusBadge({ status }: StatusBadgeProps) {
    const colors = statusColors[status] || defaultColor;

    return (
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.text, { color: colors.text }]}>
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
});
