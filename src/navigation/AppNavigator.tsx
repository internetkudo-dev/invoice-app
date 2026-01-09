import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import {
    LayoutDashboard,
    FileText,
    Settings,
    Briefcase,
    ShieldAlert,
    Fingerprint,
    Wallet,
    Users,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../api/supabase';
import { SignInScreen } from '../screens/Auth/SignInScreen';
import { SignUpScreen } from '../screens/Auth/SignUpScreen';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { InvoicesScreen } from '../screens/Invoices/InvoicesScreen';
import { InvoiceFormScreen } from '../screens/Invoices/InvoiceFormScreen';
import { InvoiceDetailScreen } from '../screens/Invoices/InvoiceDetailScreen';
import { QRScannerScreen } from '../screens/Invoices/QRScannerScreen';
import { ManagementScreen } from '../screens/Management/ManagementScreen';
import { ClientFormScreen } from '../screens/Clients/ClientFormScreen';
import { ProductFormScreen } from '../screens/Products/ProductFormScreen';
import { ContractFormScreen } from '../screens/Contracts/ContractFormScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { TemplateEditorScreen } from '../screens/Settings/TemplateEditorScreen';
import { ExpenseFormScreen } from '../screens/Expenses/ExpenseFormScreen';
import { Button } from '../components/common';
import { t } from '../i18n';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

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

function BiometricOverlay({ onAuthenticated }: { onAuthenticated: () => void }) {
    const { isDark } = useTheme();
    const [authenticating, setAuthenticating] = useState(false);

    const authenticate = async () => {
        setAuthenticating(true);
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock Invoice App',
            fallbackLabel: 'Use Passcode',
        });
        setAuthenticating(false);
        if (result.success) onAuthenticated();
    };

    useEffect(() => {
        authenticate();
    }, []);

    return (
        <View style={[styles.lockContainer, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
            <View style={styles.lockIconContainer}>
                <ShieldAlert color="#818cf8" size={64} />
            </View>
            <Text style={[styles.lockTitle, { color: isDark ? '#fff' : '#1e293b' }]}>App Locked</Text>
            <Text style={[styles.lockText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                Please verify your identity to continue.
            </Text>
            <Button
                title={authenticating ? "Authenticating..." : "Unlock with Biometrics"}
                onPress={authenticate}
                icon={Fingerprint}
                style={{ width: '80%', marginTop: 24 }}
            />
        </View>
    );
}

import { ContractDetailScreen } from '../screens/Contracts/ContractDetailScreen';
import { FaturatScreen } from '../screens/Invoices/FaturatScreen';
import { AllInvoicesScreen } from '../screens/Invoices/AllInvoicesScreen';
import { PaymentFormScreen, PaymentsListScreen } from '../screens/Payments';
import { CustomerLedgerScreen } from '../screens/Reports/CustomerLedgerScreen';
import { VendorLedgerScreen } from '../screens/Reports/VendorLedgerScreen';
import { VendorFormScreen, VendorsScreen, SupplierBillFormScreen, SupplierBillsListScreen, ScanBillScreen } from '../screens/Vendors';
import { VendorPaymentFormScreen, VendorPaymentsListScreen } from '../screens/VendorPayments';

function InvoicesStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="FaturatMain" component={FaturatScreen} />
            <Stack.Screen name="InvoicesList" component={InvoicesScreen} />
            <Stack.Screen name="AllInvoices" component={AllInvoicesScreen} />
            <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} />
            <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
            <Stack.Screen name="ContractForm" component={ContractFormScreen} />
            <Stack.Screen name="ContractDetail" component={ContractDetailScreen} />
            <Stack.Screen name="ReportPreview" component={ReportPreviewScreen} />
            <Stack.Screen name="PaymentForm" component={PaymentFormScreen} />
            <Stack.Screen name="PaymentsList" component={PaymentsListScreen} />
            <Stack.Screen name="CustomerLedger" component={CustomerLedgerScreen} />
            <Stack.Screen name="VendorLedger" component={VendorLedgerScreen} />
            <Stack.Screen name="VendorForm" component={VendorFormScreen} />
            <Stack.Screen name="VendorsList" component={VendorsScreen} />
            <Stack.Screen name="VendorPaymentForm" component={VendorPaymentFormScreen} />
            <Stack.Screen name="VendorPaymentsList" component={VendorPaymentsListScreen} />
            <Stack.Screen name="SupplierBillForm" component={SupplierBillFormScreen} />
            <Stack.Screen name="SupplierBillsList" component={SupplierBillsListScreen} />
            <Stack.Screen name="ScanBill" component={ScanBillScreen} />
            <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} />
        </Stack.Navigator>
    );
}

