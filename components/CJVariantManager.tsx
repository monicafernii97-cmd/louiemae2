import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import {
    Link2, Unlink, ChevronDown, ChevronUp, Package,
    CheckCircle, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { FadeIn } from './FadeIn';

interface CjVariant {
    vid: string;
    sku: string;
    name: string;
    price?: number;
    image?: string;
}

interface CustomerVariant {
    id: string;
    name: string;
    image?: string;
    priceAdjustment: number;
    inStock: boolean;
    cjVariantId?: string;
    cjSku?: string;
}

interface ProductWithVariants {
    _id: Id<"products">;
    name: string;
    images: string[];
    variants?: CustomerVariant[];
    cjVariants?: CjVariant[];
}

export const CJVariantManager: React.FC = () => {
    const products = useQuery(api.products.getProductsWithCjVariants) as ProductWithVariants[] | undefined;
    const linkVariant = useMutation(api.products.linkCjVariant);
    const unlinkVariant = useMutation(api.products.unlinkCjVariant);

    const [expandedProduct, setExpandedProduct] = useState<Id<"products"> | null>(null);
    const [linking, setLinking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleLink = async (
        productId: Id<"products">,
        customerVariantId: string,
        cjVariant: CjVariant
    ) => {
        setLinking(`${customerVariantId}-${cjVariant.vid}`);
        setError(null);
        setSuccess(null);

        try {
            await linkVariant({
                productId,
                customerVariantId,
                cjVariantId: cjVariant.vid,
                cjSku: cjVariant.sku,
            });
            setSuccess(`Linked size to CJ variant`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to link variant');
        } finally {
            setLinking(null);
        }
    };

    const handleUnlink = async (productId: Id<"products">, customerVariantId: string) => {
        setLinking(customerVariantId);
        setError(null);

        try {
            await unlinkVariant({ productId, customerVariantId });
            setSuccess(`Removed CJ link`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to unlink variant');
        } finally {
            setLinking(null);
        }
    };

    if (!products?.length) {
        return (
            <FadeIn delay={600}>
                <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50/50 backdrop-blur-md border border-purple-100 flex items-center justify-center">
                            <Link2 className="w-5 h-5 text-purple-600/80" />
                        </div>
                        <div>
                            <h3 className="font-serif text-lg text-earth">Size Variant Mapping</h3>
                            <span className="text-[10px] uppercase tracking-wider text-earth/50">
                                No products with CJ variants
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-earth/50 text-center py-8">
                        When CJ approves products with multiple sizes, they'll appear here for mapping.
                    </p>
                </div>
            </FadeIn>
        );
    }

    return (
        <FadeIn delay={600}>
            <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl p-6 shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-50/50 backdrop-blur-md border border-purple-100 flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-purple-600/80" />
                    </div>
                    <div>
                        <h3 className="font-serif text-lg text-earth">Size Variant Mapping</h3>
                        <span className="text-[10px] uppercase tracking-wider text-earth/50">
                            {products.length} products with CJ variants
                        </span>
                    </div>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50/50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-green-50/50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        {success}
                    </div>
                )}

                {/* Products List */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {products.map((product) => {
                        const isExpanded = expandedProduct === product._id;
                        const linkedCount = product.variants?.filter(v => v.cjVariantId).length || 0;
                        const totalVariants = product.variants?.length || 0;
                        const allLinked = linkedCount === totalVariants && totalVariants > 0;

                        return (
                            <div
                                key={product._id}
                                className="bg-white/50 backdrop-blur-md border border-white/40 rounded-xl overflow-hidden"
                            >
                                {/* Product Header - Clickable */}
                                <button
                                    onClick={() => setExpandedProduct(isExpanded ? null : product._id)}
                                    className="w-full p-4 flex items-center gap-4 hover:bg-white/30 transition-colors text-left"
                                >
                                    {/* Product Image */}
                                    <div className="w-12 h-12 rounded-lg bg-white/50 border border-white/40 overflow-hidden flex-shrink-0">
                                        {product.images?.[0] ? (
                                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-earth/20">
                                                <Package className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-serif text-sm text-earth truncate">{product.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] uppercase tracking-wider font-medium ${allLinked ? 'text-green-600' : 'text-amber-600'
                                                }`}>
                                                {linkedCount}/{totalVariants} sizes linked
                                            </span>
                                            {allLinked && <CheckCircle className="w-3 h-3 text-green-500" />}
                                        </div>
                                    </div>

                                    {/* Expand Icon */}
                                    {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-earth/30" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-earth/30" />
                                    )}
                                </button>

                                {/* Expanded Variant Mapping */}
                                {isExpanded && (
                                    <div className="p-4 pt-0 space-y-4 border-t border-white/30">
                                        <p className="text-xs text-earth/50 mb-4">
                                            Click a CJ variant to link it to a customer size option
                                        </p>

                                        {/* Customer Variants (Sizes) */}
                                        {product.variants?.map((customerVar) => (
                                            <div
                                                key={customerVar.id}
                                                className="bg-white/40 rounded-lg p-3 border border-white/30"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-sm text-earth">
                                                        {customerVar.name}
                                                    </span>
                                                    {customerVar.cjVariantId && (
                                                        <button
                                                            onClick={() => handleUnlink(product._id, customerVar.id)}
                                                            disabled={linking === customerVar.id}
                                                            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded bg-red-50/50 hover:bg-red-100/50 transition-colors"
                                                        >
                                                            {linking === customerVar.id ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Unlink className="w-3 h-3" />
                                                            )}
                                                            Unlink
                                                        </button>
                                                    )}
                                                </div>

                                                {customerVar.cjVariantId ? (
                                                    // Show linked CJ variant
                                                    <div className="bg-green-50/50 border border-green-200/50 rounded-lg p-2 flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-green-700 font-medium truncate">
                                                                {product.cjVariants?.find(v => v.vid === customerVar.cjVariantId)?.name || customerVar.cjVariantId}
                                                            </p>
                                                            <p className="text-[10px] text-green-600/70 font-mono">
                                                                SKU: {customerVar.cjSku || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Show CJ variants to choose from
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {product.cjVariants?.map((cjVar) => {
                                                            const isAlreadyLinked = product.variants?.some(
                                                                v => v.cjVariantId === cjVar.vid && v.id !== customerVar.id
                                                            );
                                                            const isLinking = linking === `${customerVar.id}-${cjVar.vid}`;

                                                            return (
                                                                <button
                                                                    key={cjVar.vid}
                                                                    onClick={() => handleLink(product._id, customerVar.id, cjVar)}
                                                                    disabled={isAlreadyLinked || isLinking}
                                                                    className={`
                                                                        text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1
                                                                        ${isAlreadyLinked
                                                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                            : 'bg-white/50 text-earth border-white/40 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
                                                                        }
                                                                    `}
                                                                    title={isAlreadyLinked ? 'Already linked to another size' : `Link to ${cjVar.name}`}
                                                                >
                                                                    {isLinking ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <ArrowRight className="w-3 h-3" />
                                                                    )}
                                                                    {cjVar.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* CJ Variants reference */}
                                        <div className="mt-4 pt-4 border-t border-white/30">
                                            <p className="text-[10px] uppercase tracking-wider text-earth/40 mb-2">
                                                Available CJ Variants ({product.cjVariants?.length || 0})
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {product.cjVariants?.map(v => (
                                                    <span
                                                        key={v.vid}
                                                        className="text-[10px] bg-white/50 px-2 py-0.5 rounded text-earth/60"
                                                    >
                                                        {v.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </FadeIn>
    );
};

export default CJVariantManager;
