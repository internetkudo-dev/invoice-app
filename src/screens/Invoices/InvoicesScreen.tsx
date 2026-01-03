import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    ScrollView,
    TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, QrCode, X } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, StatusBadge, FAB } from '../../components/common';
import { Invoice, InvoiceStatus, Profile } from '../../types';

interface InvoicesScreenProps {
    navigation: any;
}

const statuses: { key: InvoiceStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'paid', label: 'Paid' },
    { key: 'overdue', label: 'Overdue' },
];

export function InvoicesScreen({ navigation }: InvoicesScreenProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'all'>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#1e293b' : '#ffffff';

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user])
    );

    const fetchData = async () => {
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) setProfile(profileData);

        const { data } = await supabase
            .from('invoices')
            .select(`*, client:clients(name)`)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            setInvoices(data);
            filterInvoices(data, selectedStatus, searchQuery);
        }
    };

    const filterInvoices = (data: Invoice[], status: InvoiceStatus | 'all', query: string) => {
        let filtered = data;

        if (status !== 'all') {
            filtered = filtered.filter((inv) => inv.status === status);
        }

        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = filtered.filter((inv) =>
                inv.invoice_number.toLowerCase().includes(q) ||
                (inv as any).client?.name?.toLowerCase().includes(q)
            );
        }

        setFilteredInvoices(filtered);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleStatusFilter = (status: InvoiceStatus | 'all') => {
        setSelectedStatus(status);
        filterInvoices(invoices, status, searchQuery);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        filterInvoices(invoices, selectedStatus, text);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: profile?.currency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const renderInvoice = ({ item }: { item: Invoice }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
        >
            <Card style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                    <View>
                        <Text style={[styles.invoiceNumber, { color: textColor }]}>{item.invoice_number}</Text>
                        <Text style={[styles.clientName, { color: mutedColor }]}>
                            {(item as any).client?.name || 'No client'}
                        </Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={styles.invoiceFooter}>
                    <Text style={[styles.invoiceDate, { color: mutedColor }]}>{item.issue_date}</Text>
                    <Text style={styles.invoiceAmount}>{formatCurrency(Number(item.total_amount))}</Text>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Invoices</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => setShowSearch(!showSearch)}>
                        <Search color="#818cf8" size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => navigation.navigate('QRScanner')}>
                        <QrCode color="#818cf8" size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            {showSearch && (
                <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
                    <Search color={mutedColor} size={20} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search invoices..."
                        placeholderTextColor={mutedColor}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <X color={mutedColor} size={20} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Status Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContent}
            >
                {statuses.map((status) => (
                    <TouchableOpacity
                        key={status.key}
                        style={[
                            styles.filterButton,
                            { backgroundColor: cardBg },
                            selectedStatus === status.key && styles.filterButtonActive,
                        ]}
                        onPress={() => handleStatusFilter(status.key)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                { color: mutedColor },
                                selectedStatus === status.key && styles.filterTextActive,
                            ]}
                        >
                            {status.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={filteredInvoices}
                renderItem={renderInvoice}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            {searchQuery ? 'No invoices match your search' : 'No invoices found'}
                        </Text>
                    </View>
                }
            />

            <FAB onPress={() => navigation.navigate('InvoiceForm')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 32, fontWeight: 'bold' },
    headerActions: { flexDirection: 'row', gap: 8 },
    iconButton: { padding: 10, borderRadius: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12, gap: 12 },
    searchInput: { flex: 1, fontSize: 16 },
    filterScroll: { maxHeight: 50, marginBottom: 8 },
    filterContent: { paddingHorizontal: 12, gap: 8, flexDirection: 'row' },
    filterButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
    filterButtonActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    filterText: { fontWeight: '500' },
    filterTextActive: { color: '#fff' },
    listContent: { padding: 16, paddingBottom: 100 },
    invoiceCard: { marginBottom: 12 },
    invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    invoiceNumber: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    clientName: { fontSize: 14 },
    invoiceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invoiceDate: { fontSize: 12 },
    invoiceAmount: { color: '#818cf8', fontSize: 18, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 48 },
    emptyText: { textAlign: 'center' },
});
