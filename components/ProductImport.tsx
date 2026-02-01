import React, { useState, useMemo } from 'react';
import { Search, Loader2, Check, X, Star, DollarSign, Wand2, Truck, Package, Plus, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Link, ChevronLeft, ChevronRight, Globe, Sparkles, Filter, Info, ArrowUpRight } from 'lucide-react';
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
        <div className="relative min-h-[80vh]">
            {/* Custom Styles for Float/Glow Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes float-delay {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(166,124,82,0.1); }
                    50% { box-shadow: 0 0 40px rgba(166,124,82,0.3); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delay { animation: float-delay 8s ease-in-out infinite 1s; }
                .animate-glow { animation: glow 4s ease-in-out infinite; }
                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px 0 rgba(74, 59, 50, 0.05);
                }
                .glass-card:hover {
                    background: rgba(255, 255, 255, 0.9);
                    border-color: rgba(166, 124, 82, 0.2);
                    transform: translateY(-5px);
                    box-shadow: 0 15px 40px -10px rgba(166, 124, 82, 0.15);
                }
            `}</style>

            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-bronze/5 to-transparent rounded-full blur-[100px] opacity-40 animate-float" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-earth/5 to-transparent rounded-full blur-[80px] opacity-30 animate-float-delay" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 space-y-12">

                {/* Header Section */}
                <div className="flex items-end justify-between border-b border-earth/5 pb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-8 h-[1px] bg-bronze/50 inline-block"></span>
                            <span className="text-bronze text-[10px] uppercase tracking-[0.4em]">Global Sourcing</span>
                        </div>
                        <h1 className="font-serif text-5xl text-earth tracking-tight">
                            Import & <span className="text-bronze italic">Curate</span>
                        </h1>
                    </div>
                </div>

                {/* Hero Search Module */}
                <FadeIn>
                    <div className="glass-card rounded-[2rem] p-10 relative group transition-all duration-700">
                        {/* Search Input */}
                        <div className="relative mb-8">
                            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-earth/30 group-hover:text-bronze transition-colors duration-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Discover premium products..."
                                className="w-full pl-20 pr-8 py-6 bg-white/40 border border-white/60 rounded-2xl text-2xl font-serif text-earth placeholder:text-earth/20 focus:outline-none focus:bg-white/80 focus:shadow-xl transition-all duration-500"
                            />
                            <button
                                onClick={() => handleSearch()}
                                disabled={isSearching || !searchQuery.trim()}
                                className="absolute right-3 top-3 bottom-3 bg-earth text-cream px-10 rounded-xl text-xs uppercase tracking-[0.25em] hover:bg-bronze hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:scale-100 shadow-lg"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                            </button>
                        </div>

                        {/* Floating Filters */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/30 rounded-full border border-white/40 backdrop-blur-sm">
                                <Filter className="w-3 h-3 text-bronze" />
                                <span className="text-[10px] uppercase tracking-widest text-earth/50">Filter By</span>
                            </div>

                            {/* Price */}
                            <div className="group/price relative flex items-center gap-2 px-6 py-3 bg-white/40 hover:bg-white rounded-full border border-white/20 hover:border-bronze/20 transition-all cursor-pointer">
                                <DollarSign className="w-3 h-3 text-earth/40 group-hover/price:text-bronze transition-colors" />
                                <input
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    placeholder="Min"
                                    className="w-12 bg-transparent text-xs text-center border-b border-earth/10 focus:border-bronze focus:outline-none"
                                />
                                <span className="text-earth/20">-</span>
                                <input
                                    type="number"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    placeholder="Max"
                                    className="w-12 bg-transparent text-xs text-center border-b border-earth/10 focus:border-bronze focus:outline-none"
                                />
                            </div>

                            {/* Rating */}
                            <div className="relative group/rating">
                                <select
                                    value={minRating}
                                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                                    className="appearance-none pl-4 pr-10 py-3 bg-white/40 hover:bg-white rounded-full border border-white/20 hover:border-bronze/20 text-xs text-earth/60 cursor-pointer focus:outline-none transition-all"
                                >
                                    <option value={0}>Any Rating</option>
                                    <option value={4.0}>4.0+ Stars</option>
                                    <option value={4.5}>4.5+ Stars</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-earth/30 pointer-events-none group-hover/rating:text-bronze transition-colors" />
                            </div>

                            {/* Sort */}
                            <div className="relative group/sort">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="appearance-none pl-4 pr-10 py-3 bg-white/40 hover:bg-white rounded-full border border-white/20 hover:border-bronze/20 text-xs text-earth/60 cursor-pointer focus:outline-none transition-all"
                                >
                                    <option value="default">Best Match</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="orders">Popularity</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-earth/30 pointer-events-none group-hover/sort:text-bronze transition-colors" />
                            </div>

                            <button
                                onClick={() => setImportUrl(importUrl ? '' : 'https://')}
                                className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-widest text-bronze hover:bg-bronze/5 px-4 py-2 rounded-full transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Import by URL
                            </button>
                        </div>

                        {/* URL Import Panel */}
                        {importUrl !== '' && (
                            <FadeIn className="mt-6 pt-6 border-t border-earth/5">
                                <div className="flex gap-4 items-center animate-glow p-1 rounded-xl">
                                    <div className="flex-1 relative">
                                        <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-earth/40" />
                                        <input
                                            type="text"
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleImportByUrl()}
                                            placeholder="Paste external product link..."
                                            className="w-full pl-10 pr-4 py-3 bg-white/60 border border-white/40 rounded-xl text-sm focus:outline-none focus:ring-2 ring-bronze/20 transition-all shadow-inner"
                                        />
                                    </div>
                                    <button
                                        onClick={handleImportByUrl}
                                        disabled={isImportingUrl}
                                        className="bg-bronze text-cream px-8 py-3 rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-bronze/20"
                                    >
                                        Import
                                    </button>
                                </div>
                            </FadeIn>
                        )}
                    </div>
                </FadeIn>

                {/* Results Section */}
                {searchResults.length > 0 && (
                    <div className="space-y-8">
                        {/* Floating Toolbar */}
                        <div className="sticky top-4 z-50 glass-card rounded-full px-6 py-3 flex items-center justify-between mb-8 animate-float-delay">
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${selectAll ? 'bg-bronze border-bronze scale-110' : 'border-earth/20 group-hover:border-bronze'}`}>
                                        {selectAll && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="hidden" />
                                    <span className="text-xs uppercase tracking-widest text-earth/60 group-hover:text-earth transition-colors">Select All</span>
                                </label>
                                <div className="h-4 w-px bg-earth/10"></div>
                                <span className="text-xs text-earth/40 font-medium">
                                    {searchResults.length} Products Found
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <select
                                    value={targetCollection}
                                    onChange={(e) => {
                                        setTargetCollection(e.target.value);
                                        setTargetSubcategory('');
                                    }}
                                    className="bg-transparent text-xs text-earth hover:text-bronze focus:outline-none cursor-pointer transition-colors"
                                >
                                    {collections.map(c => <option key={c.id} value={c.id}>To: {c.title}</option>)}
                                </select>

                                <button
                                    onClick={enhanceAllSelected}
                                    disabled={selectedCount === 0}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors disabled:opacity-20"
                                    title="Auto-Enhance Selected"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={handleImport}
                                    disabled={selectedCount === 0}
                                    className="bg-earth text-white px-6 py-2 rounded-full text-xs uppercase tracking-widest hover:bg-bronze hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                                >
                                    Import {selectedCount > 0 ? `(${selectedCount})` : ''}
                                </button>
                            </div>
                        </div>

                        {/* Product Grid - Masonry-ish Feel */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {searchResults.map((product, idx) => (
                                <FadeIn key={product.id} delay={idx * 50}>
                                    <div
                                        className={`glass-card rounded-2xl overflow-hidden transition-all duration-500 relative group
                                        ${product.selected ? 'ring-2 ring-bronze shadow-2xl scale-[1.02]' : 'hover:scale-[1.01]'}
                                    `}
                                    >
                                        {/* Action Overlay (Glass) */}
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-center items-center gap-3">
                                            <button
                                                onClick={() => toggleProductSelection(product.id)}
                                                className={`px-6 py-2 rounded-full text-xs uppercase tracking-widest transition-all transform hover:scale-105 shadow-lg ${product.selected ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-earth text-white hover:bg-bronze'}`}
                                            >
                                                {product.selected ? 'Deselect' : 'Select Product'}
                                            </button>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); enhanceProductWithAI(product.id); }}
                                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-purple-500 hover:text-purple-600 shadow-md hover:scale-110 transition-transform"
                                                    title="AI Enhance"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </button>
                                                {product.productUrl && (
                                                    <a
                                                        href={product.productUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-earth/60 hover:text-bronze shadow-md hover:scale-110 transition-transform"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Visible Content */}
                                        <div className="relative">
                                            <div className="h-64 overflow-hidden">
                                                <img
                                                    src={product.images[0] || 'https://via.placeholder.com/160'}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:blur-[2px]"
                                                />
                                            </div>

                                            {/* Status Badge */}
                                            {product.selected && (
                                                <div className="absolute top-4 right-4 bg-bronze text-white px-3 py-1 rounded-full text-[10px] uppercase tracking-widest shadow-lg animate-bounce">
                                                    Selected
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 relative z-0 bg-white/40">
                                            {product.selected ? (
                                                <div className="mb-4 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={product.customName || product.name}
                                                        onChange={(e) => updateProductField(product.id, 'customName', e.target.value)}
                                                        className="w-full bg-transparent border-b border-earth/10 focus:border-bronze font-serif text-lg text-earth pb-1 focus:outline-none"
                                                        placeholder="Product Name"
                                                    />
                                                </div>
                                            ) : (
                                                <h3 className="font-serif text-xl text-earth mb-2 line-clamp-2 leading-tight">
                                                    {product.name}
                                                </h3>
                                            )}

                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase tracking-widest text-earth/40">Price</span>
                                                    <span className="font-serif text-2xl text-bronze">
                                                        ${(product.customPrice || calculateFinalPrice(product.salePrice || product.price)).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] uppercase tracking-widest text-earth/40">Cost</span>
                                                    <span className="text-sm text-earth/40 line-through">
                                                        ${(product.salePrice || product.price).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-6 py-12">
                                <button
                                    onClick={() => handleSearch(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-earth/40 hover:text-bronze hover:scale-110 transition-all disabled:opacity-20 disabled:scale-100"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="font-serif text-2xl text-earth/80">
                                    {currentPage} <span className="text-earth/20 mx-2">/</span> {totalPages}
                                </span>
                                <button
                                    onClick={() => handleSearch(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-earth/40 hover:text-bronze hover:scale-110 transition-all disabled:opacity-20 disabled:scale-100"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State / Welcome */}
                {!isSearching && searchResults.length === 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <FadeIn delay={200}>
                            <div className="w-[400px] h-[400px] bg-gradient-to-t from-white/20 to-transparent rounded-full blur-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 animate-pulse"></div>
                            <Globe className="w-24 h-24 mx-auto mb-6 text-earth/10 animate-float-delay" strokeWidth={0.5} />
                            <h2 className="font-serif text-3xl text-earth/30">Start Your Collection</h2>
                        </FadeIn>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductImport;
