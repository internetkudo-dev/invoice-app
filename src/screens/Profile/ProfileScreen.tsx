import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export function ProfileScreen({ navigation }: any) {
    const { isDark } = useTheme();

    useEffect(() => {
        // Redirect to Settings -> SettingsMain
        navigation.replace('Settings', { screen: 'SettingsMain' });
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#6366f1" />
        </View>
    );
}
