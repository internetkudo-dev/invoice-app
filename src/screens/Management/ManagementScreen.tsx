import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ClientsScreen } from '../Clients/ClientsScreen';
import { ProductsScreen } from '../Products/ProductsScreen';
import { ExpensesScreen } from '../Expenses/ExpensesScreen';
import { Users, Package, Receipt } from 'lucide-react-native';
import { t } from '../../i18n';

export function ManagementScreen({ navigation, route }: any) {
    const { isDark, language } = useTheme();
    const [activeTab, setActiveTab] = useState<'clients' | 'products' | 'expenses'>('clients');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        if (route.params?.activeTab) {
            setActiveTab(route.params.activeTab as any);
        }
    }, [route.params]);

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        { backgroundColor: cardBg },
                        activeTab === 'clients' && styles.activeTab,
                    ]}
                    onPress={() => setActiveTab('clients')}
                >
                    <Users color={activeTab === 'clients' ? '#fff' : '#818cf8'} size={20} />
                    <Text
                        style={[
                            styles.tabText,
                            { color: activeTab === 'clients' ? '#fff' : '#94a3b8' },
                        ]}
                    >
                        {t('clients', language)}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tab,
                        { backgroundColor: cardBg },
                        activeTab === 'products' && styles.activeTab,
                    ]}
                    onPress={() => setActiveTab('products')}
                >
                    <Package color={activeTab === 'products' ? '#fff' : '#818cf8'} size={20} />
                    <Text
                        style={[
                            styles.tabText,
                            { color: activeTab === 'products' ? '#fff' : '#94a3b8' },
                        ]}
                    >
                        {t('products', language)}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tab,
                        { backgroundColor: cardBg },
                        activeTab === 'expenses' && styles.activeTab,
                    ]}
                    onPress={() => setActiveTab('expenses')}
                >
                    <Receipt color={activeTab === 'expenses' ? '#fff' : '#818cf8'} size={20} />
                    <Text
                        style={[
                            styles.tabText,
                            { color: activeTab === 'expenses' ? '#fff' : '#94a3b8' },
                        ]}
                    >
                        {t('expenses', language)}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {activeTab === 'clients' ? (
                    <ClientsScreen navigation={navigation} />
                ) : activeTab === 'products' ? (
                    <ProductsScreen navigation={navigation} />
                ) : (
                    <ExpensesScreen navigation={navigation} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingTop: 56,
        paddingBottom: 16,
        gap: 8,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: '#334155',
    },
    activeTab: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    tabText: {
        fontWeight: '600',
        fontSize: 13,
    },
    content: {
        flex: 1,
    },
});
