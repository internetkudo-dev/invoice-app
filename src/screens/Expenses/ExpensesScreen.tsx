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
import { Trash2, Search, X, Plus, Filter, Calendar, DollarSign, Tag } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, FAB } from '../../components/common';
import { Expense, ExpenseCategory } from '../../types';
import { formatCurrency } from '../../utils/format';

export function ExpensesScreen({ navigation }: any) {
    const { user } = useAuth();
    const { isDark, primaryColor } = useTheme();
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
    const borderColor = isDark ? '#334155' : '#e2e8f0';

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
        Alert.alert('Delete Expense', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await supabase.from('expenses').delete().eq('id', id);
                    fetchExpenses();
                },
            },
        ]);
    };

    const renderExpense = ({ item }: { item: Expense }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ExpenseForm', { expenseId: item.id })}
        >
            <Card style={[styles.expenseCard, { backgroundColor: cardBg, borderColor, borderWidth: 1, shadowColor: 'transparent' }]}>
                <View style={styles.expenseHeader}>
                    <View style={styles.expenseIconBox}>
                        {(item.type === 'income') ? <DollarSign color='#10b981' size={20} /> : <Tag color={primaryColor} size={20} />}
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
            </Card>
        </TouchableOpacity>
    );

    const totalFiltered = filteredExpenses.reduce((sum, e) => {
        const amt = Number(e.amount);
        return (e.type === 'income') ? sum + amt : sum - amt;
    }, 0);

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.titleLabel, { color: primaryColor }]}>FINANCE</Text>
                    <Text style={[styles.title, { color: textColor }]}>EXPENSES</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}
                        onPress={() => setShowSearch(!showSearch)}
                    >
                        {showSearch ? <X color={textColor} size={20} /> : <Search color={textColor} size={20} />}
                    </TouchableOpacity>
                </View>
            </View>

            {showSearch && (
                <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                    <Search color={mutedColor} size={20} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search expenses..."
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
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>NET BALANCE</Text>
                    <Text style={[styles.statValue, { color: totalFiltered >= 0 ? '#10b981' : '#ef4444' }]}>
                        {formatCurrency(totalFiltered)}
                    </Text>
                </View>
            </View>

            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.filterChip,
                                { backgroundColor: cardBg, borderColor },
                                selectedCategory === cat && { backgroundColor: primaryColor, borderColor: primaryColor }
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
                        <Text style={[styles.emptyText, { color: mutedColor }]}>No transactions found</Text>
                    </View>
                }
            />

            <FAB onPress={() => navigation.navigate('ExpenseForm')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    titleLabel: { fontSize: 13, fontWeight: 'bold', letterSpacing: 1.2, marginBottom: 2 },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
    headerRight: { flexDirection: 'row', gap: 12 },
    iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 10, paddingHorizontal: 16, height: 50, borderRadius: 14, gap: 12 },
    searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
    statsContainer: { paddingHorizontal: 20, marginVertical: 16 },
    statItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
    statValue: { fontSize: 24, fontWeight: '800' },
    filterSection: { marginBottom: 12 },
    filterContent: { paddingHorizontal: 20, gap: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minWidth: 60, alignItems: 'center' },
    filterText: { fontSize: 13, fontWeight: '500' },
    listContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
    expenseCard: { padding: 16, borderRadius: 16, marginVertical: 0 },
    expenseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    expenseIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(129, 140, 248, 0.1)', alignItems: 'center', justifyContent: 'center' },
    expenseTitle: { flex: 1 },
    category: { fontSize: 16, fontWeight: '700' },
    description: { fontSize: 13, marginTop: 2 },
    amount: { fontSize: 17, fontWeight: '700' },
    expenseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.1)' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    date: { fontSize: 12, fontWeight: '500' },
    deleteButton: { padding: 6, marginRight: -6 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 15, fontWeight: '500' },
    summaryCard: { marginHorizontal: 16, padding: 16, marginTop: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, // Kept for ref if needed but not used in new layout
    summaryLabel: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    summaryAmount: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
});
