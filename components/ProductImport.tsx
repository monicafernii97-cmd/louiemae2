import React, { useState, useMemo } from 'react';
import { Search, Loader2, Check, X, ShoppingBag, Star, DollarSign, Wand2, Truck, Package, Plus, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Link, ChevronLeft, ChevronRight } from 'lucide-react';
import { aliexpressService, AliExpressProduct, AliExpressSearchResult } from '../services/aliexpressService';
import { CollectionType, Product, CollectionConfig } from '../types';
import { generateProductName, generateProductDescription } from '../services/geminiService';

interface ProductImportProps {
    collections: CollectionConfig[];
    onImportProducts: (products: Omit<Product, 'id'>[]) => void;
}

interface ImportableProduct extends AliExpressProduct {
    selected: boolean;
    customName?: string;
    customPrice?: number;
    customDescription?: string;
    targetCollection?: CollectionType;
    targetSubcategory?: string;
    isEnhancing?: boolean;
}

// Pricing rules configuration
interface PricingRule {
    type: 'percentage' | 'fixed';
    value: number;
    roundUp: boolean;
}

const DEFAULT_PRICING_RULE: PricingRule = {
    type: 'percentage',
    value: 45, // 45% markup
    roundUp: true
};

export const ProductImport: React.FC<ProductImportProps> = ({ collections, onImportProducts }) => {
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<ImportableProduct[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(1);

    // URL Import state
    const [importUrl, setImportUrl] = useState('');
    const [isImportingUrl, setIsImportingUrl] = useState(false);

    // Filters
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [minRating, setMinRating] = useState<number>(4.0);
    const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'orders'>('default');

    // Import settings
    const [targetCollection, setTargetCollection] = useState<string>(collections[0]?.id || 'furniture');
    const [targetSubcategory, setTargetSubcategory] = useState<string>('');
    const [pricingRule, setPricingRule] = useState<PricingRule>(DEFAULT_PRICING_RULE);
    const [showPricingSettings, setShowPricingSettings] = useState(false);

    // Get subcategories for the currently selected collection
    const currentCollectionSubcategories = useMemo(() => {
        const collection = collections.find(c => c.id === targetCollection);
        return collection?.subcategories || [];
    }, [collections, targetCollection]);

    // Get subcategories for a specific collection (for per-product selection)
    const getSubcategoriesForCollection = (collectionId: string) => {
        const collection = collections.find(c => c.id === collectionId);
        return collection?.subcategories || [];
    };

    // Selection state
    const [selectAll, setSelectAll] = useState(false);

    // Calculate marked-up price
    const calculateFinalPrice = (basePrice: number): number => {
        let finalPrice: number;
        if (pricingRule.type === 'percentage') {
            finalPrice = basePrice * (1 + pricingRule.value / 100);
        } else {
            finalPrice = basePrice + pricingRule.value;
        }

        if (pricingRule.roundUp) {
            // Round to nearest .99
            finalPrice = Math.ceil(finalPrice) - 0.01;
        }

        return Math.max(finalPrice, 0);
    };

    // Search handler
    const handleSearch = async (page = 1) => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            // Use aggregated search to get products from both AliExpress and Alibaba
            const result = await aliexpressService.searchAllSources({
                query: searchQuery,
                page,
                pageSize: 50, // Increased from 20 for more product selection
                minPrice: minPrice ? parseFloat(minPrice) : undefined,
                maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
                sortBy: sortBy === 'default' ? undefined : sortBy,
                sources: ['aliexpress', 'alibaba'], // Fetch from both sources
            });

            // Filter by minimum rating and transform to ImportableProduct
            const filteredProducts = result.products
                .filter(p => p.averageRating >= minRating)
                .map(p => ({
                    ...p,
                    selected: false,
                    targetCollection: targetCollection as CollectionType,
                    customPrice: calculateFinalPrice(p.salePrice || p.price)
                }));

            setSearchResults(filteredProducts);
            setTotalResults(result.totalCount);
            setTotalPages(result.totalPages || Math.ceil(result.totalCount / 20));
            setCurrentPage(page);
            setSelectAll(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Toggle product selection
    const toggleProductSelection = (productId: string) => {
        setSearchResults(prev => prev.map(p =>
            p.id === productId ? { ...p, selected: !p.selected } : p
        ));
    };

    // Toggle select all
    const handleSelectAll = () => {
        const newSelectAll = !selectAll;
        setSelectAll(newSelectAll);
        setSearchResults(prev => prev.map(p => ({ ...p, selected: newSelectAll })));
    };

    // Update product custom field
    const updateProductField = (productId: string, field: keyof ImportableProduct, value: any) => {
        setSearchResults(prev => prev.map(p =>
            p.id === productId ? { ...p, [field]: value } : p
        ));
    };

    // AI Enhancement - Generate better name and description
    const enhanceProductWithAI = async (productId: string) => {
        const product = searchResults.find(p => p.id === productId);
        if (!product) return;

        updateProductField(productId, 'isEnhancing', true);

        try {
            // Generate enhanced name
            const enhancedName = await generateProductName(product.name, targetCollection);

            // Generate enhanced description
            const enhancedDescription = await generateProductDescription(
                enhancedName || product.name,
                product.category || targetCollection,
                targetCollection
            );

            updateProductField(productId, 'customName', enhancedName);
            updateProductField(productId, 'customDescription', enhancedDescription);
        } catch (err) {
            console.error('AI enhancement failed:', err);
        } finally {
            updateProductField(productId, 'isEnhancing', false);
        }
    };

    // Enhance all selected products
    const enhanceAllSelected = async () => {
        const selectedProducts = searchResults.filter(p => p.selected);
        for (const product of selectedProducts) {
            await enhanceProductWithAI(product.id);
        }
    };

    // Import selected products
    const handleImport = () => {
        const selectedProducts = searchResults.filter(p => p.selected);

        if (selectedProducts.length === 0) {
            setError('Please select at least one product to import');
            return;
        }

        const productsToImport: Omit<Product, 'id'>[] = selectedProducts.map(p => {
            // Get the subcategory title for this product
            const productCollection = p.targetCollection || targetCollection;
            const productSubcategory = p.targetSubcategory || targetSubcategory;
            const subcategories = getSubcategoriesForCollection(productCollection);
            const subcategoryTitle = subcategories.find(s => s.id === productSubcategory)?.title || productSubcategory || p.category || 'General';

            return {
                name: p.customName || p.name,
                price: p.customPrice || calculateFinalPrice(p.salePrice || p.price),
                description: p.customDescription || p.description || '',
                images: p.images,
                category: subcategoryTitle,
                collection: productCollection as CollectionType,
                isNew: true,
                inStock: p.inStock,
                variants: p.variants // Pass through any variants (sizes, colors)
            };
        });

        onImportProducts(productsToImport);

        // Clear selection after import
        setSearchResults(prev => prev.map(p => ({ ...p, selected: false })));
        setSelectAll(false);
    };

    // Import product directly by AliExpress URL
    const handleImportByUrl = async () => {
        if (!importUrl.trim()) return;

        setIsImportingUrl(true);
        setError(null);

        try {
            // Extract product ID from URL
            // URLs look like: https://www.aliexpress.com/item/1234567890.html
            // or: https://www.aliexpress.us/item/3256810410643971.html
            const urlMatch = importUrl.match(/item\/(\d+)/);
            if (!urlMatch) {
                setError('Invalid AliExpress URL. Please paste a product URL like: aliexpress.com/item/1234567890.html');
                return;
            }

            const productId = urlMatch[1];

            // Fetch product details from API
            const product = await aliexpressService.getProductDetails(productId);

            if (!product) {
                setError('Could not find product. Please check the URL and try again.');
                return;
            }

            // Add to search results so user can preview, enhance, and import
            const importableProduct: ImportableProduct = {
                ...product,
                selected: true,
                targetCollection: targetCollection as CollectionType,
                customPrice: calculateFinalPrice(product.salePrice || product.price)
            };

            setSearchResults(prev => [importableProduct, ...prev]);
            setImportUrl('');

        } catch (err) {
            console.error('Import by URL failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to import product');
        } finally {
            setIsImportingUrl(false);
        }
    };

    const selectedCount = searchResults.filter(p => p.selected).length;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="border-b border-earth/10 pb-6">
                <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Product Sourcing</span>
                <h1 className="font-serif text-4xl text-earth">Import from AliExpress</h1>
                <p className="text-earth/60 text-sm mt-2">Search, curate, and import products to your catalog</p>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-6 border border-earth/5 shadow-sm space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-earth/30" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search for products (e.g., 'minimalist wooden furniture')"
                            className="w-full pl-12 pr-4 py-4 border border-earth/10 focus:outline-none focus:border-bronze text-earth font-serif text-lg"
                        />
                    </div>
                    <button
                        onClick={() => handleSearch()}
                        disabled={isSearching || !searchQuery.trim()}
                        className="bg-earth text-cream px-8 py-4 text-[10px] uppercase tracking-[0.25em] hover:bg-bronze transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Search
                    </button>
                </div>

                {/* Import by URL */}
                <div className="flex gap-4 pt-4 border-t border-earth/5">
                    <div className="flex-1 relative">
                        <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-earth/30" />
                        <input
                            type="text"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleImportByUrl()}
                            placeholder="Or paste AliExpress product URL (e.g., aliexpress.com/item/1234567890.html)"
                            className="w-full pl-12 pr-4 py-3 border border-earth/10 focus:outline-none focus:border-bronze text-earth text-sm"
                        />
                    </div>
                    <button
                        onClick={handleImportByUrl}
                        disabled={isImportingUrl || !importUrl.trim()}
                        className="bg-bronze/10 text-bronze px-6 py-3 text-[10px] uppercase tracking-[0.25em] hover:bg-bronze hover:text-cream transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isImportingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Import URL
                    </button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-earth/5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-earth/40">Price:</span>
                        <input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            placeholder="Min"
                            className="w-20 px-2 py-1 border border-earth/10 text-sm"
                        />
                        <span className="text-earth/40">-</span>
                        <input
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            placeholder="Max"
                            className="w-20 px-2 py-1 border border-earth/10 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-earth/40">Min Rating:</span>
                        <select
                            value={minRating}
                            onChange={(e) => setMinRating(parseFloat(e.target.value))}
                            className="px-2 py-1 border border-earth/10 text-sm"
                        >
                            <option value={0}>Any</option>
                            <option value={3.5}>3.5+ ⭐</option>
                            <option value={4.0}>4.0+ ⭐</option>
                            <option value={4.5}>4.5+ ⭐</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-earth/40">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-2 py-1 border border-earth/10 text-sm"
                        >
                            <option value="default">Best Match</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="orders">Most Orders</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-earth/40">Import to:</span>
                        <select
                            value={targetCollection}
                            onChange={(e) => {
                                setTargetCollection(e.target.value);
                                setTargetSubcategory(''); // Reset subcategory when collection changes
                            }}
                            className="px-2 py-1 border border-earth/10 text-sm"
                        >
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                        <span className="text-earth/20">›</span>
                        <select
                            value={targetSubcategory}
                            onChange={(e) => setTargetSubcategory(e.target.value)}
                            className="px-2 py-1 border border-earth/10 text-sm"
                        >
                            <option value="">Select Subcategory</option>
                            {currentCollectionSubcategories.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.title}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Pricing Settings */}
            <div className="bg-white border border-earth/5 shadow-sm">
                <button
                    onClick={() => setShowPricingSettings(!showPricingSettings)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-cream/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-bronze" />
                        <span className="font-serif text-lg text-earth">Pricing Rules</span>
                        <span className="text-xs text-earth/50 bg-cream/50 px-2 py-1 rounded">
                            +{pricingRule.value}{pricingRule.type === 'percentage' ? '%' : '$'} markup
                        </span>
                    </div>
                    {showPricingSettings ? <ChevronUp className="w-5 h-5 text-earth/40" /> : <ChevronDown className="w-5 h-5 text-earth/40" />}
                </button>

                {showPricingSettings && (
                    <div className="p-6 border-t border-earth/5 space-y-4">
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Markup Type</label>
                                <select
                                    value={pricingRule.type}
                                    onChange={(e) => setPricingRule({ ...pricingRule, type: e.target.value as 'percentage' | 'fixed' })}
                                    className="w-full px-3 py-2 border border-earth/10"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">
                                    Markup {pricingRule.type === 'percentage' ? '(%)' : '($)'}
                                </label>
                                <input
                                    type="number"
                                    value={pricingRule.value}
                                    onChange={(e) => setPricingRule({ ...pricingRule, value: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-earth/10"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Round Up</label>
                                <button
                                    onClick={() => setPricingRule({ ...pricingRule, roundUp: !pricingRule.roundUp })}
                                    className={`w-full px-3 py-2 border ${pricingRule.roundUp ? 'bg-bronze text-cream border-bronze' : 'border-earth/10 text-earth'}`}
                                >
                                    {pricingRule.roundUp ? '✓ Round to .99' : 'Exact Price'}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-earth/50">
                            Example: ${10} base price → ${calculateFinalPrice(10).toFixed(2)} final price
                        </p>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 p-4 flex items-center gap-3 text-red-800">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Results Header with Bulk Actions */}
            {searchResults.length > 0 && (
                <div className="bg-white p-4 border border-earth/5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={handleSelectAll}
                                className="w-5 h-5 accent-bronze"
                            />
                            <span className="text-sm text-earth">Select All</span>
                        </label>
                        <span className="text-earth/40 text-sm">|</span>
                        <span className="text-sm text-earth/60">
                            Showing {searchResults.length} of {totalResults.toLocaleString()} products
                            {totalPages > 1 && <span className="text-earth/40"> (Page {currentPage} of {totalPages})</span>}
                        </span>
                        {selectedCount > 0 && (
                            <span className="bg-bronze/10 text-bronze px-2 py-1 text-xs rounded">{selectedCount} selected</span>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={enhanceAllSelected}
                            disabled={selectedCount === 0}
                            className="flex items-center gap-2 px-4 py-2 border border-earth/10 text-earth text-xs uppercase tracking-widest hover:bg-cream/30 disabled:opacity-50 transition-colors"
                        >
                            <Wand2 className="w-4 h-4" />
                            AI Enhance Selected
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={selectedCount === 0}
                            className="flex items-center gap-2 px-6 py-2 bg-earth text-cream text-xs uppercase tracking-widest hover:bg-bronze disabled:opacity-50 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Import {selectedCount > 0 ? `(${selectedCount})` : ''}
                        </button>
                    </div>
                </div>
            )}

            {/* Product Grid */}
            {isSearching ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-bronze" />
                    <span className="ml-4 text-earth/60">Searching AliExpress...</span>
                </div>
            ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {searchResults.map((product) => (
                        <div
                            key={product.id}
                            className={`bg-white border shadow-sm transition-all ${product.selected ? 'border-bronze ring-2 ring-bronze/20' : 'border-earth/5 hover:border-earth/20'
                                }`}
                        >
                            <div className="flex">
                                {/* Product Image */}
                                <div className="w-40 h-40 flex-shrink-0 relative">
                                    <img
                                        src={product.images[0] || 'https://via.placeholder.com/160'}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Selection checkbox */}
                                    <label className="absolute top-2 left-2 w-6 h-6 bg-white rounded shadow flex items-center justify-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={product.selected}
                                            onChange={() => toggleProductSelection(product.id)}
                                            className="w-4 h-4 accent-bronze"
                                        />
                                    </label>
                                </div>

                                {/* Product Details */}
                                <div className="flex-1 p-4 space-y-3">
                                    {/* Title - Editable if selected */}
                                    <div>
                                        {product.selected ? (
                                            <input
                                                type="text"
                                                value={product.customName || product.name}
                                                onChange={(e) => updateProductField(product.id, 'customName', e.target.value)}
                                                className="w-full font-serif text-lg text-earth border-b border-earth/10 focus:outline-none focus:border-bronze pb-1"
                                            />
                                        ) : (
                                            <h3 className="font-serif text-lg text-earth line-clamp-2">{product.name}</h3>
                                        )}
                                    </div>

                                    {/* Price Row */}
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="text-[10px] uppercase tracking-widest text-earth/40 block">Cost</span>
                                            <span className="text-earth/60">${(product.salePrice || product.price).toFixed(2)}</span>
                                        </div>
                                        <span className="text-earth/20">→</span>
                                        <div>
                                            <span className="text-[10px] uppercase tracking-widest text-earth/40 block">Your Price</span>
                                            {product.selected ? (
                                                <input
                                                    type="number"
                                                    value={product.customPrice || calculateFinalPrice(product.salePrice || product.price)}
                                                    onChange={(e) => updateProductField(product.id, 'customPrice', parseFloat(e.target.value))}
                                                    className="w-24 text-bronze font-bold border-b border-earth/10 focus:outline-none focus:border-bronze"
                                                />
                                            ) : (
                                                <span className="text-bronze font-bold">
                                                    ${calculateFinalPrice(product.salePrice || product.price).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="ml-auto flex items-center gap-1 text-amber-500">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span className="text-sm">{product.averageRating.toFixed(1)}</span>
                                        </div>
                                    </div>

                                    {/* Meta Row */}
                                    <div className="flex items-center gap-4 text-xs text-earth/50">
                                        <span className="flex items-center gap-1">
                                            <Package className="w-3 h-3" />
                                            {product.reviewCount} sold
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Truck className="w-3 h-3" />
                                            {product.shippingInfo.freeShipping ? 'Free Shipping' : product.shippingInfo.estimatedDays}
                                        </span>
                                        {product.productUrl && (
                                            <a
                                                href={product.productUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 hover:text-bronze ml-auto"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                View on {product.source === 'alibaba' ? 'Alibaba' : product.source === 'aliexpress-true' ? 'AliExpress' : 'AliExpress'}
                                            </a>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    {product.selected && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-earth/5 flex-wrap">
                                            <select
                                                value={product.targetCollection || targetCollection}
                                                onChange={(e) => {
                                                    updateProductField(product.id, 'targetCollection', e.target.value);
                                                    updateProductField(product.id, 'targetSubcategory', ''); // Reset subcategory
                                                }}
                                                className="text-xs px-2 py-1 border border-earth/10"
                                            >
                                                {collections.map(c => (
                                                    <option key={c.id} value={c.id}>{c.title}</option>
                                                ))}
                                            </select>
                                            <span className="text-earth/20">›</span>
                                            <select
                                                value={product.targetSubcategory || ''}
                                                onChange={(e) => updateProductField(product.id, 'targetSubcategory', e.target.value)}
                                                className="text-xs px-2 py-1 border border-earth/10"
                                            >
                                                <option value="">Subcategory</option>
                                                {getSubcategoriesForCollection(product.targetCollection || targetCollection).map(sub => (
                                                    <option key={sub.id} value={sub.id}>{sub.title}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => enhanceProductWithAI(product.id)}
                                                disabled={product.isEnhancing}
                                                className="flex items-center gap-1 px-3 py-1 border border-earth/10 text-xs hover:bg-cream/30 disabled:opacity-50 ml-auto"
                                            >
                                                {product.isEnhancing ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Wand2 className="w-3 h-3" />
                                                )}
                                                AI Enhance
                                            </button>
                                        </div>
                                    )}

                                    {/* Enhanced Description Preview */}
                                    {product.customDescription && product.selected && (
                                        <div className="pt-2">
                                            <textarea
                                                value={product.customDescription}
                                                onChange={(e) => updateProductField(product.id, 'customDescription', e.target.value)}
                                                className="w-full text-xs text-earth/70 border border-earth/10 p-2 h-16 resize-none"
                                                placeholder="Product description..."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : searchQuery && !isSearching ? (
                <div className="text-center py-20 text-earth/50">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No products found. Try a different search term.</p>
                </div>
            ) : (
                <div className="text-center py-20 text-earth/50 bg-cream/30 rounded-lg border border-dashed border-earth/20">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="font-serif text-lg mb-2">Search AliExpress Products</p>
                    <p className="text-sm">Enter a search term above to find products to import</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && searchResults.length > 0 && (
                <div className="bg-white p-4 border border-earth/5 shadow-sm flex items-center justify-between">
                    <button
                        onClick={() => handleSearch(currentPage - 1)}
                        disabled={currentPage === 1 || isSearching}
                        className="flex items-center gap-2 px-4 py-2 border border-earth/10 text-sm disabled:opacity-50 hover:bg-cream/30 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </button>

                    <div className="flex items-center gap-2">
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handleSearch(pageNum)}
                                    disabled={isSearching}
                                    className={`w-10 h-10 text-sm transition-colors ${currentPage === pageNum
                                        ? 'bg-bronze text-cream'
                                        : 'border border-earth/10 hover:bg-cream/30'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                            <>
                                <span className="text-earth/40">...</span>
                                <button
                                    onClick={() => handleSearch(totalPages)}
                                    disabled={isSearching}
                                    className="w-10 h-10 border border-earth/10 text-sm hover:bg-cream/30"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => handleSearch(currentPage + 1)}
                        disabled={currentPage >= totalPages || isSearching}
                        className="flex items-center gap-2 px-4 py-2 border border-earth/10 text-sm disabled:opacity-50 hover:bg-cream/30 transition-colors"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductImport;
