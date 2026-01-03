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
    const { isDark } = useTheme();
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
            <Card style={styles.expenseCard}>
                <View style={styles.expenseHeader}>
                    <View style={styles.expenseTitle}>
                        <Text style={[styles.category, { color: '#818cf8' }]}>{item.category}</Text>
                        <Text style={[styles.description, { color: textColor }]}>{item.description || 'No description'}</Text>
                    </View>
                    <Text style={[styles.amount, { color: (item.type === 'income') ? '#10b981' : '#ef4444' }]}>
                        {(item.type === 'income') ? '+' : '-'}{formatCurrency(Number(item.amount))}
                    </Text>
                </View>
                <View style={styles.expenseFooter}>
                    <View style={styles.dateRow}>
                        <Calendar size={12} color={mutedColor} />
                        <Text style={[styles.date, { color: mutedColor }]}>{item.date}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                        <Trash2 color="#ef4444" size={18} />
                    </TouchableOpacity>
                </View>
            </Card>
        </TouchableOpacity>
    );

    const totalFiltered = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Expenses</Text>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => setShowSearch(!showSearch)}>
                    <Search color="#818cf8" size={20} />
                </TouchableOpacity>
            </View>

            <Card style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Expenses (Filtered)</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(totalFiltered)}</Text>
            </Card>

            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.filterChip,
                                { backgroundColor: cardBg },
                                selectedCategory === cat && styles.activeChip
                            ]}
                            onPress={() => {
                                setSelectedCategory(cat);
                                applyFilters(expenses, cat, searchQuery, typeFilter);
                            }}
                        >
                            <Text style={[
                                styles.chipText,
                                { color: mutedColor },
                                selectedCategory === cat && styles.activeChipText
                            ]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {showSearch && (
                <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
                    <Search color={mutedColor} size={18} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search expenses..."
                        placeholderTextColor={mutedColor}
                        value={searchQuery}
                        onChangeText={(text) => {
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

            <FlatList
                data={filteredExpenses}
                renderItem={renderExpense}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: mutedColor }]}>No expenses found</Text>
                    </View>
                }
            />

            <FAB onPress={() => navigation.navigate('ExpenseForm')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 32, fontWeight: 'bold' },
    iconButton: { padding: 10, borderRadius: 12 },
    summaryCard: { margin: 16, backgroundColor: '#ef4444', padding: 20 },
    summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    summaryAmount: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
    filterSection: { marginBottom: 16 },
    filterContent: { paddingHorizontal: 16, gap: 10 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
    activeChip: { backgroundColor: '#818cf8', borderColor: '#818cf8' },
    chipText: { fontWeight: '600', fontSize: 13 },
    activeChipText: { color: '#fff' },
    typeTabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 10 },
    typeTab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
    activeTypeTab: { backgroundColor: '#6366f1' },
    typeTabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    activeTypeTabText: { color: '#fff' },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 16, gap: 10 },
    searchInput: { flex: 1, fontSize: 15 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    expenseCard: { marginBottom: 12 },
    expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    expenseTitle: { flex: 1 },
    category: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
    description: { fontSize: 16, fontWeight: '500' },
    amount: { fontSize: 18, fontWeight: 'bold' },
    expenseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    date: { fontSize: 12 },
    deleteButton: { padding: 4 },
    emptyContainer: { alignItems: 'center', marginTop: 48 },
    emptyText: { fontSize: 15 },
});
