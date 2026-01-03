import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: 'light' | 'dark';
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@invoice_app_theme';

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

    useEffect(() => {
        // Load saved theme preference
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (saved) {
                setThemeModeState(saved as ThemeMode);
            }
        } catch (error) {
            console.log('Error loading theme preference:', error);
        }
    };

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch (error) {
            console.log('Error saving theme preference:', error);
        }
    };

    // Calculate actual theme based on mode
    const theme: 'light' | 'dark' =
        themeMode === 'system'
            ? systemColorScheme === 'dark'
                ? 'dark'
                : 'light'
            : themeMode;

    const isDark = theme === 'dark';

    return (
        <ThemeContext.Provider
            value={{
                theme,
                themeMode,
                setThemeMode,
                isDark,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}
