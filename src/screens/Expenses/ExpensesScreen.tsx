import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    StyleSheet,
    TextInput,
    ScrollView,
} from 'react-native';
import { Trash2, Search, X, Plus, Filter, Calendar, DollarSign, Tag, TrendingUp, TrendingDown, Scale } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, FAB } from '../../components/common';
import { Expense, ExpenseCategory } from '../../types';
import { formatCurrency } from '../../utils/format';
import { t } from '../../i18n';

export function ExpensesScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

    const categories = ['All', 'Travel', 'Supplies', 'Marketing', 'Software', 'Rent', 'Utilities', 'Sales', 'Refund', 'Grant', 'Other'];

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#1e293b' : '#ffffff';

    useFocusEffect(
        useCallback(() => {
            fetchExpenses();
        }, [user])
    );

    const fetchExpenses = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (data) {
            setExpenses(data);
            applyFilters(data, selectedCategory, searchQuery, typeFilter);
        }
    };

    const applyFilters = (data: Expense[], category: string, query: string, type: string) => {
        let filtered = data;

        if (type !== 'all') {
            filtered = filtered.filter(e => (e.type || 'expense') === type);
        }

        if (category !== 'All') {
            filtered = filtered.filter(e => e.category === category);
        }
        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = filtered.filter(e =>
                e.description?.toLowerCase().includes(q) ||
                e.category.toLowerCase().includes(q)
            );
        }
        setFilteredExpenses(filtered);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchExpenses();
        setRefreshing(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert(t('delete', language), t('areYouSure', language), [
            { text: t('cancel', language), style: 'cancel' },
            {
                text: t('delete', language),
                style: 'destructive',
                onPress: async () => {
                    await supabase.from('expenses').delete().eq('id', id);
                    fetchExpenses();
                },
            },
        ]);
    };

    const renderStatCard = (title: string, value: string, icon: any, color: string) => {
        const Icon = icon;
        return (
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
                <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
                    <Icon color={color} size={20} />
                </View>
                <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: mutedColor }]}>{title}</Text>
            </View>
        );
    };

    const renderExpense = ({ item }: { item: Expense }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ExpenseForm', { expenseId: item.id })}
        >
            <View style={[styles.expenseCard, { backgroundColor: cardBg }]}>
                <View style={styles.expenseHeader}>
                    <View style={styles.expenseIconBox}>
                        {(item.type === 'income') ? <TrendingUp color='#10b981' size={20} /> : <TrendingDown color='#ef4444' size={20} />}
                    </View>
                    <View style={styles.expenseTitle}>
                        <Text style={[styles.category, { color: textColor }]}>{item.category}</Text>
                        <Text style={[styles.description, { color: mutedColor }]} numberOfLines={1}>{item.description || 'No description'}</Text>
                    </View>
                    <Text style={[styles.amount, { color: (item.type === 'income') ? '#10b981' : textColor }]}>
                        {(item.type === 'income') ? '+' : '-'}{formatCurrency(Number(item.amount))}
                    </Text>
                </View>
                <View style={styles.expenseFooter}>
                    <View style={styles.dateRow}>
                        <Calendar size={12} color={mutedColor} />
                        <Text style={[styles.date, { color: mutedColor }]}>{item.date}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                        <Trash2 color="#ef4444" size={16} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    const totalIncome = filteredExpenses.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount), 0);
    const totalExpense = filteredExpenses.filter(e => e.type !== 'income').reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalIncome - totalExpense;

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{t('finances', language)}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('expenses', language)}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: cardBg }]}
                    onPress={() => setShowSearch(!showSearch)}
                >
                    {showSearch ? <X color={textColor} size={20} /> : <Search color={textColor} size={20} />}
                </TouchableOpacity>
            </View>

            {showSearch && (
                <View style={[styles.searchContainer, { backgroundColor: inputBg }]}>
                    <Search color={mutedColor} size={20} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder={t('search', language)}
                        placeholderTextColor={mutedColor}
                        value={searchQuery}
                        onChangeText={text => {
                            setSearchQuery(text);
                            applyFilters(expenses, selectedCategory, text, typeFilter);
                        }}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            setSearchQuery('');
                            applyFilters(expenses, selectedCategory, '', typeFilter);
                        }}>
                            <X color={mutedColor} size={18} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <View style={styles.statsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                    {renderStatCard(t('balance', language), formatCurrency(balance), Scale, balance >= 0 ? '#10b981' : '#ef4444')}
                    {renderStatCard(t('totalIncomes', language), formatCurrency(totalIncome), TrendingUp, '#10b981')}
                    {renderStatCard(t('totalExpenses', language), formatCurrency(totalExpense), TrendingDown, '#ef4444')}
                </ScrollView>
            </View>

            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.filterChip,
                                { backgroundColor: cardBg },
                                selectedCategory === cat && { backgroundColor: primaryColor }
                            ]}
                            onPress={() => {
                                setSelectedCategory(cat);
                                applyFilters(expenses, cat, searchQuery, typeFilter);
                            }}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: mutedColor },
                                selectedCategory === cat && { color: '#fff', fontWeight: '600' }
                            ]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredExpenses}
                renderItem={renderExpense}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <DollarSign color={mutedColor} size={48} opacity={0.2} />
                        <Text style={[styles.emptyText, { color: mutedColor }]}>{t('noItemsYet', language)}</Text>
                    </View>
                }
            />

            <FAB onPress={() => navigation.navigate('ExpenseForm')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 0, paddingHorizontal: 16, height: 50, borderRadius: 14, gap: 12, marginBottom: 16 },
    searchInput: { flex: 1, fontSize: 16 },

    statsContainer: { marginBottom: 24 },
    statsScroll: { paddingHorizontal: 20, gap: 12 },
    statCard: {
        minWidth: 140,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    statLabel: { fontSize: 11, fontWeight: '500' },

    filterSection: { marginBottom: 12 },
    filterContent: { paddingHorizontal: 20, gap: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 60, alignItems: 'center' },
    filterText: { fontSize: 13, fontWeight: '500' },

    listContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
    expenseCard: { padding: 16, borderRadius: 16 },
    expenseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    expenseIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(148, 163, 184, 0.1)', alignItems: 'center', justifyContent: 'center' },
    expenseTitle: { flex: 1 },
    category: { fontSize: 16, fontWeight: '700' },
    description: { fontSize: 13, marginTop: 2 },
    amount: { fontSize: 17, fontWeight: '700' },
    expenseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    date: { fontSize: 12, fontWeight: '500' },
    deleteButton: { padding: 6, marginRight: -6 },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 15, fontWeight: '500' },
});
