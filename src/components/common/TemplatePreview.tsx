import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { TemplateType } from '../../types';

interface TemplatePreviewProps {
    template: TemplateType;
    selected?: boolean;
    isDark?: boolean;
}

const templateStyles: Record<TemplateType, { primary: string; secondary: string; accent: string }> = {
    corporate: { primary: '#000000', secondary: '#333333', accent: '#666666' },
};

const templateNames: Record<TemplateType, string> = {
    corporate: 'Corporate',
};

export function TemplatePreview({ template, selected, isDark }: TemplatePreviewProps) {
    const colors = templateStyles[template];
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = selected ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0');

    return (
        <View style={[styles.container, { backgroundColor: cardBg, borderColor }, selected && styles.selected]}>
            {/* Mini Invoice Preview */}
            <View style={styles.preview}>
                {/* Header */}
                <View style={[styles.previewHeader, { backgroundColor: colors.primary }]}>
                    <View style={styles.previewLogo} />
                    <View style={styles.previewTitle}>
                        <View style={[styles.previewLine, { backgroundColor: '#fff', width: 40 }]} />
                        <View style={[styles.previewLine, { backgroundColor: 'rgba(255,255,255,0.5)', width: 24 }]} />
                    </View>
                </View>

                {/* Content */}
                <View style={styles.previewContent}>
                    {/* Info rows */}
                    <View style={styles.previewRow}>
                        <View style={[styles.previewBox, { backgroundColor: colors.accent + '20' }]} />
                        <View style={[styles.previewBox, { backgroundColor: colors.accent + '20' }]} />
                    </View>

                    {/* Table header */}
                    <View style={[styles.previewTableHeader, { backgroundColor: colors.secondary }]} />

                    {/* Table rows */}
                    <View style={styles.previewTableRow} />
                    <View style={styles.previewTableRow} />
                    <View style={styles.previewTableRow} />

                    {/* Total */}
                    <View style={styles.previewTotal}>
                        <View style={[styles.previewTotalBox, { backgroundColor: colors.primary }]}>
                            <View style={[styles.previewLine, { backgroundColor: '#fff', width: 20 }]} />
                        </View>
                    </View>
                </View>

                {/* QR Code placeholder */}
                <View style={styles.previewQR}>
                    <View style={[styles.qrBox, { borderColor: colors.accent }]} />
                </View>
            </View>

            {/* Template Name */}
            <Text style={[styles.name, { color: isDark ? '#fff' : '#1e293b' }]}>
                {templateNames[template]}
            </Text>

            {selected && (
                <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 140,
        borderRadius: 12,
        padding: 8,
        marginRight: 12,
        borderWidth: 2,
    },
    selected: {
        borderColor: '#6366f1',
    },
    preview: {
        height: 160,
        backgroundColor: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 8,
    },
    previewHeader: {
        height: 32,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        justifyContent: 'space-between',
    },
    previewLogo: {
        width: 16,
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 4,
    },
    previewTitle: {
        alignItems: 'flex-end',
    },
    previewLine: {
        height: 4,
        borderRadius: 2,
        marginBottom: 2,
    },
    previewContent: {
        flex: 1,
        padding: 8,
    },
    previewRow: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 8,
    },
    previewBox: {
        flex: 1,
        height: 20,
        borderRadius: 4,
    },
    previewTableHeader: {
        height: 8,
        borderRadius: 2,
        marginBottom: 4,
    },
    previewTableRow: {
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 2,
        marginBottom: 3,
    },
    previewTotal: {
        alignItems: 'flex-end',
        marginTop: 8,
    },
    previewTotalBox: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignItems: 'center',
    },
    previewQR: {
        position: 'absolute',
        top: 36,
        right: 8,
    },
    qrBox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderRadius: 2,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    checkmark: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        backgroundColor: '#6366f1',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
