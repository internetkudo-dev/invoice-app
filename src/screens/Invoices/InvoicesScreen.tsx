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
import { Search, QrCode, X, Eye } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, StatusBadge, FAB } from '../../components/common';
import { FileText, Users, Package } from 'lucide-react-native';
import { Invoice, InvoiceStatus, Profile } from '../../types';
import { formatCurrency } from '../../utils/format';
import { t } from '../../i18n';

interface InvoicesScreenProps {
    navigation: any;
    route?: any;
}

const statuses: { key: InvoiceStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' }, // Contracts also use 'draft'
    { key: 'sent', label: 'Sent' },
    { key: 'paid', label: 'Paid' },
    { key: 'overdue', label: 'Overdue' },
];

// Combine Invoice and Contract types for the list state
type ListItem = Invoice | any; // using any for Contract temporarily to avoid conflict with state type

export function InvoicesScreen({ navigation, route }: InvoicesScreenProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [invoices, setInvoices] = useState<ListItem[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<ListItem[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<'invoice' | 'offer' | 'contract'>('invoice');
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const { primaryColor, language } = useTheme();

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#1e293b' : '#ffffff';

    useEffect(() => {
        if (route?.params?.tab) {
            setSelectedType(route.params.tab);
            navigation.setParams({ tab: undefined });
        }
    }, [route?.params?.tab]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user, selectedType]) // Re-fetch when type changes
    );

    const fetchData = async () => {
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) setProfile(profileData);

        const companyId = profileData?.company_id || user.id;

        let data = [];

        if (selectedType === 'invoice' || selectedType === 'offer') {
            const { data: invData, error } = await supabase
                .from('invoices')
                .select(`*, client:clients(name)`)
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('type', selectedType)
                .order('created_at', { ascending: false });

            if (error) console.error('Error fetching invoices:', error);
            data = invData || [];
        } else if (selectedType === 'contract') {
            console.log('Fetching contracts for user:', user.id);
            const { data: contractData, error } = await supabase
                .from('contracts')
                .select(`*, client:clients(name)`)
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .order('created_at', { ascending: false });

            if (error) console.error('Error fetching contracts:', error);
            else console.log('Contracts fetched:', contractData?.length);

            data = contractData || [];
        }

        if (data) {
            setInvoices(data);
            filterInvoices(data, selectedStatus, searchQuery);
        }
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

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleStatusFilter = (status: string) => {
        setSelectedStatus(status);
        filterInvoices(invoices, status, searchQuery);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        filterInvoices(invoices, selectedStatus, text);
    };

    const renderItem = ({ item }: { item: ListItem }) => {
        if (selectedType === 'contract') {
            return (
                <TouchableOpacity
                    activeOpacity={0.7}
                    // TODO: Create ContractDetail screen
                    onPress={() => navigation.navigate('ContractForm', { contractId: item.id })}
                >
                    <Card style={styles.invoiceCard}>
                        <View style={styles.invoiceHeader}>
                            <View style={styles.invoiceInfo}>
                                <Text style={[styles.invoiceNumber, { color: textColor }]}>{item.title}</Text>
                                <Text style={[styles.clientName, { color: mutedColor }]}>
                                    {item.client?.name || 'No Client'}
                                </Text>
                            </View>
                            <StatusBadge status={item.status} />
                        </View>
                        <View style={styles.invoiceFooter}>
                            <Text style={[styles.invoiceDate, { color: mutedColor }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                            <Text style={[styles.invoiceAmount, { fontSize: 14 }]}>{item.type.replace('_', ' ').toUpperCase()}</Text>
                        </View>
                    </Card>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
            >
                <Card style={styles.invoiceCard}>
                    <View style={styles.invoiceHeader}>
                        <View style={styles.invoiceInfo}>
                            <Text style={[styles.invoiceNumber, { color: textColor }]}>{item.invoice_number}</Text>
                            <Text style={[styles.clientName, { color: mutedColor }]}>
                                {item.client?.name || 'No client'}
                            </Text>
                        </View>
                        <View style={styles.badgeRow}>
                            <StatusBadge status={item.status} />
                            <TouchableOpacity
                                style={[styles.previewIcon, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }]}
                                onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id, autoPreview: true })}
                            >
                                <Eye color="#818cf8" size={18} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.invoiceFooter}>
                        <Text style={[styles.invoiceDate, { color: mutedColor }]}>{item.issue_date}</Text>
                        <Text style={styles.invoiceAmount}>{formatCurrency(Number(item.total_amount), profile?.currency)}</Text>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: textColor }]}>
                        {selectedType === 'invoice' ? t('invoices', language) : selectedType === 'offer' ? t('offers', language) : 'Contracts'}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => setShowSearch(!showSearch)}>
                        <Search color="#818cf8" size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => navigation.navigate('QRScanner')}>
                        <QrCode color="#818cf8" size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Type Selector */}
            <View style={styles.typeSelector}>
                {(['invoice', 'offer', 'contract'] as const).map((tValue) => (
                    <TouchableOpacity
                        key={tValue}
                        style={[styles.typeOption, { backgroundColor: cardBg }, selectedType === tValue && { backgroundColor: primaryColor }]}
                        onPress={() => setSelectedType(tValue)}
                    >
                        <Text style={[styles.typeText, { color: selectedType === tValue ? '#fff' : mutedColor }]}>
                            {tValue.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Search Bar */}
            {showSearch && (
                <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
                    <Search color={mutedColor} size={20} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder={t('search', language)}
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
            <View style={styles.filterWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
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
            </View>

            <FlatList
                data={filteredInvoices}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            {searchQuery ? 'No items match your search' : `No ${selectedType}s found`}
                        </Text>
                    </View>
                }
            />

            <FAB
                onPress={() => {
                    if (selectedType === 'invoice') navigation.navigate('InvoiceForm', { type: 'invoice' });
                    else if (selectedType === 'offer') navigation.navigate('InvoiceForm', { type: 'offer' });
                    else navigation.navigate('ContractForm'); // New screen
                }}
                actions={[
                    { label: t('newInvoice', language), icon: FileText, color: primaryColor, onPress: () => navigation.navigate('InvoiceForm', { type: 'invoice' }) },
                    { label: t('newOffer', language), icon: FileText, color: '#ec4899', onPress: () => navigation.navigate('InvoiceForm', { type: 'offer' }) },
                    { label: 'New Contract', icon: FileText, color: '#8b5cf6', onPress: () => navigation.navigate('ContractForm') },
                    { label: t('newClient', language), icon: Users, color: '#10b981', onPress: () => navigation.navigate('Management', { screen: 'ManagementTabs', params: { activeTab: 'clients', openForm: true } }) },
                    { label: t('newProduct', language), icon: Package, color: '#f59e0b', onPress: () => navigation.navigate('Management', { screen: 'ManagementTabs', params: { activeTab: 'products', openForm: true } }) },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 32, fontWeight: 'bold' },
    typeSelector: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden', gap: 1, backgroundColor: '#334155' },
    typeOption: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    typeText: { fontSize: 12, fontWeight: 'bold' },
    headerActions: { flexDirection: 'row', gap: 12 },
    iconButton: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12, gap: 12 },
    searchInput: { flex: 1, fontSize: 16 },
    filterWrapper: { marginBottom: 12 },
    filterContent: { paddingHorizontal: 16, gap: 10, flexDirection: 'row' },
    filterButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
    filterButtonActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    filterText: { fontWeight: '600', fontSize: 13 },
    filterTextActive: { color: '#fff' },
    listContent: { padding: 16, paddingBottom: 100 },
    invoiceCard: { marginBottom: 12 },
    invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    invoiceInfo: { flex: 1 },
    invoiceNumber: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    clientName: { fontSize: 14 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    previewIcon: { padding: 8, borderRadius: 10 },
    invoiceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invoiceDate: { fontSize: 12, fontWeight: '500' },
    invoiceAmount: { color: '#818cf8', fontSize: 18, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 48 },
    emptyText: { textAlign: 'center' },
});