import { ReportPreviewScreen } from '../screens/Reports/ReportPreviewScreen';

import { ManagementDashboardScreen } from '../screens/Management/ManagementDashboardScreen';

import { ClientsScreen } from '../screens/Clients/ClientsScreen';
import { ProductsScreen } from '../screens/Products/ProductsScreen';
import { ExpensesScreen } from '../screens/Expenses/ExpensesScreen';

import { EmployeeDirectoryScreen } from '../screens/Employees/EmployeeDirectoryScreen';
import { EmployeeFormScreen } from '../screens/Employees/EmployeeFormScreen';
import { EmployeeVaultScreen } from '../screens/Employees/EmployeeVaultScreen';
import { AttendanceScreen } from '../screens/Time/AttendanceScreen';
import { LeaveRequestScreen } from '../screens/Time/LeaveRequestScreen';
import { ScheduleScreen } from '../screens/Time/ScheduleScreen';
import { ShiftFormScreen } from '../screens/Time/ShiftFormScreen';
import { PayrollDashboardScreen } from '../screens/Payroll/PayrollDashboardScreen';
import { PayrollDetailScreen } from '../screens/Payroll/PayrollDetailScreen';
import { ComplianceScreen } from '../screens/Payroll/ComplianceScreen';
import { HRDashboardScreen, JoinRequestsScreen } from '../screens/HR';

function ManagementStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ManagementTabs" component={ManagementScreen} />
            <Stack.Screen name="ManagementDashboard" component={ManagementDashboardScreen} />

            {/* Legacy Operations */}
            <Stack.Screen name="ClientsList" component={ClientsScreen} />
            <Stack.Screen name="ProductsList" component={ProductsScreen} />
            <Stack.Screen name="VendorsList" component={VendorsScreen} />
            <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} />
            <Stack.Screen name="ExpensesList" component={ExpensesScreen} />

            {/* Forms */}
            <Stack.Screen name="ClientForm" component={ClientFormScreen} />
            <Stack.Screen name="ProductForm" component={ProductFormScreen} />
            <Stack.Screen name="VendorForm" component={VendorFormScreen} />
            <Stack.Screen name="VendorPaymentForm" component={VendorPaymentFormScreen} />

            {/* Ledgers */}
            <Stack.Screen name="CustomerLedger" component={CustomerLedgerScreen} />
            <Stack.Screen name="VendorLedger" component={VendorLedgerScreen} />

            {/* HR Core */}
            <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
            <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
            <Stack.Screen name="EmployeeVault" component={EmployeeVaultScreen} />

            {/* Time */}
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="LeaveRequests" component={LeaveRequestScreen} />
            <Stack.Screen name="Schedule" component={ScheduleScreen} />

            {/* Finance */}
            <Stack.Screen name="Payroll" component={PayrollDashboardScreen} />
            <Stack.Screen name="Compliance" component={ComplianceScreen} />
        </Stack.Navigator>
    );
}

import { ExpensesDashboardScreen } from '../screens/Expenses/ExpensesDashboardScreen';
import { ExpensesListScreen } from '../screens/Expenses/ExpensesListScreen';

function ExpensesStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ExpensesDashboard" component={ExpensesDashboardScreen} />
            <Stack.Screen name="ExpensesList" component={ExpensesListScreen} />
            <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} />
        </Stack.Navigator>
    );
}

// HR Stack - Standalone HR module
function HRStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HRDashboard" component={HRDashboardScreen} />
            <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
            <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
            <Stack.Screen name="EmployeeVault" component={EmployeeVaultScreen} />
            <Stack.Screen name="JoinRequests" component={JoinRequestsScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="LeaveRequests" component={LeaveRequestScreen} />
            <Stack.Screen name="Schedule" component={ScheduleScreen} />
            <Stack.Screen name="ShiftForm" component={ShiftFormScreen} />
            <Stack.Screen name="Payroll" component={PayrollDashboardScreen} />
            <Stack.Screen name="PayrollDetail" component={PayrollDetailScreen} />
            <Stack.Screen name="Compliance" component={ComplianceScreen} />
        </Stack.Navigator>
    );
}

