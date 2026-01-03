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
} from 'react-native';
import { Trash2, Search, X, Percent } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, FAB } from '../../components/common';
import { Client } from '../../types';

interface ClientsScreenProps {
    navigation: any;
}

export function ClientsScreen({ navigation }: ClientsScreenProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#1e293b' : '#ffffff';

    useFocusEffect(
        useCallback(() => {
            fetchClients();
        }, [user])
    );

    const fetchClients = async () => {
        if (!user) return;
        const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).order('name');
        if (data) {
            setClients(data);
            filterClients(data, searchQuery);
        }
    };

    const filterClients = (data: Client[], query: string) => {
        if (!query.trim()) {
            setFilteredClients(data);
        } else {
            const q = query.toLowerCase();
            setFilteredClients(data.filter((client) =>
                client.name.toLowerCase().includes(q) ||
                client.email?.toLowerCase().includes(q) ||
                client.phone?.includes(q)
            ));
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchClients();
        setRefreshing(false);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        filterClients(clients, text);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Client', 'Are you sure? This will also remove them from invoices.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await supabase.from('clients').delete().eq('id', id);
                    fetchClients();
                },
            },
        ]);
    };

    const renderClient = ({ item }: { item: Client }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientForm', { clientId: item.id })}
        >
            <Card style={styles.clientCard}>
                <View style={styles.clientHeader}>
                    <View style={styles.clientInfo}>
                        <Text style={[styles.clientName, { color: textColor }]}>{item.name}</Text>
                        <Text style={[styles.clientEmail, { color: mutedColor }]}>{item.email}</Text>
                        {item.phone && <Text style={[styles.clientPhone, { color: mutedColor }]}>{item.phone}</Text>}
                    </View>
                    <View style={styles.clientActions}>
                        {item.discount_percent && item.discount_percent > 0 && (
                            <View style={styles.discountBadge}>
                                <Percent color="#10b981" size={12} />
                                <Text style={styles.discountText}>{item.discount_percent}%</Text>
                            </View>
                        )}
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                            <Trash2 color="#ef4444" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Clients</Text>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => setShowSearch(!showSearch)}>
                    <Search color="#818cf8" size={20} />
                </TouchableOpacity>
            </View>

            {showSearch && (
                <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
                    <Search color={mutedColor} size={20} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search clients..."
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

            <FlatList
                data={filteredClients}
                renderItem={renderClient}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: mutedColor }]}>
                        {searchQuery ? 'No clients match your search' : 'No clients yet'}
                    </Text>
                }
            />

            <FAB onPress={() => navigation.navigate('ClientForm')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 32, fontWeight: 'bold' },
    iconButton: { padding: 10, borderRadius: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12, gap: 12 },
    searchInput: { flex: 1, fontSize: 16 },
    listContent: { padding: 16, paddingBottom: 100 },
    clientCard: { marginBottom: 12 },
    clientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    clientInfo: { flex: 1 },
    clientName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    clientEmail: { fontSize: 14, marginBottom: 2 },
    clientPhone: { fontSize: 14 },
    clientActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    discountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    discountText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
    deleteButton: { padding: 8 },
    emptyText: { textAlign: 'center', marginTop: 48 },
});
