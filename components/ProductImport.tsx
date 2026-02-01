import React, { useState, useMemo } from 'react';
import { Search, Loader2, Check, X, Star, DollarSign, Wand2, Truck, Package, Plus, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Link, ChevronLeft, ChevronRight, Globe, Sparkles, Filter, Info, ArrowUpRight } from 'lucide-react';
import { aliexpressService, AliExpressProduct } from '../services/aliexpressService';
import { CollectionType, Product, CollectionConfig } from '../types';
import { generateProductNameV2, generateProductDescriptionV2, extractKeywords, ProductContext } from '../services/geminiService';
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
            const result = await aliexpressService.searchAllSources({
                query: searchQuery,
                page,
                pageSize: 100,
                minPrice: minPrice ? parseFloat(minPrice) : undefined,
                maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
                sortBy: sortBy === 'default' ? undefined : sortBy,
                sources: ['aliexpress', 'alibaba'],
            });

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

    // AI Enhancement with full product context
    const enhanceProductWithAI = async (productId: string) => {
        const product = searchResults.find(p => p.id === productId);
        if (!product) return;

        updateProductField(productId, 'isEnhancing', true);

        try {
            // Build full context for AI
            const context: ProductContext = {
                originalName: product.name,
                originalDescription: product.description || '',
                category: product.category || '',
                collection: product.targetCollection || targetCollection,
                keywords: extractKeywords(product.name + ' ' + (product.description || '')),
            };

            const enhancedName = await generateProductNameV2(context);
            const enhancedDescription = await generateProductDescriptionV2(context);

            updateProductField(productId, 'customName', enhancedName);
            updateProductField(productId, 'customDescription', enhancedDescription);
        } catch (err) {
            // TODO: Replace with toast notification
            console.error('AI enhancement failed:', err);
            setError('AI enhancement failed. Please try again.');
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

    // Import Multi-Step Workflow State
    const [importStep, setImportStep] = useState<'search' | 'review'>('search');
    const [reviewIndex, setReviewIndex] = useState(0);

    // Modify handleImport to start review instead of direct import
    const handleImport = () => {
        const selectedProducts = searchResults.filter(p => p.selected);

        if (selectedProducts.length === 0) {
            setError('Please select at least one product to import');
            return;
        }

        // Initialize review step
        setImportStep('review');
        setReviewIndex(0);
        setError(null);
    };

    // Final Import Action
    const confirmImport = () => {
        const selectedProducts = searchResults.filter(p => p.selected);

        const productsToImport: Omit<Product, 'id'>[] = selectedProducts.map(p => {
            const productCollection = p.targetCollection || targetCollection;
            const productSubcategory = p.targetSubcategory || targetSubcategory;
            const subcategories = getSubcategoriesForCollection(productCollection);
            const subcategoryTitle = subcategories.find(s => s.id === productSubcategory)?.title || productSubcategory || p.category || 'General';

            // Filter images if selection logic implemented (for now all, or first 5)
            // Ideally we'd have p.selectedImages
            const finalImages = p.images;

            return {
                name: p.customName || p.name,
                price: p.customPrice || calculateFinalPrice(p.salePrice || p.price),
                description: p.customDescription || p.description || '',
                images: finalImages,
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
        setImportStep('search');
    };

    // Helper to update current review item
    const updateReviewProduct = (field: keyof ImportableProduct, value: any) => {
        const currentProduct = searchResults.filter(p => p.selected)[reviewIndex];
        if (!currentProduct) return;
        updateProductField(currentProduct.id, field, value);
    };

    // Render Review Screen
    if (importStep === 'review') {
        const selectedProducts = searchResults.filter(p => p.selected);
        const currentProduct = selectedProducts[reviewIndex];
        const progress = ((reviewIndex + 1) / selectedProducts.length) * 100;

        if (!currentProduct) return <div>Error: Product not found</div>;

        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 relative z-20">
                <style>{`
                    .glass-panel {
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(40px);
                        border: 1px solid rgba(255, 255, 255, 0.5);
                        box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.1);
                    }
                `}</style>

                <FadeIn className="w-full max-w-6xl">
                    <div className="glass-panel rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/60">
                        {/* Header / Progress */}
                        <div className="bg-cream/50 p-8 border-b border-earth/5 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 bottom-0 bg-bronze/10 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                            <div className="relative z-10 flex items-center gap-4">
                                <button
                                    onClick={() => setImportStep('search')}
                                    className="flex items-center gap-2 text-earth/60 hover:text-earth transition-colors text-xs uppercase tracking-widest font-bold"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <div className="h-4 w-px bg-earth/10"></div>
                                <span className="text-xl font-serif text-earth">Reviewing {reviewIndex + 1} of {selectedProducts.length}</span>
                            </div>
                            <div className="relative z-10 flex gap-4">
                                <button
                                    onClick={() => setReviewIndex(prev => Math.max(0, prev - 1))}
                                    disabled={reviewIndex === 0}
                                    className="px-6 py-2 rounded-full border border-earth/10 hover:bg-white disabled:opacity-30 transition-all text-xs uppercase tracking-widest font-bold"
                                >
                                    Previous
                                </button>
                                {reviewIndex < selectedProducts.length - 1 ? (
                                    <button
                                        onClick={() => setReviewIndex(prev => Math.min(selectedProducts.length - 1, prev + 1))}
                                        className="px-8 py-2 rounded-full bg-earth text-cream hover:bg-bronze transition-all text-xs uppercase tracking-widest font-bold shadow-lg"
                                    >
                                        Next Item
                                    </button>
                                ) : (
                                    <button
                                        onClick={confirmImport}
                                        className="px-8 py-2 rounded-full bg-green-700 text-white hover:bg-green-600 transition-all text-xs uppercase tracking-widest font-bold shadow-lg shadow-green-900/20"
                                    >
                                        Complete Import ({selectedProducts.length})
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row h-[70vh]">
                            {/* Left: Product Images & Basic Info */}
                            <div className="w-full lg:w-1/3 bg-white/40 p-10 border-r border-earth/5 overflow-y-auto">
                                <div className="aspect-square rounded-2xl overflow-hidden mb-6 shadow-md border border-earth/5 bg-white relative group">
                                    <img
                                        src={currentProduct.images[0]}
                                        alt="Main Preview"
                                        className="w-full h-full object-contain p-4"
                                    />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-earth shadow-sm">
                                        {currentProduct.images.length} Images
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {currentProduct.images.slice(0, 4).map((img, i) => (
                                        <div key={i} className="aspect-square rounded-lg border border-earth/10 overflow-hidden bg-white hover:border-bronze cursor-pointer transition-colors">
                                            <img src={img} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 space-y-6">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-earth/50 font-bold block mb-2">Original URL</label>
                                        <a href={currentProduct.productUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-bronze hover:underline text-sm truncate">
                                            <Link className="w-3 h-3" />
                                            {currentProduct.productUrl || 'No Link'}
                                        </a>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-earth/50 font-bold block mb-2">Original Price</label>
                                        <span className="text-lg font-serif text-earth/60 line-through decoration-bronze/30">
                                            ${(currentProduct.salePrice || currentProduct.price).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Customization Form */}
                            <div className="w-full lg:w-2/3 p-10 space-y-8 overflow-y-auto bg-white/60">
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-6">
                                        {/* Product Name */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] uppercase tracking-widest text-earth/50 font-bold">Product Name</label>
                                                <button
                                                    onClick={() => enhanceProductWithAI(currentProduct.id)}
                                                    className="text-[10px] uppercase tracking-widest text-purple-600 flex items-center gap-1 hover:text-purple-700 font-bold"
                                                >
                                                    <Wand2 className="w-3 h-3" /> AI Enhance
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={currentProduct.customName || currentProduct.name}
                                                onChange={(e) => updateReviewProduct('customName', e.target.value)}
                                                className="w-full p-4 bg-white border border-earth/10 rounded-xl font-serif text-lg text-earth focus:ring-2 ring-bronze/20 focus:border-bronze transition-all shadow-sm"
                                            />
                                        </div>

                                        {/* Categorization */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase tracking-widest text-earth/50 font-bold">Collection</label>
                                                <div className="relative">
                                                    <select
                                                        value={currentProduct.targetCollection || targetCollection}
                                                        onChange={(e) => updateReviewProduct('targetCollection', e.target.value)}
                                                        className="w-full p-4 bg-white border border-earth/10 rounded-xl text-sm text-earth appearance-none focus:ring-2 ring-bronze/20 shadow-sm font-medium"
                                                    >
                                                        {collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-earth/30 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase tracking-widest text-earth/50 font-bold">Sub-Category</label>
                                                <div className="relative">
                                                    <select
                                                        value={currentProduct.targetSubcategory || targetSubcategory}
                                                        onChange={(e) => updateReviewProduct('targetSubcategory', e.target.value)}
                                                        className="w-full p-4 bg-white border border-earth/10 rounded-xl text-sm text-earth appearance-none focus:ring-2 ring-bronze/20 shadow-sm font-medium"
                                                    >
                                                        <option value="">Select Sub-Category</option>
                                                        {getSubcategoriesForCollection(currentProduct.targetCollection || targetCollection as string).map(s => (
                                                            <option key={s.id} value={s.id}>{s.title}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-earth/30 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="grid grid-cols-2 gap-6 bg-cream/30 p-6 rounded-2xl border border-earth/5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase tracking-widest text-earth/50 font-bold">Your Price ($)</label>
                                                <input
                                                    type="number"
                                                    value={currentProduct.customPrice || calculateFinalPrice(currentProduct.salePrice || currentProduct.price)}
                                                    onChange={(e) => updateReviewProduct('customPrice', parseFloat(e.target.value))}
                                                    className="w-full p-3 bg-white border border-earth/10 rounded-xl font-serif text-xl text-bronze font-bold focus:ring-2 ring-bronze/20 shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-1 flex flex-col justify-center">
                                                <div className="flex justify-between text-xs text-earth/60">
                                                    <span>Cost:</span>
                                                    <span>${(currentProduct.salePrice || currentProduct.price).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold text-green-700">
                                                    <span>Profit:</span>
                                                    <span>${((currentProduct.customPrice || calculateFinalPrice(currentProduct.salePrice || currentProduct.price)) - (currentProduct.salePrice || currentProduct.price)).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-2 flex-1">
                                            <label className="text-[10px] uppercase tracking-widest text-earth/50 font-bold">Description</label>
                                            <textarea
                                                rows={6}
                                                value={currentProduct.customDescription || currentProduct.description || ''}
                                                onChange={(e) => updateReviewProduct('customDescription', e.target.value)}
                                                className="w-full p-4 bg-white border border-earth/10 rounded-xl text-sm text-earth/80 focus:ring-2 ring-bronze/20 shadow-sm resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Variants Sidebar (if any) */}
                                    {currentProduct.variants && currentProduct.variants.length > 0 && (
                                        <div className="w-64 bg-white p-6 rounded-2xl border border-earth/10 shadow-sm h-fit">
                                            <h4 className="text-[10px] uppercase tracking-widest text-earth/50 font-bold mb-4">Variants Detected ({currentProduct.variants.length})</h4>
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {currentProduct.variants.map((variant, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 text-sm p-2 hover:bg-cream/50 rounded-lg transition-colors">
                                                        <div className="w-8 h-8 rounded border border-earth/10 bg-gray-50 flex items-center justify-center overflow-hidden">
                                                            {variant.image ? <img src={variant.image} className="w-full h-full object-cover" /> : <Package className="w-3 h-3 text-gray-300" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="truncate font-medium text-earth">{variant.name}</div>
                                                            <div className="text-xs text-earth/40">{variant.inStock ? 'In Stock' : 'Out of Stock'}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            </div>
        );
    }

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
                    background: rgba(255, 255, 255, 0.85); /* Increased opacity for contrast */
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(166, 124, 82, 0.1); /* Slight bronze tint to border */
                    box-shadow: 0 8px 32px 0 rgba(74, 59, 50, 0.1);
                }
                .glass-card:hover {
                    background: rgba(255, 255, 255, 0.95);
                    border-color: rgba(166, 124, 82, 0.3);
                    transform: translateY(-5px);
                    box-shadow: 0 20px 40px -10px rgba(166, 124, 82, 0.2);
                }
            `}</style>

            {/* Background Ambience - Slightly darker for contrast */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#F9F7F2]/30">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-bronze/10 to-transparent rounded-full blur-[100px] opacity-40 animate-float" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-earth/10 to-transparent rounded-full blur-[80px] opacity-30 animate-float-delay" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 space-y-12">

                {/* Header Section */}
                <div className="flex items-end justify-between border-b border-earth/10 pb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-8 h-[1px] bg-bronze inline-block"></span>
                            <span className="text-bronze text-[10px] uppercase tracking-[0.4em] font-bold">Global Sourcing</span>
                        </div>
                        <h1 className="font-serif text-5xl text-earth tracking-tight">
                            Import & <span className="text-bronze italic">Curate</span>
                        </h1>
                    </div>
                </div>

                {/* Hero Search Module */}
                <FadeIn>
                    <div className="glass-card rounded-[2rem] p-10 relative group transition-all duration-700 shadow-xl border border-white/50">
                        {/* Search Input - High Contrast */}
                        <div className="relative mb-8">
                            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-earth group-hover:text-bronze transition-colors duration-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Discover premium products..."
                                className="w-full pl-20 pr-8 py-6 bg-white border border-earth/10 rounded-2xl text-2xl font-serif text-earth placeholder:text-earth/40 focus:outline-none focus:ring-2 focus:ring-bronze/20 focus:border-bronze/50 transition-all shadow-sm"
                            />
                            <button
                                onClick={() => handleSearch()}
                                disabled={isSearching || !searchQuery.trim()}
                                className="absolute right-3 top-3 bottom-3 bg-earth text-cream px-10 rounded-xl text-xs uppercase tracking-[0.25em] font-bold hover:bg-bronze hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:scale-100 shadow-lg shadow-earth/20"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                            </button>
                        </div>

                        {/* Floating Filters - High Contrast Pills */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-cream text-earth rounded-full border border-earth/10">
                                <Filter className="w-3 h-3 text-bronze" />
                                <span className="text-[10px] uppercase tracking-widest font-bold opacity-70">Filter By</span>
                            </div>

                            {/* Price */}
                            <div className="group/price relative flex items-center gap-2 px-6 py-3 bg-white hover:bg-cream rounded-full border border-earth/10 hover:border-bronze/50 transition-all cursor-pointer shadow-sm">
                                <DollarSign className="w-3 h-3 text-earth/60 group-hover/price:text-bronze transition-colors" />
                                <input
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    placeholder="Min"
                                    className="w-12 bg-transparent text-xs text-center font-medium text-earth placeholder:text-earth/30 border-b border-earth/10 focus:border-bronze focus:outline-none"
                                />
                                <span className="text-earth/40">-</span>
                                <input
                                    type="number"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    placeholder="Max"
                                    className="w-12 bg-transparent text-xs text-center font-medium text-earth placeholder:text-earth/30 border-b border-earth/10 focus:border-bronze focus:outline-none"
                                />
                            </div>

                            {/* Rating */}
                            <div className="relative group/rating">
                                <select
                                    value={minRating}
                                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                                    className="appearance-none pl-4 pr-10 py-3 bg-white hover:bg-cream rounded-full border border-earth/10 hover:border-bronze/50 text-xs font-medium text-earth cursor-pointer focus:outline-none transition-all shadow-sm"
                                >
                                    <option value={0}>Any Rating</option>
                                    <option value={4.0}>4.0+ Stars</option>
                                    <option value={4.5}>4.5+ Stars</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-earth/50 pointer-events-none group-hover/rating:text-bronze transition-colors" />
                            </div>

                            {/* Sort */}
                            <div className="relative group/sort">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="appearance-none pl-4 pr-10 py-3 bg-white hover:bg-cream rounded-full border border-earth/10 hover:border-bronze/50 text-xs font-medium text-earth cursor-pointer focus:outline-none transition-all shadow-sm"
                                >
                                    <option value="default">Best Match</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="orders">Popularity</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-earth/50 pointer-events-none group-hover/sort:text-bronze transition-colors" />
                            </div>

                            <button
                                onClick={() => setImportUrl(importUrl ? '' : 'https://')}
                                className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-widest text-bronze hover:bg-bronze/10 px-4 py-2 rounded-full transition-colors font-bold"
                            >
                                <Plus className="w-3 h-3" />
                                Import by URL
                            </button>
                        </div>

                        {/* URL Import Panel */}
                        {importUrl !== '' && (
                            <FadeIn className="mt-6 pt-6 border-t border-earth/10">
                                <div className="flex gap-4 items-center animate-glow p-1 rounded-xl bg-white/50">
                                    <div className="flex-1 relative">
                                        <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-earth/60" />
                                        <input
                                            type="text"
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleImportByUrl()}
                                            placeholder="Paste external product link..."
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-earth/10 rounded-xl text-sm text-earth focus:outline-none focus:ring-2 ring-bronze/20 transition-all shadow-inner"
                                        />
                                    </div>
                                    <button
                                        onClick={handleImportByUrl}
                                        disabled={isImportingUrl}
                                        className="bg-bronze text-cream px-8 py-3 rounded-xl text-xs uppercase tracking-widest font-bold hover:scale-105 transition-transform shadow-lg shadow-bronze/20"
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
                        {/* Floating Toolbar - High Contrast */}
                        <div className="sticky top-4 z-50 bg-earth text-cream rounded-full px-6 py-3 flex items-center justify-between mb-8 shadow-2xl animate-float-delay border border-white/10">
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${selectAll ? 'bg-bronze border-bronze scale-110' : 'border-white/40 group-hover:border-white'}`}>
                                        {selectAll && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="hidden" />
                                    <span className="text-xs uppercase tracking-widest text-white/80 group-hover:text-white transition-colors">Select All</span>
                                </label>
                                <div className="h-4 w-px bg-white/20"></div>
                                <span className="text-xs text-white/60 font-medium">
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
                                    className="bg-transparent text-xs text-white/90 hover:text-white focus:outline-none cursor-pointer transition-colors border-none"
                                >
                                    {collections.map(c => <option key={c.id} value={c.id} className="text-earth">To: {c.title}</option>)}
                                </select>

                                <button
                                    onClick={enhanceAllSelected}
                                    disabled={selectedCount === 0}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white hover:text-purple-600 transition-colors disabled:opacity-20"
                                    title="Auto-Enhance Selected"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={handleImport}
                                    disabled={selectedCount === 0}
                                    className="bg-cream text-earth px-6 py-2 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
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
                                        className={`glass-card rounded-2xl overflow-hidden transition-all duration-500 relative group bg-white
                                        ${product.selected ? 'ring-4 ring-cream/80 scale-[1.02] shadow-xl' : 'hover:scale-[1.01] hover:shadow-xl hover:ring-2 hover:ring-cream/50'}
                                    `}
                                    >
                                        {/* Action Overlay (Glass) */}
                                        <div className="absolute inset-0 bg-earth/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-center items-center gap-3">
                                            <button
                                                onClick={() => toggleProductSelection(product.id)}
                                                className={`px-8 py-3 rounded-full text-xs uppercase tracking-widest font-bold transition-all transform hover:scale-105 shadow-lg ${product.selected ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-cream text-earth hover:bg-white'}`}
                                            >
                                                {product.selected ? 'Deselect' : 'Select Product'}
                                            </button>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); enhanceProductWithAI(product.id); }}
                                                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-purple-600 hover:text-purple-700 shadow-md hover:scale-110 transition-transform"
                                                    title="AI Enhance"
                                                >
                                                    <Sparkles className="w-5 h-5" />
                                                </button>
                                                {product.productUrl && (
                                                    <a
                                                        href={product.productUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-earth hover:text-bronze shadow-md hover:scale-110 transition-transform"
                                                    >
                                                        <ExternalLink className="w-5 h-5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Visible Content */}
                                        <div className="relative">
                                            <div className="h-72 overflow-hidden bg-cream/10">
                                                <img
                                                    src={product.images[0] || 'https://via.placeholder.com/160'}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            </div>

                                            {/* Status Badge */}
                                            {product.selected && (
                                                <div className="absolute top-4 right-4 bg-bronze text-white px-3 py-1 rounded-full text-[10px] uppercase tracking-widest shadow-lg animate-bounce">
                                                    Selected
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 relative z-0 bg-white">
                                            {product.selected ? (
                                                <div className="mb-4 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={product.customName || product.name}
                                                        onChange={(e) => updateProductField(product.id, 'customName', e.target.value)}
                                                        className="w-full bg-transparent border-b border-earth/20 focus:border-bronze font-serif text-lg text-earth pb-1 focus:outline-none font-medium"
                                                        placeholder="Product Name"
                                                    />
                                                </div>
                                            ) : (
                                                <h3 className="font-serif text-xl text-earth mb-2 line-clamp-2 leading-tight font-medium">
                                                    {product.name}
                                                </h3>
                                            )}

                                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-earth/5">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase tracking-widest text-earth/50 font-bold">Price</span>
                                                    <span className="font-serif text-2xl text-bronze font-bold">
                                                        ${(product.customPrice || calculateFinalPrice(product.salePrice || product.price)).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] uppercase tracking-widest text-earth/50 font-bold">Cost</span>
                                                    <span className="text-sm text-earth/40 line-through font-medium">
                                                        ${(product.salePrice || product.price).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between text-xs text-earth/60">
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-bronze fill-bronze" />
                                                    <span className="font-medium">{product.averageRating.toFixed(1)}</span>
                                                </div>
                                                <div className="bg-earth/5 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold text-earth/60">
                                                    {product.category || 'Item'}
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
                                    className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-earth/60 hover:text-bronze hover:scale-110 transition-all disabled:opacity-20 disabled:scale-100 border border-earth/10"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="font-serif text-2xl text-earth font-medium">
                                    {currentPage} <span className="text-earth/30 mx-2">/</span> {totalPages}
                                </span>
                                <button
                                    onClick={() => handleSearch(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-earth/60 hover:text-bronze hover:scale-110 transition-all disabled:opacity-20 disabled:scale-100 border border-earth/10"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State / Welcome - Moved and Toned Down */}
                {!isSearching && searchResults.length === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60 mt-12">
                        <div className="p-6 rounded-2xl border border-earth/10 bg-white/30 text-center">
                            <Globe className="w-8 h-8 mx-auto mb-3 text-bronze" />
                            <h4 className="font-serif text-lg text-earth">Global Search</h4>
                            <p className="text-xs text-earth/60 mt-1">Access millions of products worldwide.</p>
                        </div>
                        <div className="p-6 rounded-2xl border border-earth/10 bg-white/30 text-center">
                            <Sparkles className="w-8 h-8 mx-auto mb-3 text-purple-600/60" />
                            <h4 className="font-serif text-lg text-earth">AI Curation</h4>
                            <p className="text-xs text-earth/60 mt-1">Enhance descriptions and titles instantly.</p>
                        </div>
                        <div className="p-6 rounded-2xl border border-earth/10 bg-white/30 text-center">
                            <DollarSign className="w-8 h-8 mx-auto mb-3 text-green-600/60" />
                            <h4 className="font-serif text-lg text-earth">Smart Pricing</h4>
                            <p className="text-xs text-earth/60 mt-1">Automated markups and rounding rules.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductImport;
