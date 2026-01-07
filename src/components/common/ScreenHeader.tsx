import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
    title,
    subtitle,
    showBack = true,
    onBack,
    rightAction
}) => {
    const { isDark } = useTheme();
    const navigation = useNavigation();

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={[styles.header, { backgroundColor: bgColor }]}>
            <View style={styles.topRow}>
                {showBack && (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ArrowLeft color={textColor} size={24} />
                    </TouchableOpacity>
                )}
                <View style={styles.titleContainer}>
                    {subtitle && (
                        <Text style={[styles.subtitle, { color: mutedColor }]}>
                            {subtitle}
                        </Text>
                    )}
                    <Text style={[styles.title, { color: textColor }]}>
                        {title}
                    </Text>
                </View>
                {rightAction ? (
                    <View style={styles.rightAction}>{rightAction}</View>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        zIndex: 10,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    rightAction: {
        width: 40,
        alignItems: 'flex-end',
    },
    placeholder: {
        width: 40,
    },
});
