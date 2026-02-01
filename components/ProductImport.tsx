import React, { useState, useMemo } from 'react';
import { Search, Loader2, Check, X, ShoppingBag, Star, DollarSign, Wand2, Truck, Package, Plus, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Link, ChevronLeft, ChevronRight, Globe, Sparkles, Filter } from 'lucide-react';
import { aliexpressService, AliExpressProduct } from '../services/aliexpressService';
import { CollectionType, Product, CollectionConfig } from '../types';
import { generateProductName, generateProductDescription } from '../services/geminiService';
import { FadeIn } from './FadeIn';

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
            // Use aggregated search to get products from external sources
            const result = await aliexpressService.searchAllSources({
                query: searchQuery,
                page,
                pageSize: 100,
                minPrice: minPrice ? parseFloat(minPrice) : undefined,
                maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
                sortBy: sortBy === 'default' ? undefined : sortBy,
                sources: ['aliexpress', 'alibaba'],
            });

            // Transform to ImportableProduct
            const filteredProducts = result.products
                .filter(p => minRating === 0 || (p.averageRating || 0) >= minRating)
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

    // AI Enhancement
    const enhanceProductWithAI = async (productId: string) => {
        const product = searchResults.find(p => p.id === productId);
        if (!product) return;

        updateProductField(productId, 'isEnhancing', true);

        try {
            const enhancedName = await generateProductName(product.name, targetCollection);
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

    // Enhance all selected
    const enhanceAllSelected = async () => {
        const selectedProducts = searchResults.filter(p => p.selected);
        for (const product of selectedProducts) {
            await enhanceProductWithAI(product.id);
        }
    };

    // Import selected
    const handleImport = () => {
        const selectedProducts = searchResults.filter(p => p.selected);

        if (selectedProducts.length === 0) {
            setError('Please select at least one product to import');
            return;
        }

        const productsToImport: Omit<Product, 'id'>[] = selectedProducts.map(p => {
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
                variants: p.variants,
                sourceUrl: p.productUrl || '',
                cjSourcingStatus: p.productUrl ? 'pending' as const : 'none' as const,
            };
        });

        onImportProducts(productsToImport);
        setSearchResults(prev => prev.map(p => ({ ...p, selected: false })));
        setSelectAll(false);
    };

    // URL Import
    const handleImportByUrl = async () => {
        if (!importUrl.trim()) return;

        setIsImportingUrl(true);
        setError(null);

        try {
            const urlMatch = importUrl.match(/item\/(\d+)/);
            if (!urlMatch) {
                setError('Invalid URL. Please paste a direct product link.');
                return;
            }

            const productId = urlMatch[1];
            const product = await aliexpressService.getProductDetails(productId);

            if (!product) {
                setError('Could not find product details.');
                return;
            }

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
        <div className="space-y-12">
            {/* Header */}
            <div>
                <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Catalog Management</span>
                <h1 className="font-serif text-4xl text-earth">Product Sourcing</h1>
                <p className="text-earth/50 text-sm mt-3 max-w-2xl font-sans leading-relaxed">
                    Discovery and import products from global marketplaces. Curate your catalog with AI-enhanced descriptions and automated pricing rules.
                </p>
            </div>

            {/* Main Control Hub - Glass Effect */}
            <FadeIn>
                <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_10px_40px_-10px_rgba(74,59,50,0.05)] rounded-2xl p-8 relative overflow-hidden group">
                    {/* Decorative gradient blob */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-bronze/5 rounded-full blur-3xl pointer-events-none group-hover:bg-bronze/10 transition-colors duration-1000"></div>

                    {/* Search & URL Inputs */}
                    <div className="space-y-6 relative z-10">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-earth/20 group-hover:text-bronze/50 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search global products (e.g., 'minimalist walnut chair')..."
                                className="w-full pl-18 pr-6 py-6 bg-white/50 border border-earth/5 rounded-xl focus:outline-none focus:border-bronze/30 focus:bg-white text-earth font-serif text-2xl placeholder:text-earth/20 transition-all shadow-inner"
                            />
                            <button
                                onClick={() => handleSearch()}
                                disabled={isSearching || !searchQuery.trim()}
                                className="absolute right-3 top-3 bottom-3 bg-earth text-cream px-8 rounded-lg text-[10px] uppercase tracking-[0.2em] hover:bg-bronze hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:bg-earth shadow-lg"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                            </button>
                        </div>

                        {/* Advanced Filters Bar - Glassy Capsule */}
                        <div className="flex flex-wrap items-center gap-4 bg-white/40 border border-earth/5 rounded-full px-6 py-3 shadow-sm backdrop-blur-md">
                            <div className="flex items-center gap-2 border-r border-earth/10 pr-4">
                                <Filter className="w-3 h-3 text-bronze" />
                                <span className="text-[9px] uppercase tracking-widest text-earth/40">Filters</span>
                            </div>

                            {/* Price Range */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-earth/60">Price</span>
                                <input
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    placeholder="Min"
                                    className="w-16 bg-transparent border-b border-earth/10 text-xs py-1 text-center focus:outline-none focus:border-bronze"
                                />
                                <span className="text-earth/20">-</span>
                                <input
                                    type="number"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    placeholder="Max"
                                    className="w-16 bg-transparent border-b border-earth/10 text-xs py-1 text-center focus:outline-none focus:border-bronze"
                                />
                            </div>

                            <span className="text-earth/10">|</span>

                            {/* Rating */}
                            <select
                                value={minRating}
                                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                                className="bg-transparent text-xs text-earth/60 focus:outline-none cursor-pointer"
                            >
                                <option value={0}>Any Rating</option>
                                <option value={4.0}>4.0+ Stars</option>
                                <option value={4.5}>4.5+ Stars</option>
                            </select>

                            <span className="text-earth/10">|</span>

                            {/* Sorting */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-transparent text-xs text-earth/60 focus:outline-none cursor-pointer"
                            >
                                <option value="default">Best Match</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                                <option value="orders">Popularity</option>
                            </select>

                            {/* URL Toggle Button (Small) */}
                            <div className="ml-auto">
                                <button
                                    onClick={() => setImportUrl(importUrl ? '' : 'https://')}
                                    className="text-[9px] uppercase tracking-widest text-bronze hover:underline opacity-60 hover:opacity-100 transition-opacity"
                                >
                                    + Import via URL
                                </button>
                            </div>
                        </div>

                        {/* URL Import (Collapsible) */}
                        {importUrl !== '' && (
                            <FadeIn className="pt-2">
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-earth/30" />
                                        <input
                                            type="text"
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleImportByUrl()}
                                            placeholder="Paste external product URL..."
                                            className="w-full pl-10 pr-4 py-3 bg-white/40 border border-earth/5 rounded-lg text-sm focus:outline-none focus:border-bronze/50"
                                        />
                                    </div>
                                    <button
                                        onClick={handleImportByUrl}
                                        disabled={isImportingUrl}
                                        className="bg-bronze/10 text-bronze px-6 rounded-lg text-xs uppercase tracking-widest hover:bg-bronze hover:text-white transition-colors"
                                    >
                                        Import
                                    </button>
                                </div>
                            </FadeIn>
                        )}
                    </div>
                </div>
            </FadeIn>

            {/* Import & Search Results */}
            {searchResults.length > 0 && (
                <div className="space-y-6">
                    {/* Action Toolbar */}
                    <div className="sticky top-0 z-40 bg-[#F9F7F2]/90 backdrop-blur-md py-4 border-b border-earth/5 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectAll ? 'bg-bronze border-bronze' : 'border-earth/20 group-hover:border-bronze'}`}>
                                    {selectAll && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="hidden" />
                                <span className="text-xs uppercase tracking-widest text-earth/60 group-hover:text-earth transition-colors">Select All</span>
                            </label>

                            <div className="h-4 w-px bg-earth/10"></div>

                            <span className="text-xs text-earth/40">
                                {searchResults.length} Results
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={targetCollection}
                                onChange={(e) => {
                                    setTargetCollection(e.target.value);
                                    setTargetSubcategory('');
                                }}
                                className="bg-transparent border-b border-earth/10 py-1 text-xs text-earth focus:outline-none focus:border-bronze"
                            >
                                {collections.map(c => <option key={c.id} value={c.id}>To: {c.title}</option>)}
                            </select>

                            <button
                                onClick={enhanceAllSelected}
                                disabled={selectedCount === 0}
                                className="p-2 text-earth/40 hover:text-purple-600 disabled:opacity-20 transition-colors"
                                title="Enhance all selected"
                            >
                                <Sparkles className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleImport}
                                disabled={selectedCount === 0}
                                className="bg-earth text-white px-6 py-2 rounded-full text-xs uppercase tracking-widest hover:bg-bronze shadow-lg shadow-bronze/10 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                            >
                                Import {selectedCount > 0 ? `(${selectedCount})` : ''}
                            </button>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                        {searchResults.map((product, idx) => (
                            <FadeIn key={product.id} delay={idx * 50}>
                                <div
                                    className={`group bg-white rounded-xl overflow-hidden border transition-all duration-300 ${product.selected
                                            ? 'border-bronze shadow-[0_0_0_1px_rgba(166,124,82,1),0_20px_40px_-10px_rgba(166,124,82,0.15)] ring-1 ring-bronze'
                                            : 'border-earth/5 shadow-sm hover:shadow-lg hover:-translate-y-1'
                                        }`}
                                >
                                    <div className="flex h-48 relative">
                                        <div className="w-1/3 relative overflow-hidden bg-cream/20">
                                            <img
                                                src={product.images[0] || 'https://via.placeholder.com/160'}
                                                alt={product.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <label className="absolute top-3 left-3 w-6 h-6 bg-white/90 backdrop-blur rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:scale-110 transition-transform">
                                                <input
                                                    type="checkbox"
                                                    checked={product.selected}
                                                    onChange={() => toggleProductSelection(product.id)}
                                                    className="hidden"
                                                />
                                                <div className={`w-3 h-3 rounded-full ${product.selected ? 'bg-bronze' : 'border border-earth/20'}`}></div>
                                            </label>
                                        </div>

                                        <div className="w-2/3 p-4 flex flex-col justify-between relative bg-white">
                                            <div>
                                                {product.selected ? (
                                                    <input
                                                        type="text"
                                                        value={product.customName || product.name}
                                                        onChange={(e) => updateProductField(product.id, 'customName', e.target.value)}
                                                        className="w-full font-serif text-earth text-sm border-b border-earth/10 focus:border-bronze focus:outline-none bg-transparent"
                                                    />
                                                ) : (
                                                    <h3 className="font-serif text-earth text-sm leading-snug line-clamp-2 mb-1" title={product.name}>
                                                        {product.name}
                                                    </h3>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[10px] uppercase tracking-wider text-earth/40 bg-earth/5 px-2 py-0.5 rounded-sm">
                                                        {product.category || 'Item'}
                                                    </span>
                                                    <div className="ml-auto flex items-center gap-1 text-xs text-earth/60">
                                                        <Star className="w-3 h-3 text-bronze fill-bronze" />
                                                        {product.averageRating.toFixed(1)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between mt-4">
                                                <div>
                                                    <div className="text-[9px] uppercase tracking-widest text-earth/30">Markup Price</div>
                                                    <div className="text-lg font-serif text-bronze">
                                                        ${(product.customPrice || calculateFinalPrice(product.salePrice || product.price)).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[9px] uppercase tracking-widest text-earth/30">Cost</div>
                                                    <div className="font-serif text-earth/40 text-sm line-through decoration-earth/20">
                                                        ${(product.salePrice || product.price).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Interactive Actions Footer */}
                                    <div className={`px-4 py-3 bg-cream/20 border-t border-earth/5 flex items-center justify-between text-xs transition-opacity duration-300 ${product.selected ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}>
                                        <button
                                            onClick={() => enhanceProductWithAI(product.id)}
                                            className="flex items-center gap-2 text-earth/50 hover:text-purple-600 transition-colors"
                                        >
                                            {product.isEnhancing ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3 h-3" />
                                            )}
                                            AI Enhance
                                        </button>

                                        {product.productUrl && (
                                            <a href={product.productUrl} target="_blank" rel="noreferrer" className="text-earth/40 hover:text-bronze flex items-center gap-1">
                                                Source <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                    {/* Modern Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 py-8">
                            <button
                                onClick={() => handleSearch(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="w-10 h-10 rounded-full border border-earth/10 flex items-center justify-center text-earth/50 hover:border-bronze hover:text-bronze disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="font-serif text-earth text-lg">
                                {currentPage} <span className="text-earth/30 mx-1">/</span> {totalPages}
                            </span>
                            <button
                                onClick={() => handleSearch(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                                className="w-10 h-10 rounded-full border border-earth/10 flex items-center justify-center text-earth/50 hover:border-bronze hover:text-bronze disabled:opacity-20 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!isSearching && searchResults.length === 0 && (
                <FadeIn delay={200}>
                    <div className="text-center py-24 opacity-30">
                        <Globe className="w-16 h-16 mx-auto mb-4 text-earth" strokeWidth={1} />
                        <h3 className="font-serif text-2xl text-earth mb-2">Explore the World</h3>
                        <p className="max-w-md mx-auto text-sm">Search for unique items to add to your collection.</p>
                    </div>
                </FadeIn>
            )}
        </div>
    );
};

export default ProductImport;
