import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    StyleSheet,
    TextInput,
} from 'react-native';
import { Trash2, Search, X, Percent, Box, AlertTriangle, DollarSign, Scan } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Card, FAB, BarcodeScannerModal } from '../../components/common';

import { Product } from '../../types';
import { formatCurrency } from '../../utils/format';
import { t } from '../../i18n';

interface ProductsScreenProps {
    navigation: any;
    showHeader?: boolean;
}

export function ProductsScreen({ navigation, showHeader = false }: ProductsScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor, language } = useTheme();
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
    const [showScanner, setShowScanner] = useState(false);

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#1e293b' : '#ffffff';

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c)))];

    const stats = {
        totalProducts: products.length,
        totalValue: products.reduce((sum, p) => sum + (Number(p.unit_price) * (p.stock_quantity || 0)), 0),
        lowStockItems: products.filter(p => p.track_stock && (p.stock_quantity || 0) <= (p.low_stock_threshold || 5)).length,
        outOfStockItems: products.filter(p => p.track_stock && (p.stock_quantity || 0) <= 0).length,
    };

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
        }, [user])
    );

    const fetchProducts = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase.from('products').select('*').eq('user_id', user.id);
            if (data) {
                setProducts(data);
                applyFiltersAndSort(data, searchQuery, selectedCategory, sortBy);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const applyFiltersAndSort = (data: Product[], query: string, category: string | null, sort: string) => {
        let filtered = [...data];

        // Search
        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.sku?.toLowerCase().includes(q) ||
                p.barcode?.includes(q) ||
                p.description?.toLowerCase().includes(q)
            );
        }

        // Category
        if (category && category !== 'All') {
            filtered = filtered.filter(p => p.category === category);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'price') return Number(b.unit_price) - Number(a.unit_price);
            if (sort === 'stock') return (b.stock_quantity || 0) - (a.stock_quantity || 0);
            return 0;
        });

        setFilteredProducts(filtered);
    };

    useEffect(() => {
        applyFiltersAndSort(products, searchQuery, selectedCategory, sortBy);
    }, [searchQuery, selectedCategory, sortBy, products]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    };

    const handleBarcodeScanned = (code: string) => {
        setSearchQuery(code);
        setShowScanner(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert(t('delete', language), t('areYouSure', language) || 'Are you sure?', [
            { text: t('cancel', language), style: 'cancel' },
            {
                text: t('delete', language),
                style: 'destructive',
                onPress: async () => {
                    await supabase.from('products').delete().eq('id', id);
                    fetchProducts();
                },
            },
        ]);
    };

    const renderStatCard = (title: string, value: string | number, icon: any, color: string) => {
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

    const renderProduct = (item: Product) => {
        const isLowStock = item.track_stock && (item.stock_quantity || 0) <= (item.low_stock_threshold || 5);
        const outOfStock = item.track_stock && (item.stock_quantity || 0) <= 0;

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
            >
                <View style={[styles.productCard, { backgroundColor: cardBg }]}>
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
                                        {t('inventory', language)}: {item.stock_quantity} {item.unit}
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
                            <Text style={styles.productPrice}>
                                {formatCurrency(Number(item.unit_price) * (1 + (item.tax_rate || 0) / 100))}
                            </Text>
                            <Text style={[styles.unitText, { color: mutedColor }]}>/{item.unit}</Text>
                        </View>
                        {item.tax_rate && item.tax_rate > 0 && (
                            <View style={styles.taxBadge}>
                                <Percent color="#818cf8" size={12} />
                                <Text style={styles.taxText}>{item.tax_rate}% {t('tax', language)}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: mutedColor }]}>{t('management', language)}</Text>
                    <Text style={[styles.title, { color: textColor }]}>{t('products', language)}</Text>
                </View>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: cardBg }]} onPress={() => navigation.navigate('ProductForm')}>
                    <Box color={primaryColor} size={20} />
                </TouchableOpacity>
            </View>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mutedColor} />}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Inventory HUD */}
                <View style={styles.statsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                        {renderStatCard(t('products', language), stats.totalProducts, Box, '#818cf8')}
                        {renderStatCard('Vlera Totale', formatCurrency(stats.totalValue), DollarSign, '#10b981')}
                        {renderStatCard('Pak Stok', stats.lowStockItems, AlertTriangle, '#f59e0b')}
                        {renderStatCard('Pa Stok', stats.outOfStockItems, X, '#ef4444')}
                    </ScrollView>
                </View>

                {/* Filters & Search Header */}
                <View>
                    <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
                        <Search color={mutedColor} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder={t('search', language)}
                            placeholderTextColor={mutedColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <TouchableOpacity onPress={() => setShowScanner(true)}>
                            <Scan color={primaryColor} size={20} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {categories.map((cat, idx) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
                                style={[
                                    styles.filterChip,
                                    { backgroundColor: cardBg },
                                    ((selectedCategory === null && cat === 'All') || selectedCategory === cat) && { backgroundColor: primaryColor }
                                ]}
                            >
                                <Text style={[
                                    styles.filterText,
                                    { color: ((selectedCategory === null && cat === 'All') || selectedCategory === cat) ? '#fff' : mutedColor }
                                ]}>{cat === 'All' ? t('viewAll', language) : cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.sortContainer}>
                        <Text style={[styles.tinyLabel, { color: mutedColor }]}>RENDIT SIPAS:</Text>
                        <View style={styles.sortButtons}>
                            {(['name', 'price', 'stock'] as const).map(s => (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => setSortBy(s)}
                                    style={[
                                        styles.sortBtn,
                                        sortBy === s && { borderBottomColor: primaryColor, borderBottomWidth: 2 }
                                    ]}
                                >
                                    <Text style={[
                                        styles.sortBtnText,
                                        { color: sortBy === s ? primaryColor : mutedColor }
                                    ]}>{s.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {filteredProducts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Box color={mutedColor} size={48} opacity={0.2} />
                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                            {searchQuery ? 'Asnjë produkt nuk u gjet' : 'Asnjë produkt në inventar'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.productList}>
                        {filteredProducts.map(p => renderProduct(p))}
                    </View>
                )}
            </ScrollView>

            <BarcodeScannerModal
                visible={showScanner}
                onClose={() => setShowScanner(false)}
                onScanned={handleBarcodeScanned}
            />

            <FAB onPress={() => navigation.navigate('ProductForm')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    title: { fontSize: 28, fontWeight: '800' },
    iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    scrollContent: { paddingBottom: 100 },

    // Stats
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

    // Search & Filter
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginBottom: 16, gap: 12 },
    searchInput: { flex: 1, fontSize: 16 },

    filterScroll: { gap: 8, marginBottom: 16, paddingHorizontal: 20 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    filterText: { fontSize: 13, fontWeight: '600' },

    sortContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 20 },
    tinyLabel: { fontSize: 11, fontWeight: '700', opacity: 0.7 },
    sortButtons: { flexDirection: 'row', gap: 16 },
    sortBtn: { paddingVertical: 4 },
    sortBtnText: { fontSize: 12, fontWeight: '700' },

    productList: { paddingHorizontal: 20, gap: 12 },
    productCard: { padding: 16, borderRadius: 16 },
    productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    productInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    productName: { fontSize: 16, fontWeight: '700' },
    categoryBadge: { backgroundColor: 'rgba(129, 140, 248, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    categoryText: { color: '#818cf8', fontSize: 10, fontWeight: '700' },
    productSku: { fontSize: 12, marginTop: 4 },
    stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    stockText: { fontSize: 12, fontWeight: '600' },

    productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    productPrice: { color: '#10b981', fontSize: 20, fontWeight: '800' },
    unitText: { fontSize: 12, fontWeight: '600' },
    taxBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(129, 140, 248, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    taxText: { color: '#818cf8', fontSize: 10, fontWeight: '700' },
    deleteButton: { padding: 8 },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 16 },
    emptyText: { fontSize: 14, fontWeight: '500' },
});
