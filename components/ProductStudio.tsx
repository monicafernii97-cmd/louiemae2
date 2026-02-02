import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Wand2, Send, ChevronRight, Layout, Type, Image as ImageIcon, CheckCircle, Clock, AlertCircle, ArrowLeft, Eye, Smartphone, Monitor, Loader2, Grid, Upload, Trash2, Box, Tag, DollarSign, Shirt } from 'lucide-react';
import { Product, SiteContent } from '../types';
import { generateProductNameV2, generateProductDescriptionV2, extractKeywords, ProductContext, suggestProductCategory } from '../services/geminiService';
import { FadeIn } from './FadeIn';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { toast } from 'sonner';

interface ProductStudioProps {
    isOpen: boolean;
    onClose: () => void;
    initialProduct?: Partial<Product> | null;
    onSave: (product: Partial<Product>) => void;
    siteContent: SiteContent;
}

type StudioStep = 'essence' | 'visuals' | 'story' | 'review';

export const ProductStudio: React.FC<ProductStudioProps> = ({ isOpen, onClose, initialProduct, onSave, siteContent }) => {
    const [step, setStep] = useState<StudioStep>('essence');
    const [product, setProduct] = useState<Partial<Product>>({
        name: '',
        price: 0,
        description: '',
        images: [],
        collection: siteContent.collections[0]?.id || 'furniture',
        category: '',
        isNew: true,
        inStock: true,
        ...initialProduct
    });

    // Reset when opening with new product
    useEffect(() => {
        if (isOpen) {
            setProduct({
                name: '',
                price: 0,
                description: '',
                images: [],
                collection: siteContent.collections[0]?.id || 'furniture',
                category: '',
                isNew: true,
                inStock: true,
                ...initialProduct
            });
            setStep('essence');
        }
    }, [isOpen, initialProduct, siteContent.collections]);

    // URL Scraper Action
    const scrapeProduct = useAction(api.scraper.scrapeProduct);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 left-80 z-[500] bg-black/80 backdrop-blur-sm flex flex-col pt-2 px-2 pb-0 animate-fade-in">
            {/* Maximized Modal Container */}
            <div className="bg-[#FAFAF9] w-full h-full rounded-t-2xl shadow-2xl flex flex-col overflow-hidden relative border border-white/10">

                {/* Top Bar: Navigation & Progress */}
                <div className="shrink-0 h-16 border-b border-earth/10 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-earth/5 rounded-full transition-colors">
                            <X className="w-5 h-5 text-earth/60" />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-earth/40">Product Studio</span>
                            <h1 className="font-serif text-xl text-earth">
                                {product.name || 'New Product'}
                            </h1>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                        <StudioStepIndicator currentStep={step} />
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => onSave(product)} className="text-sm font-medium text-earth/60 hover:text-earth px-4 py-2 hover:bg-earth/5 rounded-md transition-colors flex items-center gap-2">
                            <Send className="w-4 h-4" /> Save & Close
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto relative bg-[#FAFAF9] custom-scrollbar">

                    {step === 'essence' && (
                        <EssenceStep
                            product={product}
                            onChange={setProduct}
                            onNext={() => setStep('visuals')}
                            collections={siteContent.collections}
                            scrapeProduct={scrapeProduct}
                        />
                    )}

                    {step === 'visuals' && (
                        <VisualsStep
                            product={product}
                            onChange={setProduct}
                            onBack={() => setStep('essence')}
                            onNext={() => setStep('story')}
                        />
                    )}

                    {step === 'story' && (
                        <StoryStep
                            product={product}
                            onChange={setProduct}
                            onBack={() => setStep('visuals')}
                            onNext={() => setStep('review')}
                            siteContent={siteContent}
                        />
                    )}

                    {step === 'review' && (
                        <ReviewStep
                            product={product}
                            onChange={setProduct}
                            onBack={() => setStep('story')}
                            onSave={() => onSave(product)}
                            siteContent={siteContent}
                        />
                    )}

                </div>
            </div>
        </div>
    );
};

// --- Sub-Components ---

