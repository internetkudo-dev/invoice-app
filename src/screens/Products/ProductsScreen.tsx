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
import { Trash2, Search, X, Percent, Box, AlertTriangle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, FAB } from '../../components/common';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/format';
import { t } from '../../i18n';

interface ProductsScreenProps {
    navigation: any;
    showHeader?: boolean;
}

export function ProductsScreen({ navigation, showHeader = false }: ProductsScreenProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const { language } = useTheme();

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#1e293b' : '#ffffff';

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
        }, [user])
    );

    const fetchProducts = async () => {
        console.log('Fetching products... User:', user?.id);
        if (!user) {
            console.log('No user found, aborting fetch');
            return;
        }

        try {
            const { data, error } = await supabase.from('products').select('*').eq('user_id', user.id).order('name');

            if (error) {
                console.error('Error fetching products:', error);
                return;
            }

            console.log('Products fetched:', data?.length);
            if (data) {
                setProducts(data);
                filterProducts(data, searchQuery);
            }
        } catch (err) {
            console.error('Exception in fetchProducts:', err);
        }
    };

    const filterProducts = (data: Product[], query: string) => {
        if (!query.trim()) {
            setFilteredProducts(data);
        } else {
            const q = query.toLowerCase();
            setFilteredProducts(data.filter((product) =>
                product.name.toLowerCase().includes(q) ||
                product.description?.toLowerCase().includes(q) ||
                product.sku?.toLowerCase().includes(q) ||
                product.category?.toLowerCase().includes(q)
            ));
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        filterProducts(products, text);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Product', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await supabase.from('products').delete().eq('id', id);
                    fetchProducts();
                },
            },
        ]);
    };

    const renderProduct = ({ item }: { item: Product }) => {
        const isLowStock = item.track_stock && (item.stock_quantity || 0) <= (item.low_stock_threshold || 5);
        const outOfStock = item.track_stock && (item.stock_quantity || 0) <= 0;

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
            >
                <Card style={styles.productCard}>
                    <View style={styles.productHeader}>
                        <View style={styles.productInfo}>
                            <View style={styles.nameRow}>
                                <Text style={[styles.productName, { color: textColor }]}>{item.name}</Text>
                                {item.category && (
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryText}>{item.category}</Text>
                                    </View>
                                )}
                            </View>
                            {item.sku && <Text style={[styles.productSku, { color: mutedColor }]}>SKU: {item.sku}</Text>}

                            {item.track_stock && (
                                <View style={styles.stockRow}>
                                    <Box size={12} color={outOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981'} />
                                    <Text style={[
                                        styles.stockText,
                                        { color: outOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : mutedColor }
                                    ]}>
                                        Stock: {item.stock_quantity} {item.unit}
                                    </Text>
                                    {isLowStock && <AlertTriangle size={12} color="#f59e0b" />}
                                </View>
                            )}
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                            <Trash2 color="#ef4444" size={20} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.productFooter}>
                        <View style={styles.priceRow}>
                            <Text style={styles.productPrice}>{formatCurrency(Number(item.unit_price))}</Text>
                            <Text style={[styles.unitText, { color: mutedColor }]}>/{item.unit}</Text>
                        </View>
                        {item.tax_rate && item.tax_rate > 0 && (
                            <View style={styles.taxBadge}>
                                <Percent color="#818cf8" size={12} />
                                <Text style={styles.taxText}>{item.tax_rate}% tax</Text>
                            </View>
                        )}
                    </View>
                </Card>
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {showHeader && (
                <View style={styles.header}>
                    <Text style={[styles.title, { color: textColor }]}>{t('products', language)}</Text>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => setShowSearch(!showSearch)}>
                        <Search color="#818cf8" size={20} />
                    </TouchableOpacity>
                </View>
            )}

            {(!showHeader || showSearch) && (
                <View style={[styles.searchBar, { backgroundColor: inputBg, marginTop: showHeader ? 0 : 0 }]}>
                    <Search color={mutedColor} size={20} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder={t('search', language)}
                        placeholderTextColor={mutedColor}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <X color={mutedColor} size={20} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: mutedColor }]}>
                        {searchQuery ? 'No products match your search' : 'No products yet'}
                    </Text>
                }
            />

            <FAB onPress={() => navigation.navigate('ProductForm')} />
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
    productCard: { marginBottom: 12 },
    productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    productInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    productName: { fontSize: 16, fontWeight: '600' },
    categoryBadge: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    categoryText: { color: '#818cf8', fontSize: 11, fontWeight: '500' },
    productSku: { fontSize: 12, marginTop: 2 },
    stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    stockText: { fontSize: 12, fontWeight: '500' },
    productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    productPrice: { color: '#10b981', fontSize: 18, fontWeight: 'bold' },
    unitText: { fontSize: 12, fontWeight: '500' },
    taxBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    taxText: { color: '#818cf8', fontSize: 12, fontWeight: '500' },
    deleteButton: { padding: 8 },
    emptyText: { textAlign: 'center', marginTop: 48 },
});
