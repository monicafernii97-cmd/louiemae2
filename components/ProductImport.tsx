import React, { useState, useMemo, useRef } from 'react';
import { Search, Loader2, Check, X, Star, DollarSign, Wand2, Truck, Package, Plus, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Link, ChevronLeft, ChevronRight, Globe, Sparkles, Filter, Info, ArrowUpRight, Upload, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { aliexpressService, AliExpressProduct } from '../services/aliexpressService';
import { CollectionType, Product, CollectionConfig } from '../types';
import { generateProductNameV2, generateProductDescriptionV2, extractKeywords, ProductContext, translateVariantNames } from '../services/geminiService';
import { FadeIn } from './FadeIn';
import { ProductCard, ImportableProduct } from './import/ProductCard';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

interface ProductImportProps {
    collections: CollectionConfig[];
    onImportProducts: (products: Omit<Product, 'id'>[]) => void;
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
    const [searchResults, setSearchResultsRaw] = useState<ImportableProduct[]>(() => {
        try {
            const saved = sessionStorage.getItem('import-search-results');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const setSearchResults = (resultsOrUpdater: ImportableProduct[] | ((prev: ImportableProduct[]) => ImportableProduct[])) => {
        if (typeof resultsOrUpdater === 'function') {
            setSearchResultsRaw(prev => {
                const next = resultsOrUpdater(prev);
                try { sessionStorage.setItem('import-search-results', JSON.stringify(next)); } catch { }
                return next;
            });
        } else {
            setSearchResultsRaw(resultsOrUpdater);
            try { sessionStorage.setItem('import-search-results', JSON.stringify(resultsOrUpdater)); } catch { }
        }
    };
    const [totalResults, setTotalResults] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(1);

    // URL Import state
    const [importUrl, setImportUrl] = useState('');
    const [isImportingUrl, setIsImportingUrl] = useState(false);
    const [autoEnhanceAi, setAutoEnhanceAi] = useState(true);

    // Filters
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');

    const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'orders'>('default');

    // Import settings
    const [targetCollection, setTargetCollection] = useState<string>(collections[0]?.id || 'furniture');
    const [targetSubcategory, setTargetSubcategory] = useState<string>('');
    const [pricingRule, setPricingRule] = useState<PricingRule>(DEFAULT_PRICING_RULE);
    const [showPricingSettings, setShowPricingSettings] = useState(false);

    // Actions
    const scrapeProduct = useAction(api.scraper.scrapeProduct);

    // Convex file upload mutations
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const saveFile = useMutation(api.files.saveFile);
    const imageUploadRef = useRef<HTMLInputElement>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Handle image upload for current review product
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }
        setIsUploadingImage(true);
        try {
            const uploadUrl = await generateUploadUrl();
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file,
            });
            if (!response.ok) throw new Error('Upload failed');
            const { storageId } = await response.json();
            const result = await saveFile({ storageId, fileName: file.name, fileType: file.type, purpose: 'product' });
            if (result.url) {
                // Add the uploaded image to the current review product
                const currentProduct = searchResults.filter(p => p.selected)[reviewIndex];
                if (currentProduct) {
                    const newImages = [...currentProduct.images, result.url];
                    updateProductField(currentProduct.id, 'images', newImages);
                    // Auto-select the new image
                    const newSelectedImages = currentProduct.selectedImages
                        ? [...currentProduct.selectedImages, newImages.length - 1]
                        : newImages.map((_, idx) => idx);
                    updateProductField(currentProduct.id, 'selectedImages', newSelectedImages);
                    toast.success('Image uploaded!');
                }
            }
        } catch (err) {
            console.error('Image upload error:', err);
            toast.error('Failed to upload image');
        } finally {
            setIsUploadingImage(false);
            if (imageUploadRef.current) imageUploadRef.current.value = '';
        }
    };

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

    // Two-stage pricing: cost-stack formula
    // Stage 1 (Pre-Sourcing): estimated_cj = 1688_price × 1.6, selling = (cj + shipping) × 3
    const getShippingEstimate = (collection: string): number => {
        switch (collection) {
            case 'fashion': return 8;
            case 'kids': return 8;
            case 'decor': return 12;
            case 'furniture': return 22;
            default: return 10;
        }
    };

    const calculateCostStackPrice = (basePriceUsd: number, collection: string): {
        estimatedCjCost: number;
        estimatedShipping: number;
        sellingPrice: number;
    } => {
        const estimatedCjCost = basePriceUsd * 1.6;
        const estimatedShipping = getShippingEstimate(collection);
        let sellingPrice = (estimatedCjCost + estimatedShipping) * 3;

        if (pricingRule.roundUp) {
            sellingPrice = Math.ceil(sellingPrice) - 0.01;
        }

        return {
            estimatedCjCost: Math.round(estimatedCjCost * 100) / 100,
            estimatedShipping,
            sellingPrice: Math.max(sellingPrice, 0),
        };
    };

    // Per-product price calculation using the product's own collection (not global default)
    const calculateProductPrice = (product: ImportableProduct): number => {
        const collection = product.targetCollection || targetCollection;
        return calculateCostStackPrice(product.salePrice || product.price, collection).sellingPrice;
    };

    // Legacy wrapper for search results display
    const calculateFinalPrice = (basePrice: number): number => {
        return calculateCostStackPrice(basePrice, targetCollection).sellingPrice;
    };

    // Search handler
    const handleSearch = async (page = 1) => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);
        console.log(`[Import Search] Starting search: query="${searchQuery}", page=${page}`);
        toast.loading('Searching 1688 catalog...', { id: 'search-progress' });

        try {
            const result = await aliexpressService.searchAllSources({
                query: searchQuery,
                page,
                pageSize: 100,
                minPrice: minPrice ? parseFloat(minPrice) : undefined,
                maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
                sortBy: sortBy === 'default' ? undefined : sortBy,
                sources: ['1688'],
            });

            console.log(`[Import Search] Got ${result.products.length} products, totalCount: ${result.totalCount}`);
            if (result.errors && result.errors.length > 0) {
                console.warn('[Import Search] Partial errors:', result.errors);
            }

            const filteredProducts = result.products
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
            toast.dismiss('search-progress');

            if (filteredProducts.length === 0 && result.totalCount === 0) {
                toast.info('No products found', { description: 'Try different keywords or adjust your filters.' });
            } else {
                toast.success(`Found ${filteredProducts.length} products`);
            }
        } catch (err) {
            console.error('[Import Search] Search FAILED:', err);
            toast.dismiss('search-progress');

            let errorMsg = 'Search failed';
            if (err instanceof Error) {
                errorMsg = err.message;
                // Add guidance for common errors
                if (errorMsg.includes('RapidAPI key not configured')) {
                    errorMsg = 'RapidAPI key not configured. Go to Convex Dashboard → Environment Variables and set RAPIDAPI_KEY.';
                } else if (errorMsg.includes('429') || errorMsg.includes('Rate limit')) {
                    errorMsg = 'API rate limit reached. Please wait a moment and try again.';
                } else if (errorMsg.includes('timed out') || errorMsg.includes('AbortError')) {
                    errorMsg = 'Search request timed out. The 1688 API may be slow — please try again.';
                } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
                    errorMsg = 'Network error — could not reach the search API. Check your internet connection.';
                }
            }

            setError(errorMsg);
            toast.error('Search failed', { description: errorMsg, duration: 8000 });
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

    // AI Enhancement with full product context - enhances BOTH name and description
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

            toast.success('AI enhancement complete', {
                description: `Enhanced "${enhancedName}"`
            });
        } catch (err) {
            console.error('AI enhancement failed:', err);
            toast.error('AI enhancement failed', {
                description: 'Please try again later.'
            });
        } finally {
            updateProductField(productId, 'isEnhancing', false);
        }
    };

    // AI Enhancement for NAME only
    const enhanceNameWithAI = async (productId: string) => {
        const product = searchResults.find(p => p.id === productId);
        if (!product) return;

        updateProductField(productId, 'isEnhancing', true);

        try {
            const context: ProductContext = {
                originalName: product.name,
                originalDescription: product.description || '',
                category: product.category || '',
                collection: product.targetCollection || targetCollection,
                keywords: extractKeywords(product.name + ' ' + (product.description || '')),
            };

            const enhancedName = await generateProductNameV2(context);
            updateProductField(productId, 'customName', enhancedName);

            toast.success('Name enhanced', {
                description: `"${enhancedName}"`
            });
        } catch (err) {
            console.error('AI name enhancement failed:', err);
            toast.error('Name enhancement failed');
        } finally {
            updateProductField(productId, 'isEnhancing', false);
        }
    };

    // AI Enhancement for DESCRIPTION only
    const enhanceDescriptionWithAI = async (productId: string) => {
        const product = searchResults.find(p => p.id === productId);
        if (!product) return;

        updateProductField(productId, 'isEnhancing', true);

        try {
            const context: ProductContext = {
                originalName: product.customName || product.name,
                originalDescription: product.description || '',
                category: product.category || '',
                collection: product.targetCollection || targetCollection,
                keywords: extractKeywords((product.customName || product.name) + ' ' + (product.description || '')),
            };

            const enhancedDescription = await generateProductDescriptionV2(context);
            updateProductField(productId, 'customDescription', enhancedDescription);

            toast.success('Description enhanced');
        } catch (err) {
            console.error('AI description enhancement failed:', err);
            toast.error('Description enhancement failed');
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
    const [importStep, setImportStepRaw] = useState<'search' | 'review'>(() => {
        const saved = sessionStorage.getItem('import-step');
        return (saved === 'review') ? 'review' : 'search';
    });
    const setImportStep = (step: 'search' | 'review') => {
        setImportStepRaw(step);
        sessionStorage.setItem('import-step', step);
        if (step === 'search') {
            // Clear review data when going back to search
            sessionStorage.removeItem('import-search-results');
            sessionStorage.removeItem('import-review-index');
        }
    };
    const [reviewIndex, setReviewIndexRaw] = useState(() => {
        try {
            const saved = sessionStorage.getItem('import-review-index');
            return saved ? parseInt(saved, 10) : 0;
        } catch { return 0; }
    });
    const setReviewIndex = (idxOrUpdater: number | ((prev: number) => number)) => {
        if (typeof idxOrUpdater === 'function') {
            setReviewIndexRaw(prev => {
                const next = idxOrUpdater(prev);
                try { sessionStorage.setItem('import-review-index', String(next)); } catch { }
                return next;
            });
        } else {
            setReviewIndexRaw(idxOrUpdater);
            try { sessionStorage.setItem('import-review-index', String(idxOrUpdater)); } catch { }
        }
    };

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

            // Filter images based on user selection (defaults to all main images if no selection made)
            // Use combined array so marketing image indices (globalIdx) resolve correctly
            const combinedImages = [...p.images, ...(p.descriptionImages || [])];
            const rawImages = p.selectedImages && p.selectedImages.length > 0
                ? p.selectedImages.map(idx => combinedImages[idx]).filter(Boolean)
                : p.images;
            // Normalize protocol-relative URLs (// -> https://)
            const finalImages = rawImages.map(img => img.startsWith('//') ? 'https:' + img : img);

            // Detect if collection was changed from the default — clear stale dependent state
            const collectionChanged = p.targetCollection && p.targetCollection !== targetCollection;

            return {
                name: collectionChanged ? p.name : (p.customName || p.name),
                price: collectionChanged
                    ? calculateCostStackPrice(p.salePrice || p.price, productCollection).sellingPrice
                    : (p.customPrice || calculateCostStackPrice(p.salePrice || p.price, productCollection).sellingPrice),
                description: collectionChanged ? (p.description || '') : (p.customDescription || p.description || ''),
                images: finalImages,
                category: collectionChanged ? (subcategories[0]?.title || 'General') : subcategoryTitle,
                collection: productCollection as CollectionType,
                isNew: true,
                inStock: p.inStock,
                // Filter variants: undefined = all, [] = none, [...ids] = only those
                variants: p.selectedVariants === undefined
                    ? p.variants
                    : p.variants?.filter(v => p.selectedVariants!.includes(v.id)),
                sourceUrl: p.productUrl || '',
                cjSourcingStatus: p.productUrl ? 'pending' as const : 'none' as const,
                // Two-stage pricing metadata — use upstream CNY if available (from sourcePriceCny on the product)
                sourcePriceCny: (p as any).sourcePriceCny || undefined,
                estimatedCjCost: calculateCostStackPrice(p.salePrice || p.price, productCollection).estimatedCjCost,
                estimatedShipping: calculateCostStackPrice(p.salePrice || p.price, productCollection).estimatedShipping,
                pricingStage: 'estimated' as const,
                // Subcategory — clear if collection changed
                subcategory: collectionChanged ? undefined : (productSubcategory || undefined),
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
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 md:p-8 relative z-20">
                <style>{`
                    .glass-panel {
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(40px);
                        border: 1px solid rgba(255, 255, 255, 0.5);
                        box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.1);
                    }
                `}</style>

                <FadeIn className="w-full max-w-6xl" mobileFast>
                    <div className="glass-panel rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/60">
                        {/* Header / Progress */}
                        <div className="bg-cream/50 p-4 md:p-8 border-b border-earth/5 flex flex-col md:flex-row gap-3 md:gap-0 justify-between md:items-center relative overflow-hidden">
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
                            <div className="relative z-10 flex flex-wrap gap-2 md:gap-4">
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
                                    {currentProduct.images.length > 0 ? (
                                        <img
                                            src={currentProduct.images[0]}
                                            alt="Main Preview"
                                            referrerPolicy="no-referrer"
                                            crossOrigin="anonymous"
                                            className="w-full h-full object-contain p-4"
                                        />
                                    ) : (
                                        <div
                                            onClick={() => imageUploadRef.current?.click()}
                                            className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-bronze/5 transition-colors"
                                        >
                                            <ImageIcon className="w-16 h-16 text-earth/10 mb-4" />
                                            <p className="text-sm text-earth/30 font-medium">No images yet</p>
                                            <p className="text-xs text-earth/20 mt-1">Tap to upload</p>
                                        </div>
                                    )}
                                    {currentProduct.images.length > 0 && (
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-earth shadow-sm">
                                            {(currentProduct.selectedImages?.length || currentProduct.images.length)} / {currentProduct.images.length} Selected
                                        </div>
                                    )}
                                </div>

                                {/* Selectable Image Grid - CLICK TO SELECT */}
                                <div className="mb-4">
                                    <p className="text-[10px] uppercase tracking-widest text-earth/50 font-bold mb-2">Click to Select Images</p>
                                </div>
                                <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto">
                                    {currentProduct.images.map((img, i) => {
                                        const isSelected = currentProduct.selectedImages
                                            ? currentProduct.selectedImages.includes(i)
                                            : true; // By default all are selected
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => {
                                                    const currentSelected = currentProduct.selectedImages ||
                                                        currentProduct.images.map((_, idx) => idx);
                                                    const newSelected = isSelected
                                                        ? currentSelected.filter(idx => idx !== i)
                                                        : [...currentSelected, i].sort((a, b) => a - b);
                                                    // Ensure at least one image is selected
                                                    if (newSelected.length > 0) {
                                                        updateReviewProduct('selectedImages', newSelected);
                                                    }
                                                }}
                                                className={`aspect-square rounded-lg border-2 overflow-hidden bg-white cursor-pointer transition-all relative
                                                    ${isSelected ? 'border-bronze ring-2 ring-bronze/30' : 'border-earth/10 opacity-50 hover:opacity-80'}`}
                                            >
                                                <img src={img} alt={`Product image ${i + 1}`} referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover" />
                                                {isSelected && (
                                                    <div className="absolute top-1 right-1 bg-bronze text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Upload Image Button */}
                                    <div
                                        onClick={() => !isUploadingImage && imageUploadRef.current?.click()}
                                        className="aspect-square rounded-lg border-2 border-dashed border-earth/20 bg-white/50 cursor-pointer hover:border-bronze/40 hover:bg-bronze/5 transition-all flex flex-col items-center justify-center gap-1"
                                    >
                                        {isUploadingImage ? (
                                            <Loader2 className="w-5 h-5 text-bronze animate-spin" />
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4 text-earth/30" />
                                                <span className="text-[8px] uppercase tracking-widest text-earth/30 font-bold">Add</span>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        ref={imageUploadRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </div>

                                {/* Empty state when no images */}
                                {currentProduct.images.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <ImageIcon className="w-10 h-10 text-earth/15 mb-3" />
                                        <p className="text-xs text-earth/40 mb-3">No images available</p>
                                        <button
                                            onClick={() => imageUploadRef.current?.click()}
                                            className="px-4 py-2 bg-earth text-cream rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-bronze transition-colors shadow-sm"
                                        >
                                            <Upload className="w-3 h-3 inline mr-1" /> Upload Images
                                        </button>
                                    </div>
                                )}
                                {/* Description/Marketing Images from 1688 */}
                                {currentProduct.descriptionImages && currentProduct.descriptionImages.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-[10px] uppercase tracking-widest text-earth/50 font-bold mb-2">
                                            Marketing Images ({currentProduct.descriptionImages.length})
                                        </h4>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                            {currentProduct.descriptionImages.map((img, idx) => {
                                                // Marketing images are offset by main images count for selection indices
                                                const globalIdx = (currentProduct.images?.length || 0) + idx;
                                                const isSelected = currentProduct.selectedImages
                                                    ? currentProduct.selectedImages.includes(globalIdx)
                                                    : false; // Marketing images not selected by default
                                                return (
                                                    <div
                                                        key={`mktg-${idx}`}
                                                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group transition-all border-2
                                                            ${isSelected ? 'border-bronze ring-2 ring-bronze/30 scale-[1.02]' : 'border-transparent hover:border-earth/20'}`}
                                                        onClick={() => {
                                                            const current = currentProduct.selectedImages || Array.from({ length: currentProduct.images.length }, (_, i) => i);
                                                            const newSelected = isSelected
                                                                ? current.filter(i => i !== globalIdx)
                                                                : [...current, globalIdx];
                                                            updateReviewProduct('selectedImages', newSelected);
                                                        }}
                                                    >
                                                        <img
                                                            src={img}
                                                            alt={`Marketing ${idx + 1}`}
                                                            referrerPolicy="no-referrer"
                                                            crossOrigin="anonymous"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute top-1 right-1 bg-bronze text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow">
                                                                <Check className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[9px] text-earth/30 mt-1 italic">Click to select marketing images for import</p>
                                    </div>
                                )}

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
                                                    onClick={() => enhanceNameWithAI(currentProduct.id)}
                                                    disabled={currentProduct.isEnhancing}
                                                    className="text-[10px] uppercase tracking-widest text-purple-600 flex items-center gap-1 hover:text-purple-700 font-bold disabled:opacity-50"
                                                >
                                                    <Wand2 className="w-3 h-3" /> AI Name
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
                                        {(() => {
                                            const pCollection = currentProduct.targetCollection || targetCollection;
                                            const pStack = calculateCostStackPrice(currentProduct.salePrice || currentProduct.price, pCollection);
                                            const displayPrice = currentProduct.customPrice || pStack.sellingPrice;
                                            return (
                                                <div className="bg-cream/30 p-4 md:p-6 rounded-2xl border border-earth/5 space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] uppercase tracking-widest text-earth/50 font-bold">Your Price ($)</label>
                                                            <input
                                                                type="number"
                                                                value={displayPrice}
                                                                onChange={(e) => updateReviewProduct('customPrice', parseFloat(e.target.value))}
                                                                className="w-full p-3 bg-white border border-earth/10 rounded-xl font-serif text-xl text-bronze font-bold focus:ring-2 ring-bronze/20 shadow-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-1 flex flex-col justify-center">
                                                            <div className="flex justify-between text-xs text-earth/60">
                                                                <span>1688 Cost (USD):</span>
                                                                <span>${(currentProduct.salePrice || currentProduct.price).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-earth/60">
                                                                <span>Est. CJ Cost (×1.6):</span>
                                                                <span>${pStack.estimatedCjCost.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-earth/60">
                                                                <span>Shipping ({pCollection}):</span>
                                                                <span>${pStack.estimatedShipping.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-earth/60 border-t border-earth/10 pt-1 mt-1">
                                                                <span>Selling (×3):</span>
                                                                <span className="font-bold">${pStack.sellingPrice.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs font-bold text-green-700 border-t border-earth/10 pt-1 mt-1">
                                                                <span>Profit:</span>
                                                                <span>${(displayPrice - (currentProduct.salePrice || currentProduct.price)).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {currentProduct.customPrice && currentProduct.customPrice !== pStack.sellingPrice && (
                                                        <button
                                                            onClick={() => updateReviewProduct('customPrice', pStack.sellingPrice)}
                                                            className="text-[10px] text-bronze hover:underline flex items-center gap-1"
                                                        >
                                                            <RotateCcw className="w-3 h-3" /> Reset to formula price (${pStack.sellingPrice.toFixed(2)})
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Description */}
                                        <div className="space-y-2 flex-1">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] uppercase tracking-widest text-earth/50 font-bold">Description</label>
                                                <button
                                                    onClick={() => enhanceDescriptionWithAI(currentProduct.id)}
                                                    disabled={currentProduct.isEnhancing}
                                                    className="text-[10px] uppercase tracking-widest text-purple-600 flex items-center gap-1 hover:text-purple-700 font-bold disabled:opacity-50"
                                                >
                                                    <Wand2 className="w-3 h-3" /> AI Description
                                                </button>
                                            </div>
                                            <textarea
                                                rows={6}
                                                value={currentProduct.customDescription || currentProduct.description || ''}
                                                onChange={(e) => updateReviewProduct('customDescription', e.target.value)}
                                                className="w-full p-4 bg-white border border-earth/10 rounded-xl text-sm text-earth/80 focus:ring-2 ring-bronze/20 shadow-sm resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Variants Sidebar (if any) - CLICKABLE SELECTION + IMAGE ALLOCATION */}
                                    {currentProduct.variants && currentProduct.variants.length > 0 && (
                                        <div className="w-full lg:w-80 bg-white p-4 md:p-6 rounded-2xl border border-earth/10 shadow-sm h-fit">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-[10px] uppercase tracking-widest text-earth/50 font-bold">
                                                    Select Variants ({currentProduct.selectedVariants?.length ?? currentProduct.variants.length}/{currentProduct.variants.length})
                                                </h4>
                                                <button
                                                    onClick={() => {
                                                        const allIds = currentProduct.variants!.map(v => v.id);
                                                        const currentSelected = currentProduct.selectedVariants;
                                                        // Toggle: select all → undefined (all), deselect all → []
                                                        const newSelected = currentSelected?.length === allIds.length ? [] : undefined;
                                                        updateReviewProduct('selectedVariants', newSelected);
                                                    }}
                                                    className="text-[10px] text-bronze hover:underline font-medium"
                                                >
                                                    {(currentProduct.selectedVariants?.length ?? currentProduct.variants.length) === currentProduct.variants.length ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                {currentProduct.variants.map((variant) => {
                                                    const isSelected = currentProduct.selectedVariants
                                                        ? currentProduct.selectedVariants.includes(variant.id)
                                                        : true;
                                                    // Find original name for revert
                                                    const originalName = currentProduct.originalVariants?.find(ov => ov.id === variant.id)?.name;
                                                    const nameWasEdited = originalName && variant.name !== originalName;
                                                    // All available images (main + description/marketing)
                                                    const allImages = [
                                                        ...(currentProduct.images || []),
                                                        ...(currentProduct.descriptionImages || []),
                                                    ];
                                                    // Allocated image for this variant
                                                    const allocatedIdx = currentProduct.variantImageMap?.[variant.id];
                                                    const allocatedImage = allocatedIdx !== undefined ? allImages[allocatedIdx] : undefined;
                                                    const displayImage = allocatedImage || variant.image || currentProduct.images?.[0];
                                                    return (
                                                        <div
                                                            key={variant.id}
                                                            className={`rounded-lg transition-all border-2 overflow-hidden
                                                                ${isSelected
                                                                    ? 'bg-bronze/5 border-bronze/30'
                                                                    : 'bg-gray-50 border-transparent opacity-50 hover:opacity-75'}`}
                                                        >
                                                            {/* Main variant row — click to select/deselect */}
                                                            <div
                                                                onClick={() => {
                                                                    const allIds = currentProduct.variants!.map(v => v.id);
                                                                    const currentSelected = currentProduct.selectedVariants || allIds;
                                                                    const newSelected = isSelected
                                                                        ? currentSelected.filter(id => id !== variant.id)
                                                                        : [...currentSelected, variant.id];
                                                                    updateReviewProduct('selectedVariants', newSelected);
                                                                }}
                                                                className="flex items-center gap-3 text-sm p-2 cursor-pointer"
                                                            >
                                                                {/* Variant image — click to open image picker */}
                                                                <div
                                                                    className="w-12 h-12 rounded-lg border border-earth/10 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 relative group/img cursor-pointer hover:ring-2 hover:ring-bronze/30"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // Toggle image picker for this variant
                                                                        const picker = document.getElementById(`img-picker-${variant.id}`);
                                                                        if (picker) picker.classList.toggle('hidden');
                                                                    }}
                                                                    title="Click to assign image to this variant"
                                                                >
                                                                    {displayImage ? (
                                                                        <img
                                                                            src={displayImage}
                                                                            alt={variant.name}
                                                                            referrerPolicy="no-referrer"
                                                                            crossOrigin="anonymous"
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <Package className="w-4 h-4 text-gray-300" />
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <ImageIcon className="w-4 h-4 text-white" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="text"
                                                                            value={variant.name}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onChange={(e) => {
                                                                                const updatedVariants = currentProduct.variants!.map(v =>
                                                                                    v.id === variant.id ? { ...v, name: e.target.value } : v
                                                                                );
                                                                                updateReviewProduct('variants', updatedVariants);
                                                                            }}
                                                                            onBlur={(e) => {
                                                                                // Auto-revert to original name if cleared
                                                                                if (!e.target.value.trim() && originalName) {
                                                                                    const updatedVariants = currentProduct.variants!.map(v =>
                                                                                        v.id === variant.id ? { ...v, name: originalName } : v
                                                                                    );
                                                                                    updateReviewProduct('variants', updatedVariants);
                                                                                }
                                                                            }}
                                                                            className="w-full bg-transparent font-medium text-earth text-xs border-b border-transparent hover:border-earth/20 focus:border-bronze focus:outline-none truncate px-0 py-0.5 transition-colors"
                                                                            title="Click to edit variant name"
                                                                            placeholder={originalName || 'Variant name'}
                                                                        />
                                                                        {/* Reset button — only show if name was edited */}
                                                                        {nameWasEdited && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const updatedVariants = currentProduct.variants!.map(v =>
                                                                                        v.id === variant.id ? { ...v, name: originalName! } : v
                                                                                    );
                                                                                    updateReviewProduct('variants', updatedVariants);
                                                                                }}
                                                                                className="flex-shrink-0 text-earth/40 hover:text-bronze transition-colors"
                                                                                title={`Reset to: ${originalName}`}
                                                                            >
                                                                                <RotateCcw className="w-3 h-3" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    {/* Show original name as reference */}
                                                                    {originalName && nameWasEdited && (
                                                                        <p className="text-[9px] text-earth/30 truncate" title={originalName}>
                                                                            Original: {originalName}
                                                                        </p>
                                                                    )}
                                                                    <div className="flex items-center gap-2 text-[10px]">
                                                                        <span className={variant.inStock ? 'text-green-600' : 'text-red-500'}>
                                                                            {variant.inStock ? '● In Stock' : '○ Out of Stock'}
                                                                        </span>
                                                                        {variant.priceAdjustment !== 0 && (
                                                                            <span className={variant.priceAdjustment > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                                                                {variant.priceAdjustment > 0 ? '+' : ''}${variant.priceAdjustment.toFixed(2)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                                                                    ${isSelected ? 'bg-bronze text-white' : 'bg-gray-200'}`}>
                                                                    {isSelected && <Check className="w-3 h-3" />}
                                                                </div>
                                                            </div>
                                                            {/* Image picker dropdown for variant-image allocation */}
                                                            <div
                                                                id={`img-picker-${variant.id}`}
                                                                className="hidden border-t border-earth/10 p-2 bg-white/80"
                                                            >
                                                                <p className="text-[9px] uppercase tracking-widest text-earth/40 font-bold mb-1">Assign image to this variant</p>
                                                                <div className="grid grid-cols-5 gap-1 max-h-24 overflow-y-auto">
                                                                    {allImages.map((img, imgIdx) => (
                                                                        <div
                                                                            key={imgIdx}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const newMap = { ...(currentProduct.variantImageMap || {}), [variant.id]: imgIdx };
                                                                                updateReviewProduct('variantImageMap', newMap);
                                                                                // Also update the variant's image field directly
                                                                                const updatedVariants = currentProduct.variants!.map(v =>
                                                                                    v.id === variant.id ? { ...v, image: allImages[imgIdx] } : v
                                                                                );
                                                                                updateReviewProduct('variants', updatedVariants);
                                                                                // Close picker
                                                                                document.getElementById(`img-picker-${variant.id}`)?.classList.add('hidden');
                                                                            }}
                                                                            className={`aspect-square rounded border cursor-pointer overflow-hidden hover:ring-2 hover:ring-bronze/40 transition-all
                                                                                ${allocatedIdx === imgIdx ? 'ring-2 ring-bronze border-bronze' : 'border-earth/10'}`}
                                                                        >
                                                                            <img src={img} alt={`Option ${imgIdx + 1}`} referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {allocatedIdx !== undefined && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newMap = { ...(currentProduct.variantImageMap || {}) };
                                                                            delete newMap[variant.id];
                                                                            updateReviewProduct('variantImageMap', newMap);
                                                                            // Restore original variant image
                                                                            const origVariant = currentProduct.originalVariants?.find(ov => ov.id === variant.id);
                                                                            const updatedVariants = currentProduct.variants!.map(v =>
                                                                                v.id === variant.id ? { ...v, image: (origVariant as any)?.image || undefined } : v
                                                                            );
                                                                            updateReviewProduct('variants', updatedVariants);
                                                                            document.getElementById(`img-picker-${variant.id}`)?.classList.add('hidden');
                                                                        }}
                                                                        className="text-[9px] text-red-400 hover:text-red-600 mt-1 flex items-center gap-1"
                                                                    >
                                                                        <X className="w-2.5 h-2.5" /> Clear assignment
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-earth/40 mt-3 italic">
                                                Click variants to include/exclude · Click image thumbnails to assign specific images
                                            </p>
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
            // Call generic scraper action
            console.log('[URL Import] Calling scraper for:', importUrl);
            toast.loading('Fetching product data...', { id: 'url-import' });
            const result = await scrapeProduct({ url: importUrl });
            console.log('[URL Import] Scraper result:', result);
            toast.dismiss('url-import');

            if (!result) {
                throw new Error("Failed to fetch product data");
            }

            let importableProduct: ImportableProduct;

            if (result.source === '1688') {
                console.log('[URL Import] Processing as 1688 product');

                // OTAPI BatchGetItemFullInfo response: Result contains item data
                const item = result.data?.Result ?? result.data;
                if (!item || typeof item !== 'object') {
                    throw new Error('1688 payload missing item data');
                }

                // Extract basic info
                const productName = item.Title || item.OriginalTitle || 'Unknown Product';
                const productId = item.Id || `1688_${Date.now()}`;

                // Extract USD price from OTAPI price structure
                const getUsdPrice = (priceObj: any): number => {
                    return priceObj?.ConvertedPriceList?.Internal?.Price || priceObj?.OriginalPrice || 0;
                };
                // Extract raw CNY price (upstream, not reverse-converted)
                const getCnyPrice = (priceObj: any): number => {
                    return priceObj?.OriginalPrice || priceObj?.ConvertedPriceList?.Original?.Price || 0;
                };
                const promoPrice = getUsdPrice(item.PromotionPrice);
                const regularPrice = getUsdPrice(item.Price);
                const salePrice = promoPrice > 0 ? promoPrice : regularPrice;
                const origPrice = regularPrice > promoPrice && promoPrice > 0 ? regularPrice : salePrice;
                const rawCnyPrice = getCnyPrice(item.PromotionPrice) || getCnyPrice(item.Price);

                // Extract images from Pictures array
                const images: string[] = [];
                if (Array.isArray(item.Pictures)) {
                    item.Pictures.forEach((pic: any) => {
                        const url = pic?.Large?.Url || pic?.Medium?.Url || pic?.Url;
                        if (url && typeof url === 'string') images.push(url);
                    });
                }
                // Also extract variant/property images (PropertyPictures)
                if (Array.isArray(item.PropertyPictures)) {
                    item.PropertyPictures.forEach((pic: any) => {
                        const url = pic?.Large?.Url || pic?.Medium?.Url || pic?.Url || pic?.Original?.Url;
                        if (url && typeof url === 'string' && !images.includes(url)) images.push(url);
                    });
                }
                // Also extract from ItemImages if present
                if (Array.isArray(item.ItemImages)) {
                    item.ItemImages.forEach((img: any) => {
                        const url = typeof img === 'string' ? img : img?.Url || img?.Large?.Url;
                        if (url && typeof url === 'string' && !images.includes(url)) images.push(url);
                    });
                }
                if (images.length === 0 && item.MainPictureUrl) {
                    images.push(item.MainPictureUrl);
                }

                // Extract rating from FeaturedValues
                const getFeaturedValue = (name: string): string | undefined => {
                    if (!Array.isArray(item.FeaturedValues)) return undefined;
                    return item.FeaturedValues.find((v: any) => v.Name === name)?.Value;
                };
                const rating = parseFloat(getFeaturedValue('rating') || '0');

                // Extract variants from ConfiguredItems
                const variants: any[] = [];
                if (Array.isArray(item.ConfiguredItems) && item.ConfiguredItems.length > 0) {
                    item.ConfiguredItems.forEach((cfg: any, idx: number) => {
                        const cfgPrice = getUsdPrice(cfg.Price);
                        const cfgImage = cfg.Pictures?.[0]?.Large?.Url || cfg.Pictures?.[0]?.Medium?.Url || cfg.Pictures?.[0]?.Url;
                        // Build variant name from Configurators with Pid/Vid fallback
                        const configuratorLabel = Array.isArray(cfg.Configurators)
                            ? cfg.Configurators
                                .map((c: any) => `${c?.PropertyName ?? c?.Pid ?? '?'}: ${c?.Value ?? c?.Vid ?? '?'}`)
                                .join(' / ')
                            : '';
                        variants.push({
                            id: cfg.Id || `cfg_${idx}`,
                            name: cfg.Title || configuratorLabel || `Option ${idx + 1}`,
                            image: cfgImage || undefined,
                            priceAdjustment: cfgPrice ? cfgPrice - salePrice : 0,
                            inStock: (cfg.Quantity ?? cfg.MasterQuantity ?? 0) > 0,
                        });
                    });
                }

                importableProduct = {
                    id: String(productId),
                    name: productName,
                    price: salePrice || origPrice,
                    description: item.Description || 'Imported from 1688.com',
                    images: images,
                    category: '',
                    sourcePriceCny: rawCnyPrice || undefined,
                    collection: targetCollection as CollectionType,
                    variants: variants,
                    sourceId: String(productId),
                    originalPrice: origPrice,
                    salePrice: salePrice || origPrice,
                    shippingInfo: { freeShipping: true, estimatedDays: '7-15', cost: 0 },
                    seller: {
                        id: item.VendorId || '',
                        name: item.VendorDisplayName || item.VendorName || 'Unknown',
                        rating: (item.VendorScore || 0) / 20,
                        feedbackScore: item.VendorScore || 0,
                    },
                    reviewCount: parseInt(getFeaturedValue('SalesInLast30Days') || '0', 10),
                    averageRating: rating,
                    productUrl: item.TaobaoItemUrl || item.ExternalItemUrl || importUrl,
                    source: '1688',
                    selected: true,
                    targetCollection: targetCollection as CollectionType,
                    customPrice: 0,
                    // Snapshot original variant names for revert functionality
                    originalVariants: variants.map(v => ({ id: v.id, name: v.name })),
                    // Marketing/description images from GetItemDescription
                    descriptionImages: ('descriptionImages' in result ? (result as any).descriptionImages : []) || [],
                };
                importableProduct.customPrice = calculateFinalPrice(importableProduct.price);
            } else {
                // Generic source (handles AliExpress, Amazon, and any other URLs)
                console.log('[URL Import] Processing as generic product:', result.data);
                const data = result.data;
                const genId = `gen_${Date.now()}`;
                // Guard against non-USD prices from foreign pages
                if (data.currency && String(data.currency).toUpperCase() !== 'USD') {
                    throw new Error(`Generic import currently supports USD pages only; received ${data.currency}.`);
                }
                importableProduct = {
                    id: genId,
                    name: data.title || 'Unknown',
                    price: data.price || 0,
                    description: data.description || '',
                    images: (data.images && data.images.length > 0) ? data.images : (data.image ? [data.image] : []),
                    category: '',
                    collection: targetCollection as CollectionType,
                    variants: [],
                    sourceId: genId,
                    originalPrice: data.price || 0,
                    salePrice: data.price || 0,
                    shippingInfo: { freeShipping: false, estimatedDays: 'Unknown', cost: 0 },
                    seller: { id: '', name: 'Unknown', rating: 0, feedbackScore: 0 },
                    reviewCount: 0,
                    averageRating: 0,
                    productUrl: data.url || importUrl,
                    source: 'generic',
                    selected: true,
                    targetCollection: targetCollection as CollectionType,
                    customPrice: calculateFinalPrice(data.price || 0)
                };
            }

            console.log('[URL Import] Created importable product:', importableProduct.name, 'images:', importableProduct.images?.length, 'variants:', importableProduct.variants?.length);

            // Auto-translate Chinese variant names to English
            if (importableProduct.variants && importableProduct.variants.length > 0) {
                try {
                    const variantNames = importableProduct.variants.map((v: any) => v.name);
                    const translations = await translateVariantNames(variantNames);
                    importableProduct.variants = importableProduct.variants.map((v: any) => ({
                        ...v,
                        name: translations.get(v.name) || v.name,
                    }));
                    console.log('[URL Import] Translated variant names');
                } catch (err) {
                    console.warn('[URL Import] Variant translation failed, keeping originals:', err);
                }
            }

            // Auto-AI Enhancement (optional - preserves original data if fails)
            if (autoEnhanceAi) {
                try {
                    const context: ProductContext = {
                        originalName: importableProduct.name,
                        originalDescription: importableProduct.description || '',
                        category: '',
                        collection: targetCollection,
                        keywords: extractKeywords(importableProduct.name + ' ' + (importableProduct.description || '')),
                    };

                    toast.loading('Enhancing with AI...', { id: 'ai-enhance' });

                    // Run in parallel
                    const [enhancedName, enhancedDescription] = await Promise.all([
                        generateProductNameV2(context),
                        generateProductDescriptionV2(context)
                    ]);

                    toast.dismiss('ai-enhance');

                    // Only use AI results if they look valid (not generic fallbacks)
                    const isValidAiName = enhancedName && !enhancedName.includes('Chair') && !enhancedName.includes('Table') && !enhancedName.includes('Lamp');
                    const isValidAiDesc = enhancedDescription && !enhancedDescription.includes('solid oak') && !enhancedDescription.includes('Nordic restraint');

                    if (isValidAiName || isValidAiDesc) {
                        importableProduct = {
                            ...importableProduct,
                            customName: isValidAiName ? enhancedName : importableProduct.name,
                            customDescription: isValidAiDesc ? enhancedDescription : importableProduct.description
                        };
                        toast.success('Product found & AI enhanced');
                    } else {
                        console.warn('[URL Import] AI returned generic fallbacks, using original data');
                        toast.success('Product found (AI used defaults)');
                    }
                } catch (aiErr) {
                    toast.dismiss('ai-enhance');
                    console.error('Auto-AI failed:', aiErr);
                    toast.error('Product found, but AI enhancement failed');
                }
            } else {
                toast.success('Product found');
            }

            // Set results to just this product and switch to review immediately
            setSearchResults([importableProduct]);
            setImportUrl('');
            setImportStep('review');
            setReviewIndex(0);

        } catch (err) {
            console.error('Import by URL failed:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to import product. Please try a different link.';
            setError(errorMsg);
            toast.error('Import failed', { description: errorMsg });
        } finally {
            toast.dismiss('url-import');
            setIsImportingUrl(false);
        }
    };

    const selectedCount = searchResults.filter(p => p.selected).length;

    return (
        <div className="relative min-h-[80vh]">
            {/* Toast Container */}
            <Toaster position="top-right" richColors closeButton />

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
                @media (hover: hover) {
                    .glass-card:hover {
                        background: rgba(255, 255, 255, 0.95);
                        border-color: rgba(166, 124, 82, 0.3);
                        transform: translateY(-5px);
                        box-shadow: 0 20px 40px -10px rgba(166, 124, 82, 0.2);
                    }
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
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-earth/10 pb-6 md:pb-8 gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-8 h-[1px] bg-bronze inline-block"></span>
                            <span className="text-bronze text-[10px] uppercase tracking-[0.4em] font-bold">Global Sourcing</span>
                        </div>
                        <h1 className="font-serif text-3xl md:text-5xl text-earth tracking-tight">
                            Import & <span className="text-bronze italic">Curate</span>
                        </h1>
                    </div>
                </div>

                {/* Hero Search Module */}
                <FadeIn mobileFast>
                    <div className="glass-card rounded-[2rem] p-4 md:p-10 relative group transition-all duration-700 shadow-xl border border-white/50">
                        {/* Direct Link Import - Enhanced */}
                        <FadeIn delay={200} className="relative z-20" mobileFast>
                            <div className="glass-card max-w-2xl mx-auto rounded-2xl p-6 border border-white/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-bronze/5 rounded-full blur-3xl -z-10" />

                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-bronze text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                                            <Link className="w-3 h-3" /> Quick Import by URL
                                        </h3>

                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-8 h-4 rounded-full transition-colors relative ${autoEnhanceAi ? 'bg-purple-500' : 'bg-earth/20'}`}>
                                                <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${autoEnhanceAi ? 'left-4.5' : 'left-0.5'}`} />
                                            </div>
                                            <span className={`text-[10px] uppercase tracking-widest font-bold transition-colors ${autoEnhanceAi ? 'text-purple-600' : 'text-earth/40 group-hover:text-earth/60'}`}>
                                                <Sparkles className="w-3 h-3 inline mr-1" />
                                                Auto-Enhance
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={autoEnhanceAi}
                                                onChange={(e) => setAutoEnhanceAi(e.target.checked)}
                                            />
                                        </label>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-2">
                                        <input
                                            type="text"
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleImportByUrl()}
                                            placeholder="Paste any product URL..."
                                            className="flex-1 bg-white border border-earth/10 rounded-xl px-4 py-3 text-sm text-earth placeholder:text-earth/30 focus:outline-none focus:ring-2 focus:ring-bronze/20 focus:border-bronze shadow-inner"
                                        />
                                        <button
                                            onClick={handleImportByUrl}
                                            disabled={isImportingUrl || !importUrl.trim()}
                                            className="bg-earth text-cream px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-bronze transition-colors disabled:opacity-50 whitespace-nowrap shadow-lg shadow-earth/10"
                                        >
                                            {isImportingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch & Review'}
                                        </button>
                                    </div>

                                    {/* Validation Tip (Removed strict regex check to support generic sites) */}
                                    {importUrl && !importUrl.startsWith('http') && (
                                        <div className="text-[10px] text-orange-600 flex items-center gap-1 font-medium bg-orange-50 p-2 rounded-lg border border-orange-100">
                                            <AlertCircle className="w-3 h-3" />
                                            Please enter a valid URL (starting with http/https)
                                        </div>
                                    )}

                                    {/* Error Display */}
                                    {error && (
                                        <div role="alert" className="text-[11px] text-red-700 flex items-center gap-2 font-medium bg-red-50 p-3 rounded-xl border border-red-200 animate-in fade-in">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            <span>{error}</span>
                                            <button type="button" aria-label="Dismiss error" onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </FadeIn>

                        {/* Search Input - High Contrast */}
                        <div className="mb-8 mt-8 border-t border-earth/10 pt-8">
                            <div className="relative">
                                <Search className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-5 md:w-6 h-5 md:h-6 text-earth/40 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Discover premium products..."
                                    className="w-full pl-12 md:pl-20 pr-4 md:pr-36 py-4 md:py-6 bg-white border border-earth/10 rounded-2xl text-base md:text-2xl font-serif text-earth placeholder:text-earth/40 focus:outline-none focus:ring-2 focus:ring-bronze/20 focus:border-bronze/50 transition-all shadow-sm"
                                />
                                <button
                                    onClick={() => handleSearch()}
                                    disabled={isSearching || !searchQuery.trim()}
                                    className="hidden md:block absolute right-3 top-3 bottom-3 bg-earth text-cream px-10 rounded-xl text-xs uppercase tracking-[0.25em] font-bold hover:bg-bronze hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:scale-100 shadow-lg shadow-earth/20"
                                >
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Search'}
                                </button>
                            </div>
                            <button
                                onClick={() => handleSearch()}
                                disabled={isSearching || !searchQuery.trim()}
                                className="md:hidden mt-2 w-full bg-earth text-cream px-8 py-3 rounded-xl text-xs uppercase tracking-[0.25em] font-bold hover:bg-bronze active:scale-95 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-earth/20"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Search'}
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

                        </div>


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

                        {/* Product Grid - Using ProductCard Component */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {searchResults.map((product, idx) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    index={idx}
                                    calculateFinalPrice={calculateFinalPrice}
                                    toggleProductSelection={toggleProductSelection}
                                    updateProductField={updateProductField}
                                    enhanceProductWithAI={enhanceProductWithAI}
                                />
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