const StudioStepIndicator: React.FC<{ currentStep: StudioStep }> = ({ currentStep }) => {
    const steps: { id: StudioStep; label: string; icon: React.ComponentType<any> }[] = [
        { id: 'essence', label: 'Essence', icon: Box },
        { id: 'visuals', label: 'Visuals', icon: ImageIcon },
        { id: 'story', label: 'Story', icon: Type },
        { id: 'review', label: 'Review', icon: Eye },
    ];

    return (
        <div className="flex items-center bg-earth/5 rounded-full p-1 border border-earth/5">
            {steps.map((s) => {
                const isActive = s.id === currentStep;
                return (
                    <div
                        key={s.id}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${isActive ? 'bg-white shadow-sm text-earth' : 'text-earth/40'
                            }`}
                    >
                        <s.icon className={`w-3.5 h-3.5 ${isActive ? 'text-bronze' : ''}`} />
                        <span className={isActive ? 'opacity-100' : 'hidden sm:block opacity-100'}>{s.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

// --- Step 1: Essence ---
const EssenceStep: React.FC<{
    product: Partial<Product>;
    onChange: (p: any) => void;
    onNext: () => void;
    collections: any[];
    scrapeProduct: any;
}> = ({ product, onChange, onNext, collections, scrapeProduct }) => {
    const [isGeneratingName, setIsGeneratingName] = useState(false);
    const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
    const [isCategorizing, setIsCategorizing] = useState(false);

    // Import Logic
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [autoEnhance, setAutoEnhance] = useState(false); // Default off to avoid quota issues

    const handleImport = async () => {
        if (!importUrl) return;
        setIsImporting(true);
        try {
            const result = await scrapeProduct({ url: importUrl });
            if (!result) throw new Error("Failed to fetch");

            let scrapedData: any = {};

            if (result.source === 'aliexpress') {
                const raw = result.data.result?.item;
                if (raw) {
                    scrapedData = {
                        name: raw.title,
                        price: parseFloat(raw.sku?.def?.promotionPrice || raw.sku?.def?.price || '0'),
                        description: raw.description || 'Imported from AliExpress',
                        images: raw.images || [],
                        sourceUrl: importUrl
                    };
                }
            } else {
                const data = result.data;
                scrapedData = {
                    name: data.title,
                    price: data.price,
                    description: data.description,
                    images: data.image ? [data.image] : [],
                    sourceUrl: data.url
                };
            }

            // Merge data
            const updatedProduct = {
                ...product,
                ...scrapedData,
                // Only overwrite if scraped data exists
                name: scrapedData.name || product.name,
                price: scrapedData.price || product.price,
                description: scrapedData.description || product.description,
                images: scrapedData.images.length > 0 ? scrapedData.images : product.images
            };

            // AI Enhance if enabled
            if (autoEnhance) {
                const context: ProductContext = {
                    originalName: updatedProduct.name,
                    originalDescription: updatedProduct.description || '',
                    category: '',
                    collection: updatedProduct.collection,
                    keywords: extractKeywords(updatedProduct.name + ' ' + (updatedProduct.description || '')),
                };

                // Try AI enhancement
                try {
                    const [name, desc] = await Promise.all([
                        generateProductNameV2(context).catch(() => updatedProduct.name),
                        generateProductDescriptionV2(context).catch(() => updatedProduct.description)
                    ]);

                    // Helper to check for generic fallbacks
                    const isGeneric = (text: string) => text.includes("Chair") || text.includes("Table") || text.includes("Unknown");

                    if (!isGeneric(name)) updatedProduct.name = name;
                    if (!isGeneric(desc)) updatedProduct.description = desc;

                    toast.success("Imported & Enhanced!");
                } catch (e) {
                    console.warn("AI Enhance failed", e);
                    toast.success("Imported (AI skipped)");
                }
            } else {
                toast.success("Data Imported");
            }

            onChange(updatedProduct);

        } catch (err) {
            console.error(err);
            toast.error("Failed to import URL");
        } finally {
            setIsImporting(false);
        }
    };

    const handleGenerateName = async () => {
        setIsGeneratingName(true);
        setNameSuggestions([]);
        const collectionName = collections.find(c => c.id === product.collection)?.title || product.collection || 'Furniture';

        // Call the service - generateProductName returns a single name string, let's get multiple suggestions
        const context: ProductContext = {
            originalName: product.name || '',
            originalDescription: product.description || '',
            category: product.category || '',
            collection: collectionName,
        };
        const name = await generateProductNameV2(context);

        setNameSuggestions([name]);
        setIsGeneratingName(false);
    };

    const handleAutoCategorize = async () => {
        if (!product.name) return;
        setIsCategorizing(true);
        const category = await suggestProductCategory(product.name, product.description || '');
        if (category) {
            onChange({ ...product, category });
        }
        setIsCategorizing(false);
    };

    return (
        <div className="h-full flex flex-col items-center justify-start animate-fade-in-up p-8 overflow-y-auto">
            <div className="w-full max-w-5xl space-y-12 pb-24">

                {/* 1. Quick Import Section - Refined Design */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-earth/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-bronze/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-bronze/10 rounded-lg text-bronze">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-serif text-2xl text-earth">Quick Start</h3>
                                <p className="text-earth/60 font-light text-sm">Paste a URL to auto-fill details from any website.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={importUrl}
                                    onChange={(e) => setImportUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-earth/5 border border-transparent rounded-xl px-4 py-3 text-earth text-sm focus:outline-none focus:bg-white focus:border-bronze transition-all placeholder:text-earth/30"
                                />
                            </div>
                            <button
                                onClick={handleImport}
                                disabled={isImporting || !importUrl}
                                className="px-6 py-3 bg-earth text-white rounded-xl text-sm font-medium hover:bg-earth/90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                            >
                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                {isImporting ? 'Fetching...' : 'Auto-Fill'}
                            </button>
                        </div>

                        {/* AI Toggle */}
                        <div className="mt-4 flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer group select-none">
                                <div className={`w-9 h-5 rounded-full p-1 transition-colors ${autoEnhance ? 'bg-bronze' : 'bg-earth/20'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${autoEnhance ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <input type="checkbox" checked={autoEnhance} onChange={(e) => setAutoEnhance(e.target.checked)} className="hidden" />
                                <span className={`text-xs font-medium tracking-wide transition-colors ${autoEnhance ? 'text-bronze' : 'text-earth/40'}`}>
                                    Auto-Enhance with AI
                                </span>
                            </label>
                            <span className="text-[10px] text-earth/30">(Writes descriptions for you)</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="h-px bg-earth/10 flex-1"></div>
                    <span className="text-xs uppercase tracking-widest text-earth/30">Or Create Manually</span>
                    <div className="h-px bg-earth/10 flex-1"></div>
                </div>

                {/* 2. Manual Details Form - 2 Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    {/* Left: Core Identity */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-xs uppercase tracking-widest text-earth/40">Collection</label>
                            <div className="flex flex-wrap gap-3">
                                {collections.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => onChange({ ...product, collection: c.id })}
                                        className={`px-4 py-2 text-sm rounded-full border transition-all ${product.collection === c.id
                                            ? 'border-bronze bg-bronze text-white shadow-md'
                                            : 'border-earth/10 text-earth/60 hover:border-earth/30 hover:bg-earth/5'}`}
                                    >
                                        {c.title}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs uppercase tracking-widest text-earth/40">Product Name</label>
                                <button
                                    onClick={handleGenerateName}
                                    disabled={isGeneratingName}
                                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-bronze hover:text-earth disabled:opacity-50"
                                >
                                    {isGeneratingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Suggest Names
                                </button>
                            </div>
                            <input
                                type="text"
                                value={product.name}
                                onChange={(e) => onChange({ ...product, name: e.target.value })}
                                placeholder="e.g. The Velocity Chair"
                                className="w-full text-3xl font-serif text-earth border-b border-earth/10 py-2 focus:outline-none focus:border-bronze bg-transparent placeholder:text-earth/10 transition-colors"
                            />
                            {/* Suggestions */}
                            {nameSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2 animate-fade-in">
                                    {nameSuggestions.map((name, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { onChange({ ...product, name }); setNameSuggestions([]); }}
                                            className="px-3 py-1.5 bg-earth/5 text-earth text-xs rounded-full hover:bg-bronze hover:text-white transition-colors"
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Market Details */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs uppercase tracking-widest text-earth/40">Category</label>
                                <button
                                    onClick={handleAutoCategorize}
                                    disabled={isCategorizing || !product.name}
                                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-bronze hover:text-earth disabled:opacity-50"
                                >
                                    {isCategorizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Auto
                                </button>
                            </div>
                            <input
                                type="text"
                                value={product.category}
                                onChange={(e) => onChange({ ...product, category: e.target.value })}
                                placeholder="e.g. Lounge Chairs"
                                className="w-full text-xl text-earth/80 border-b border-earth/10 py-2 focus:outline-none focus:border-bronze bg-transparent placeholder:text-earth/20 transition-colors"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs uppercase tracking-widest text-earth/40">Price</label>
                            <div className="relative">
                                <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-earth/20" />
                                <input
                                    type="number"
                                    value={product.price}
                                    onChange={(e) => onChange({ ...product, price: Number(e.target.value) })}
                                    className="w-full text-3xl font-serif text-earth border-b border-earth/10 py-2 pl-8 focus:outline-none focus:border-bronze bg-transparent placeholder:text-earth/10 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="flex gap-6 pt-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${product.isNew ? 'bg-bronze border-bronze' : 'border-earth/20 group-hover:border-bronze'}`}>
                                    {product.isNew && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <input type="checkbox" checked={product.isNew || false} onChange={(e) => onChange({ ...product, isNew: e.target.checked })} className="hidden" />
                                <span className="text-xs uppercase tracking-widest text-earth/70">New Arrival</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${product.inStock ? 'bg-earth border-earth' : 'border-earth/20 group-hover:border-bronze'}`}>
                                    {product.inStock && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <input type="checkbox" checked={product.inStock || false} onChange={(e) => onChange({ ...product, inStock: e.target.checked })} className="hidden" />
                                <span className="text-xs uppercase tracking-widest text-earth/70">In Stock</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-8">
                    <button onClick={onNext} disabled={!product.name} className="py-4 px-12 bg-earth text-white rounded-lg hover:bg-earth/90 transition-colors flex items-center gap-2 text-lg font-light tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                        Next: Imagery <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Step 2: Visuals ---
const VisualsStep: React.FC<{ product: Partial<Product>; onChange: (p: any) => void; onBack: () => void; onNext: () => void; }> = ({ product, onChange, onBack, onNext }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onChange({ ...product, images: [...(product.images || []), reader.result as string] });
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (index: number) => {
        const newImages = [...(product.images || [])];
        newImages.splice(index, 1);
        onChange({ ...product, images: newImages });
    };

    return (
        <div className="h-full flex flex-col items-center p-8 animate-fade-in-up">
            <div className="w-full max-w-6xl space-y-8">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={onBack} className="text-earth/40 hover:text-earth p-2 rounded-full hover:bg-earth/5 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
                    <div>
                        <h2 className="font-serif text-3xl text-earth">Curate Visuals</h2>
                        <p className="text-earth/60 font-light">Upload high-quality imagery to showcase this piece.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {/* Upload Tile */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-[3/4] border-2 border-dashed border-earth/10 rounded-xl flex flex-col items-center justify-center gap-4 text-earth/40 hover:text-earth object-cover hover:border-earth/30 hover:bg-earth/5 transition-all group"
                    >
                        <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-xs uppercase tracking-widest font-medium">Add Image</span>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    </button>

                    {/* Image Tiles */}
                    {product.images?.map((img, idx) => (
                        <div key={idx} className="relative aspect-[3/4] group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <img src={img} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="p-3 bg-white text-red-500 rounded-full hover:bg-red-50 transition-colors shadow-lg"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            {idx === 0 && (
                                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest rounded-full font-medium text-earth shadow-sm">
                                    Main Image
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-8">
                    <button onClick={onNext} className="py-4 px-12 bg-earth text-white rounded-lg hover:bg-earth/90 transition-colors flex items-center gap-2 text-lg font-light tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200">
                        Next: Story <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Step 3: Story (Zen Mode) ---
const StoryStep: React.FC<{ product: Partial<Product>; onChange: (p: any) => void; onBack: () => void; onNext: () => void; siteContent: SiteContent }> = ({ product, onChange, onBack, onNext, siteContent }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        const collectionName = siteContent.collections.find(c => c.id === product.collection)?.title || 'Furniture';

        const description = await generateProductDescription(
            product.name || 'this item',
            collectionName,
            product.category || 'home decor'
        );

        onChange({ ...product, description });
        setIsGenerating(false);
    };

    return (
        <div className="h-full flex animate-fade-in-up">
            {/* Editor Side */}
            <div className="w-1/2 p-12 border-r border-earth/10 flex flex-col h-full bg-white">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={onBack} className="text-earth/40 hover:text-earth p-2 rounded-full hover:bg-earth/5 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
                    <div>
                        <h2 className="font-serif text-3xl text-earth">Craft the Story</h2>
                        <p className="text-earth/60 font-light">Describe the details that make this unique.</p>
                    </div>
                </div>

                <div className="flex-1 relative">
                    <textarea
                        value={product.description}
                        onChange={(e) => onChange({ ...product, description: e.target.value })}
                        placeholder="Start writing..."
                        className="w-full h-full resize-none focus:outline-none font-serif text-xl leading-relaxed text-earthplaceholder:text-earth/20 p-4"
                    />

                    <div className="absolute bottom-4 right-4">
                        <button
                            onClick={handleGenerateDescription}
                            disabled={isGenerating || !product.name}
                            className="flex items-center gap-2 bg-bronze/10 text-bronze px-4 py-2 rounded-full text-xs uppercase tracking-widest hover:bg-bronze hover:text-white transition-all disabled:opacity-50 shadow-sm"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Generate Description
                        </button>
                    </div>
                </div>

                <div className="pt-8 flex justify-end">
                    <button onClick={onNext} className="py-4 px-12 bg-earth text-white rounded-lg hover:bg-earth/90 transition-colors flex items-center gap-2 text-lg font-light tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200">
                        Next: Review <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Preview Side */}
            <div className="w-1/2 bg-[#FAFAF9] p-12 flex items-center justify-center">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-earth/5">
                    <h3 className="text-xs uppercase tracking-widest text-earth/40 mb-4 text-center">Live Preview</h3>
                    <div className="text-center space-y-4">
                        <h2 className="font-serif text-2xl text-earth">{product.name || 'Untitled Product'}</h2>
                        <div className="w-12 h-px bg-bronze mx-auto opacity-50"></div>
                        <p className="font-serif text-earth/70 leading-relaxed italic">
                            "{product.description || 'Description will appear here...'}"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Step 4: Review ---
const ReviewStep: React.FC<{ product: Partial<Product>; onChange: (p: any) => void; onBack: () => void; onSave: () => void; siteContent: SiteContent }> = ({ product, onChange, onBack, onSave, siteContent }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in-up">
            <div className="w-full max-w-5xl space-y-10">
                <div className="flex items-center gap-4 mb-4 justify-center">
                    <button onClick={onBack} className="text-earth/40 hover:text-earth p-2 rounded-full hover:bg-earth/5 transition-colors absolute left-8"><ArrowLeft className="w-6 h-6" /></button>
                    <div className="text-center">
                        <h2 className="font-serif text-3xl text-earth">Ready to Launch?</h2>
                        <p className="text-earth/60 font-light">Review the final card as it will appear on the site.</p>
                    </div>
                </div>

                <div className="flex justify-center">
                    {/* Detailed Product Card Preview */}
                    <div className="group relative w-full max-w-sm bg-white rounded-none overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer">
                        <div className="aspect-[3/4] w-full overflow-hidden bg-earth/5 relative">
                            {product.images && product.images.length > 0 ? (
                                <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-earth/20">
                                    <ImageIcon className="w-12 h-12" />
                                </div>
                            )}

                            {product.isNew && (
                                <div className="absolute top-4 left-4">
                                    <span className="bg-white/90 backdrop-blur-sm text-earth px-3 py-1 text-[10px] uppercase tracking-widest font-medium">New Arrival</span>
                                </div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center pb-8 bg-gradient-to-t from-black/40 to-transparent">
                                <button className="bg-white text-earth px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-earth hover:text-white transition-colors">
                                    View Details
                                </button>
                            </div>
                        </div>
                        <div className="p-6 text-center space-y-2">
                            <h3 className="font-serif text-xl tracking-tight text-earth group-hover:text-bronze transition-colors">
                                {product.name}
                            </h3>
                            <div className="flex items-center justify-center gap-2 text-sm font-light text-earth/60">
                                <span>{product.category}</span>
                                <span className="w-1 h-1 rounded-full bg-earth/20"></span>
                                <span>${product.price}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                    <button onClick={onSave} className="py-4 px-16 bg-bronze text-white rounded-lg hover:bg-bronze/90 transition-colors flex items-center gap-3 text-xl font-light tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-200">
                        <Send className="w-6 h-6" /> Publish Product
                    </button>
                </div>
            </div>
        </div>
    );
};
