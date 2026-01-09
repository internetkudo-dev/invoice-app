import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    TextInput,
    Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, X, Eye, ArrowUpAZ, ArrowDownAZ, Calendar, ChevronDown, Filter } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { StatusBadge } from '../../components/common';
import { Invoice, InvoiceStatus, Profile } from '../../types';
import { formatCurrency } from '../../utils/format';
import { t } from '../../i18n';

interface AllInvoicesScreenProps {
    navigation: any;
    route?: any;
}

const statuses: { key: InvoiceStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'paid', label: 'Paid' },
    { key: 'overdue', label: 'Overdue' },
];

type ListItem = Invoice | any;

export function AllInvoicesScreen({ navigation, route }: AllInvoicesScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [invoices, setInvoices] = useState<ListItem[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<ListItem[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<'invoice' | 'offer' | 'contract'>('invoice');
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, overdue: 0 });

    // Sort
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [showSortModal, setShowSortModal] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useFocusEffect(
        useCallback(() => {
            if (route?.params?.type) {
                setSelectedType(route.params.type);
            }
        }, [route?.params?.type])
    );

    useEffect(() => {
        fetchData();
    }, [user, selectedType, sortOrder]);

    const fetchData = async () => {
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) setProfile(profileData);
        const companyId = profileData?.active_company_id || profileData?.company_id || user.id;

        let data = [];
        let query = supabase
            .from(selectedType === 'contract' ? 'contracts' : 'invoices')
            .select(selectedType === 'contract' ? `*, client:clients(name)` : `*, client:clients(name), items:invoice_items(id)`)
            .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
            .order('created_at', { ascending: sortOrder === 'asc' });

        if (selectedType !== 'contract') {
            query = query.eq('type', selectedType);
        }

        const { data: result, error } = await query;

        if (result) {
            setInvoices(result);
            filterInvoices(result, selectedStatus, searchQuery);
            calculateStats(result);
        }
    };

    const calculateStats = (data: ListItem[]) => {
        const total = data.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
        const paid = data.filter((i: any) => i.status === 'paid').reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
        const pending = data.filter((i: any) => i.status === 'sent' || i.status === 'draft').reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
        const overdue = data.filter((i: any) => i.status === 'overdue').reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
        setStats({ total, paid, pending, overdue });
    };

    const filterInvoices = (data: ListItem[], status: string, query: string) => {
        let filtered = data;
        if (status !== 'all') {
            filtered = filtered.filter((item: any) => item.status === status);
        }
        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = filtered.filter((item: any) =>
                (item.invoice_number || item.title || '').toLowerCase().includes(q) ||
                item.client?.name?.toLowerCase().includes(q)
            );
        }
        setFilteredInvoices(filtered);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        filterInvoices(invoices, selectedStatus, text);
    };

    const handleStatusFilter = (status: string) => {
        setSelectedStatus(status);
        filterInvoices(invoices, status, searchQuery);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const renderItem = ({ item }: { item: ListItem }) => {
        const isContract = selectedType === 'contract';
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate(isContract ? 'ContractDetail' : 'InvoiceDetail', { [isContract ? 'contractId' : 'invoiceId']: item.id })}
            >
                <View style={[styles.invoiceCard, { backgroundColor: cardBg }]}>
                    <View style={styles.invoiceHeader}>
                        <View style={styles.invoiceInfo}>
                            <Text style={[styles.invoiceNumber, { color: textColor }]}>{isContract ? item.title : item.invoice_number}</Text>
                            <Text style={[styles.clientName, { color: mutedColor }]}>
                                {item.client?.name || 'No client'}
                            </Text>
                        </View>
                        <View style={styles.badgeRow}>
                            <StatusBadge status={item.status} />
                            {!isContract && (
                                <TouchableOpacity
                                    style={[styles.previewIcon, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }]}
                                    onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id, autoPreview: true })}
                                >
                                    <Eye color="#818cf8" size={18} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    <View style={styles.invoiceFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.invoiceDate, { color: mutedColor }]}>
                                {isContract ? new Date(item.created_at).toLocaleDateString() : item.issue_date}
                            </Text>
                            {!isContract && (
                                <Text style={[styles.invoiceDate, { color: mutedColor }]}>
                                    • {item.items?.length || 0} {t('items', language).toLowerCase()}
                                </Text>
                            )}
                        </View>
                        <Text style={[styles.invoiceAmount, { color: primaryColor }]}>
                            {isContract ? item.type.replace('_', ' ').toUpperCase() : formatCurrency(Number(item.total_amount), profile?.currency)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>All Documents</Text>
                    <Text style={[styles.title, { color: textColor }]}>
                        {selectedType === 'invoice' ? t('invoices', language) : selectedType === 'offer' ? t('offers', language) : 'Contracts'}
                    </Text>
                </View>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: cardBg }]} onPress={() => navigation.goBack()}>
                    <X color={textColor} size={20} />
                </TouchableOpacity>
            </View>

            {/* Type Selector */}
            <View style={[styles.typeSelector, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                {(['invoice', 'offer', 'contract'] as const).map((tValue) => (
                    <TouchableOpacity
                        key={tValue}
                        style={[
                            styles.typeOption,
                            selectedType === tValue ? { backgroundColor: cardBg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 } : { backgroundColor: 'transparent' }
                        ]}
                        onPress={() => setSelectedType(tValue)}
                    >
                        <Text style={[styles.typeText, { color: selectedType === tValue ? primaryColor : mutedColor }]}>
                            {tValue.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* HUD - Stats */}
            {selectedType !== 'contract' && (
                <View style={styles.hudContainer}>
                    <View style={[styles.hudCard, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                        <Text style={[styles.hudLabel, { color: mutedColor }]}>Total</Text>
                        <Text style={[styles.hudValue, { color: textColor }]}>{formatCurrency(stats.total)}</Text>
                    </View>
                    <View style={[styles.hudCard, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                        <Text style={[styles.hudLabel, { color: mutedColor }]}>Paid</Text>
                        <Text style={[styles.hudValue, { color: '#10b981' }]}>{formatCurrency(stats.paid)}</Text>
                    </View>
                    <View style={[styles.hudCard, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                        <Text style={[styles.hudLabel, { color: mutedColor }]}>Pending</Text>
                        <Text style={[styles.hudValue, { color: '#f59e0b' }]}>{formatCurrency(stats.pending)}</Text>
                    </View>
                </View>
            )}

            {/* Controls */}
            <View style={styles.controlsRow}>
                <View style={[styles.searchBar, { backgroundColor: inputBg, borderColor, borderWidth: 1 }]}>
                    <Search color={mutedColor} size={18} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search..."
                        placeholderTextColor={mutedColor}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <X color={mutedColor} size={16} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.sortButton, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}
                    onPress={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                    {sortOrder === 'desc' ? <ArrowDownAZ color={textColor} size={20} /> : <ArrowUpAZ color={textColor} size={20} />}
                </TouchableOpacity>
            </View>

            {/* Status Filters */}
            <View style={styles.filterWrapper}>
                <FlatList
                    horizontal
                    data={statuses}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                { backgroundColor: cardBg, borderColor, borderWidth: 1 },
                                selectedStatus === item.key && { backgroundColor: primaryColor, borderColor: primaryColor },
                            ]}
                            onPress={() => handleStatusFilter(item.key)}
                        >
                            <Text style={[styles.filterText, { color: selectedStatus === item.key ? '#fff' : mutedColor }]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            <FlatList
                data={filteredInvoices}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: mutedColor }]}>No documents found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    closeButton: { padding: 8, borderRadius: 12 },

    typeSelector: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 4, gap: 4 },
    typeOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    typeText: { fontSize: 13, fontWeight: '700' },

    hudContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
    hudCard: { flex: 1, padding: 12, borderRadius: 14, alignItems: 'center' },
    hudLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    hudValue: { fontSize: 13, fontWeight: '800' },

    controlsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 12 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 12, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, height: '100%' },
    sortButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    filterWrapper: { marginBottom: 16 },
    filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    filterText: { fontWeight: '600', fontSize: 13 },

    listContent: { padding: 20, paddingTop: 0, paddingBottom: 40 },
    invoiceCard: { marginBottom: 12, padding: 16, borderRadius: 16 },
    invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    invoiceInfo: { flex: 1 },
    invoiceNumber: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
    clientName: { fontSize: 14 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    previewIcon: { padding: 8, borderRadius: 10 },
    invoiceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12, marginTop: 4 },
    invoiceDate: { fontSize: 13, fontWeight: '500' },
    invoiceAmount: { fontSize: 18, fontWeight: '800' },

    emptyContainer: { alignItems: 'center', marginTop: 48 },
    emptyText: { textAlign: 'center' },
});
