import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import {
    LayoutDashboard,
    FileText,
    Users,
    Package,
    Settings,
} from 'lucide-react-native';

import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { SignInScreen } from '../screens/Auth/SignInScreen';
import { SignUpScreen } from '../screens/Auth/SignUpScreen';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { InvoicesScreen } from '../screens/Invoices/InvoicesScreen';
import { InvoiceFormScreen } from '../screens/Invoices/InvoiceFormScreen';
import { InvoiceDetailScreen } from '../screens/Invoices/InvoiceDetailScreen';
import { QRScannerScreen } from '../screens/Invoices/QRScannerScreen';
import { ClientsScreen } from '../screens/Clients/ClientsScreen';
import { ClientFormScreen } from '../screens/Clients/ClientFormScreen';
import { ProductsScreen } from '../screens/Products/ProductsScreen';
import { ProductFormScreen } from '../screens/Products/ProductFormScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        primary: '#818cf8',
        background: '#0f172a',
        card: '#1e293b',
        text: '#ffffff',
        border: '#334155',
        notification: '#818cf8',
    },
};

const CustomLightTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#6366f1',
        background: '#f8fafc',
        card: '#ffffff',
        text: '#1e293b',
        border: '#e2e8f0',
        notification: '#6366f1',
    },
};

function InvoicesStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="InvoicesList" component={InvoicesScreen} />
            <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} />
            <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        </Stack.Navigator>
    );
}

function ClientsStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ClientsList" component={ClientsScreen} />
            <Stack.Screen name="ClientForm" component={ClientFormScreen} />
        </Stack.Navigator>
    );
}

function ProductsStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProductsList" component={ProductsScreen} />
            <Stack.Screen name="ProductForm" component={ProductFormScreen} />
        </Stack.Navigator>
    );
}

function MainTabs() {
    const { isDark } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderTopColor: isDark ? '#334155' : '#e2e8f0',
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    paddingTop: 8,
                    height: Platform.OS === 'ios' ? 88 : 70,
                    paddingHorizontal: 8,
                },
                tabBarActiveTintColor: '#818cf8',
                tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                    marginTop: 2,
                },
                tabBarIconStyle: {
                    marginTop: 4,
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <LayoutDashboard color={color} size={22} />
                    ),
                }}
            />
            <Tab.Screen
                name="Invoices"
                component={InvoicesStack}
                options={{
                    tabBarIcon: ({ color }) => (
                        <FileText color={color} size={22} />
                    ),
                }}
            />
            <Tab.Screen
                name="Clients"
                component={ClientsStack}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Users color={color} size={22} />
                    ),
                }}
            />
            <Tab.Screen
                name="Products"
                component={ProductsStack}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Package color={color} size={22} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Settings color={color} size={22} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SignIn">
                {(props) => (
                    <SignInScreen
                        onNavigateToSignUp={() => props.navigation.navigate('SignUp')}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="SignUp">
                {(props) => (
                    <SignUpScreen
                        onNavigateToSignIn={() => props.navigation.navigate('SignIn')}
                    />
                )}
            </Stack.Screen>
        </Stack.Navigator>
    );
}

export function AppNavigator() {
    const { user, loading } = useAuth();
    const { isDark } = useTheme();

    if (loading) {
        return (
            <View style={[styles.loading, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
                <ActivityIndicator size="large" color="#818cf8" />
            </View>
        );
    }

    return (
        <NavigationContainer theme={isDark ? CustomDarkTheme : CustomLightTheme}>
            {user ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
