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
import { FileText, Users, Package, Wallet, DollarSign } from 'lucide-react-native';
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

    const borderColor = isDark ? '#334155' : '#e2e8f0';

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user, selectedType]) // Re-fetch when type changes
    );

    const fetchData = async () => {
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) setProfile(profileData);

        const companyId = profileData?.active_company_id || profileData?.company_id || user.id;

        let data = [];

        if (selectedType === 'invoice' || selectedType === 'offer') {
            console.log('Fetching invoices for type:', selectedType, 'user:', user.id, 'companyId:', companyId);
            const { data: invData, error } = await supabase
                .from('invoices')
                .select(`*, client:clients(name)`)
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .eq('type', selectedType)
                .order('created_at', { ascending: false })
                .limit(5);

            console.log('Invoices fetched:', invData?.length, 'error:', error);
            if (error) console.error('Error fetching invoices:', error);
            data = invData || [];
        } else if (selectedType === 'contract') {
            console.log('Fetching contracts for user:', user.id);
            const { data: contractData, error } = await supabase
                .from('contracts')
                .select(`*, client:clients(name)`)
                .or(`user_id.eq.${user.id},company_id.eq.${companyId}`)
                .order('created_at', { ascending: false })
                .limit(5);

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
                    onPress={() => navigation.navigate('ContractDetail', { contractId: item.id })}
                >
                    <View style={[styles.invoiceCard, { backgroundColor: cardBg }]}>
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
                            <Text style={[styles.invoiceAmount, { fontSize: 14, color: textColor }]}>{item.type.replace('_', ' ').toUpperCase()}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
            >
                <View style={[styles.invoiceCard, { backgroundColor: cardBg }]}>
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
                        <Text style={[styles.invoiceAmount, { color: primaryColor }]}>{formatCurrency(Number(item.total_amount), profile?.currency)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>Overview</Text>
                    <Text style={[styles.title, { color: textColor }]}>Recent Activity</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => navigation.navigate('QRScanner')}>
                        <QrCode color={primaryColor} size={20} />
                    </TouchableOpacity>
                </View>
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

            {/* View All Button */}
            <View style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: textColor }}>Aktiviteti i fundit</Text>
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
                ListFooterComponent={
                    invoices.length > 0 ? (
                        <TouchableOpacity
                            style={{ padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24, backgroundColor: cardBg, borderRadius: 12 }}
                            onPress={() => navigation.navigate('AllInvoices', { type: selectedType })}
                        >
                            <Text style={{ color: primaryColor, fontWeight: '700', fontSize: 15 }}>{t('viewAll', language)}</Text>
                        </TouchableOpacity>
                    ) : null
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
                    { label: 'Shto të ardhura', icon: DollarSign, color: '#10b981', onPress: () => navigation.navigate('PaymentsList') },
                    { label: 'Shto shpenzim', icon: Wallet, color: '#ef4444', onPress: () => navigation.navigate('ExpenseForm') },
                    { label: t('newClient', language), icon: Users, color: '#0ea5e9', onPress: () => navigation.navigate('Management', { screen: 'ClientForm' }) },
                    { label: t('newProduct', language), icon: Package, color: '#f59e0b', onPress: () => navigation.navigate('Management', { screen: 'ProductForm' }) },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },

    typeSelector: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 4, gap: 4 },
    typeOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    typeText: { fontSize: 13, fontWeight: '700' },

    headerActions: { flexDirection: 'row', gap: 12 },
    iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginBottom: 16, gap: 12 },
    searchInput: { flex: 1, fontSize: 16 },

    filterWrapper: { marginBottom: 16 },
    filterContent: { paddingHorizontal: 20, gap: 10, flexDirection: 'row' },
    filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    filterText: { fontWeight: '600', fontSize: 13 },
    filterTextActive: { color: '#fff' },

    listContent: { padding: 20, paddingTop: 0, paddingBottom: 100 },
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