function MainTabs() {
    const { isDark, language, primaryColor } = useTheme();

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
                tabBarActiveTintColor: primaryColor,
                tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
                tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
                tabBarIconStyle: { marginTop: 4 },
            }}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} />, tabBarLabel: t('dashboard', language) }} />
            <Tab.Screen name="InvoicesTab" component={InvoicesStack} options={{ tabBarIcon: ({ color }) => <FileText color={color} size={22} />, tabBarLabel: t('invoices', language) }} />
            <Tab.Screen name="Management" component={ManagementStack} options={{ tabBarIcon: ({ color }) => <Briefcase color={color} size={22} />, tabBarLabel: t('management', language) }} />
            <Tab.Screen name="HRTab" component={HRStack} options={{ tabBarIcon: ({ color }) => <Users color={color} size={22} />, tabBarLabel: 'HR' }} />
            {/* ExpensesTab hidden per user request */}
        </Tab.Navigator>
    );
}

function RootStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            <Stack.Screen name="Settings" component={SettingsStack} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
    );
}

import { ContractTemplatesScreen } from '../screens/Settings/Contracts/ContractTemplatesScreen';
import { ContractTemplateEditorScreen } from '../screens/Settings/Contracts/ContractTemplateEditorScreen';
import { InvoiceTemplateSettingsScreen } from '../screens/Settings/Templates/InvoiceTemplateSettingsScreen';
import { PaymentIntegrationsScreen } from '../screens/Settings/PaymentIntegrationsScreen';
import { StripeDashboardScreen } from '../screens/Settings/StripeDashboardScreen';
import { AdvancedSettingsScreen } from '../screens/Settings/AdvancedSettingsScreen';

function SettingsStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SettingsMain" component={SettingsScreen} />
            <Stack.Screen name="TemplateEditor" component={TemplateEditorScreen} />
            <Stack.Screen name="ContractTemplates" component={ContractTemplatesScreen} />
            <Stack.Screen name="ContractTemplateEditor" component={ContractTemplateEditorScreen} />
            <Stack.Screen name="InvoiceTemplateSettings" component={InvoiceTemplateSettingsScreen} />
            <Stack.Screen name="PaymentIntegrations" component={PaymentIntegrationsScreen} />
            <Stack.Screen name="StripeDashboard" component={StripeDashboardScreen} />
            <Stack.Screen name="ManageCompanies" component={ManageCompaniesScreen} />
            <Stack.Screen name="AdvancedSettings" component={AdvancedSettingsScreen} />
        </Stack.Navigator>
    );
}

import { ManageCompaniesScreen } from '../screens/Settings/ManageCompaniesScreen';
import { JoinTeamScreen } from '../screens/Auth/JoinTeamScreen';

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SignIn">
                {(props: any) => (
                    <SignInScreen
                        onNavigateToSignUp={() => props.navigation.navigate('SignUp')}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="SignUp">
                {(props: any) => (
                    <SignUpScreen
                        onNavigateToSignIn={() => props.navigation.navigate('SignIn')}
                        navigation={props.navigation}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="JoinTeam" component={JoinTeamScreen} />
        </Stack.Navigator>
    );
}

export function AppNavigator() {
    const { user, loading: authLoading } = useAuth();
    const { isDark } = useTheme();
    const [isLocked, setIsLocked] = useState(false);
    const [checkingLock, setCheckingLock] = useState(true);

    useEffect(() => {
        if (user) {
            checkBiometricSetting();
        } else {
            setIsLocked(false);
            setCheckingLock(false);
        }
    }, [user]);

    const checkBiometricSetting = async () => {
        try {
            const { data } = await supabase.from('profiles').select('biometric_enabled').eq('id', user?.id).single();
            if (data?.biometric_enabled) {
                setIsLocked(true);
            }
        } catch (error) {
            console.error('Error checking biometrics:', error);
        } finally {
            setCheckingLock(false);
        }
    };

    if (authLoading || checkingLock) {
        return (
            <View style={[styles.loading, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
                <ActivityIndicator size="large" color="#818cf8" />
            </View>
        );
    }

    if (user && isLocked) {
        return (
            <NavigationContainer theme={isDark ? CustomDarkTheme : CustomLightTheme}>
                <BiometricOverlay onAuthenticated={() => setIsLocked(false)} />
            </NavigationContainer>
        );
    }

    return (
        <NavigationContainer theme={isDark ? CustomDarkTheme : CustomLightTheme}>
            {user ? <RootStack /> : <AuthStack />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    lockContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    lockIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(129, 140, 248, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    lockTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    lockText: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 }
});
