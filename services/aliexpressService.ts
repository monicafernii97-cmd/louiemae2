/**
 * AliExpress API Service
 * Uses RapidAPI's AliExpress Datahub for product data
 * Designed to be swappable with official AliExpress API later
 */

import type {
    AliExpressProduct,
    AliExpressSearchOptions,
    AliExpressSearchResult,
    Product,
    CollectionType
} from '../types';

// Re-export types for external use
export type { AliExpressProduct, AliExpressSearchOptions, AliExpressSearchResult };

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = import.meta.env.VITE_RAPIDAPI_HOST || 'aliexpress-datahub.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

// Collection to AliExpress category mapping
const CATEGORY_MAPPING: Record<string, string> = {
    furniture: 'home-garden/furniture',
    decor: 'home-garden/home-decor',
    fashion: 'womens-clothing',
    kids: 'mother-kids/childrens-clothing',
};

// ═══════════════════════════════════════════════════════════════════════════
// CACHE & RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const getCached = <T>(key: string): T | null => {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
        cache.delete(key);
        return null;
    }

    return entry.data;
};

const setCache = <T>(key: string, data: T, ttlMs: number = 15 * 60 * 1000): void => {
    cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
};

// Simple rate limiter
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // ms between requests

const rateLimitedFetch = async (url: string, options: RequestInit): Promise<Response> => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }

    lastRequestTime = Date.now();
    return fetch(url, options);
};

// ═══════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const getHeaders = (): HeadersInit => ({
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': RAPIDAPI_HOST,
    'Content-Type': 'application/json',
});

const handleApiError = async (response: Response): Promise<never> => {
    const errorText = await response.text();
    console.error('AliExpress API Error:', response.status, errorText);

    if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 401 || response.status === 403) {
        throw new Error('API authentication failed. Check your RapidAPI key.');
    }

    throw new Error(`API Error: ${response.status} - ${errorText}`);
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA TRANSFORMERS
// ═══════════════════════════════════════════════════════════════════════════

// Transform RapidAPI AliExpress Datahub response to our AliExpressProduct format
// API structure: resultList[].item.{itemId, title, sku.def.promotionPrice, image, averageStarRate}
const transformProduct = (rawWrapper: any, collection: CollectionType = 'decor'): AliExpressProduct => {
    // The API wraps each product in an "item" property
    const raw = rawWrapper.item || rawWrapper;

    // Handle price - can be in sku.def.promotionPrice or sku.def.price
    const parsePrice = (val: any): number => {
        if (!val) return 0;
        const str = String(val).replace(/[^0-9.]/g, '');
        return parseFloat(str) || 0;
    };

    // Price is under sku.def.promotionPrice (sale) or sku.def.price (original)
    const salePrice = parsePrice(
        raw.sku?.def?.promotionPrice ||
        raw.sku?.def?.price ||
        raw.salePrice ||
        raw.sale_price ||
        raw.price?.salePrice ||
        raw.minPrice
    );
    const originalPrice = parsePrice(
        raw.sku?.def?.price ||
        raw.originalPrice ||
        raw.original_price ||
        salePrice
    );

    // Get product ID - itemId in this API version
    const productId = raw.itemId || raw.item_id || raw.product_id || raw.productId || raw.id || '';

    // Get product title
    const productName = raw.title || raw.subject || raw.product_title || raw.name || 'Unnamed Product';

    // Get images - single image field in this API, need to add https:
    const images: string[] = [];
    if (raw.image) {
        // API returns URLs starting with // so add https:
        const imgUrl = raw.image.startsWith('//') ? `https:${raw.image}` : raw.image;
        images.push(imgUrl);
    }
    if (raw.imageUrl) {
        const imgUrl = raw.imageUrl.startsWith('//') ? `https:${raw.imageUrl}` : raw.imageUrl;
        images.push(imgUrl);
    }
    if (raw.images && Array.isArray(raw.images)) {
        raw.images.forEach((img: string) => {
            const imgUrl = img.startsWith('//') ? `https:${img}` : img;
            images.push(imgUrl);
        });
    }
    // Fallback placeholder if no images
    if (images.length === 0) images.push('https://via.placeholder.com/300x300?text=No+Image');

    // Get product URL and make it complete
    let productUrl = raw.itemUrl || raw.productUrl || raw.product_url || raw.url || '';
    if (productUrl.startsWith('//')) {
        productUrl = `https:${productUrl}`;
    }

    // Extract variants (sizes, colors) from SKU data
    const variants: import('../types').ProductVariant[] = [];

    // Try to extract from various possible API structures
    const skuData = raw.sku || raw.skuInfo || raw.variants || {};
    const skuList = skuData.skuList || skuData.sku_list || skuData.list || [];
    const skuProps = skuData.props || skuData.properties || [];

    // Method 1: Parse from skuList (detailed variant data)
    if (Array.isArray(skuList) && skuList.length > 0) {
        skuList.forEach((sku: any, index: number) => {
            const variantName = sku.propPath || sku.name || sku.attributes?.map((a: any) => a.value).join(' / ') || `Option ${index + 1}`;
            const variantPrice = parsePrice(sku.promotionPrice || sku.price || sku.skuVal?.skuCalPrice);
            const priceAdjustment = variantPrice ? variantPrice - salePrice : 0;

            let variantImage = sku.image || sku.skuVal?.image || '';
            if (variantImage && variantImage.startsWith('//')) {
                variantImage = `https:${variantImage}`;
            }

            variants.push({
                id: sku.skuId || sku.sku_id || `var_${index}`,
                name: variantName,
                image: variantImage || undefined,
                priceAdjustment: priceAdjustment,
                inStock: sku.available !== false && sku.stock !== 0,
            });
        });
    }

    // Method 2: Parse from props/properties (size/color categories)
    if (variants.length === 0 && Array.isArray(skuProps) && skuProps.length > 0) {
        skuProps.forEach((prop: any) => {
            const propName = prop.name || prop.attrName || 'Option';
            const values = prop.values || prop.attrValues || [];

            values.forEach((val: any, index: number) => {
                const valueName = val.name || val.attrValue || val;
                let valueImage = val.image || val.skuImage || '';
                if (valueImage && valueImage.startsWith('//')) {
                    valueImage = `https:${valueImage}`;
                }

                variants.push({
                    id: val.id || val.attrValueId || `${propName}_${index}`,
                    name: `${propName}: ${valueName}`,
                    image: valueImage || undefined,
                    priceAdjustment: 0,
                    inStock: true,
                });
            });
        });
    }

    // Method 3: Generate common clothing sizes if title suggests it's clothing
    if (variants.length === 0) {
        const titleLower = productName.toLowerCase();
        const isClothing = ['shirt', 'top', 'dress', 'blouse', 'pants', 'jeans', 'skirt', 'jacket', 'coat', 'sweater', 'hoodie', 't-shirt', 'shorts'].some(term => titleLower.includes(term));

        if (isClothing) {
            const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
            sizes.forEach((size, index) => {
                variants.push({
                    id: `size_${size.toLowerCase()}`,
                    name: `Size: ${size}`,
                    priceAdjustment: 0,
                    inStock: true,
                });
            });
        }
    }

    return {
        // Base Product fields
        id: `ali_${productId}`,
        name: productName,
        price: salePrice,
        description: raw.description || '',
        images: images,
        category: raw.categoryName || raw.category_name || 'General',
        collection: collection,
        isNew: false,
        inStock: true, // Assume in stock if listed
        variants: variants.length > 0 ? variants : undefined,

        // AliExpress-specific fields
        aliExpressId: String(productId),
        originalPrice: originalPrice,
        salePrice: salePrice,
        shippingInfo: {
            freeShipping: rawWrapper.delivery?.freeShipping || raw.freeShipping || false,
            estimatedDays: rawWrapper.delivery?.deliveryTime || '15-30 days',
            cost: parsePrice(rawWrapper.delivery?.shippingFee),
        },
        seller: {
            id: raw.sellerId || raw.seller_id || raw.shopId || '',
            name: raw.shopName || raw.store_name || raw.sellerName || 'AliExpress Seller',
            rating: parseFloat(raw.shopRating || raw.seller_rating || raw.store_rating || '0'),
            feedbackScore: parseInt(raw.feedbackScore || raw.feedback_score || '0', 10),
        },
        variants: variants.length > 0 ? variants : [],
        reviewCount: parseInt(raw.sales || raw.totalOrders || raw.orders || '0', 10),
        averageRating: parseFloat(raw.averageStarRate || raw.evaluate || raw.rating || '0'),
        productUrl: productUrl,
    };
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export const aliexpressService = {
    /**
     * Check if the API is configured
     */
    isConfigured(): boolean {
        return Boolean(RAPIDAPI_KEY && RAPIDAPI_KEY !== 'your_rapidapi_key_here');
    },

    /**
     * Search for products on AliExpress
     */
    async searchProducts(options: AliExpressSearchOptions): Promise<AliExpressSearchResult> {
        const { query, page = 1, pageSize = 40, minPrice, maxPrice, sortBy } = options;

        // Clear cache entry to ensure fresh data during debugging
        const cacheKey = `search:${JSON.stringify(options)}`;
        cache.delete(cacheKey); // Force fresh fetch during testing

        // Build query params - using RapidAPI AliExpress Datahub format
        const params = new URLSearchParams({
            q: query,
            page: String(page),
            limit: String(pageSize), // Pass page size to get more results
        });

        if (minPrice) params.append('startPrice', String(minPrice));
        if (maxPrice) params.append('endPrice', String(maxPrice));
        if (sortBy) params.append('sort', sortBy === 'price_asc' ? 'price_asc' : sortBy === 'price_desc' ? 'price_desc' : 'default');

        try {
            const response = await rateLimitedFetch(
                `${BASE_URL}/item_search_3?${params.toString()}`,
                { method: 'GET', headers: getHeaders() }
            );

            if (!response.ok) {
                await handleApiError(response);
            }

            const data = await response.json();

            // Debug: log raw API response to understand structure
            console.log('AliExpress API Raw Response Keys:', Object.keys(data));
            console.log('AliExpress API result keys:', data.result ? Object.keys(data.result) : 'no result');

            // The API returns data in .result.resultList format
            const items = data.result?.resultList || data.result?.items || data.items || data.resultList || [];

            // Log first item to see field names
            if (items.length > 0) {
                console.log('First item keys:', Object.keys(items[0]));
                console.log('First item sample:', JSON.stringify(items[0], null, 2).slice(0, 2000));
            }

            const result: AliExpressSearchResult = {
                products: items.map((item: any) =>
                    transformProduct(item)
                ),
                totalCount: data.result?.totalCount || data.result?.total_count || data.total || items.length,
                currentPage: page,
                totalPages: Math.ceil((data.result?.totalCount || data.result?.total_count || data.total || items.length) / pageSize),
            };

            // Cache for 15 minutes
            setCache(cacheKey, result, 15 * 60 * 1000);

            return result;
        } catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    },

    /**
     * Get detailed product information
     */
    async getProductDetails(productId: string): Promise<AliExpressProduct | null> {
        // Remove ali_ prefix if present
        const cleanId = productId.replace('ali_', '');

        // Check cache first
        const cacheKey = `product:${cleanId}`;
        const cached = getCached<AliExpressProduct>(cacheKey);
        if (cached) return cached;

        try {
            const response = await rateLimitedFetch(
                `${BASE_URL}/item_detail_3?itemId=${cleanId}`,
                { method: 'GET', headers: getHeaders() }
            );

            if (!response.ok) {
                if (response.status === 404) return null;
                await handleApiError(response);
            }

            const data = await response.json();
            const product = transformProduct(data.result || data);

            // Cache for 4 hours
            setCache(cacheKey, product, 4 * 60 * 60 * 1000);

            return product;
        } catch (error) {
            console.error('Get product details failed:', error);
            throw error;
        }
    },

    /**
     * Get hot/trending products
     */
    async getHotProducts(category?: string, limit: number = 10): Promise<AliExpressProduct[]> {
        const cacheKey = `hot:${category || 'all'}:${limit}`;
        const cached = getCached<AliExpressProduct[]>(cacheKey);
        if (cached) return cached;

        const mappedCategory = category ? CATEGORY_MAPPING[category] : undefined;

        try {
            const params = new URLSearchParams({
                limit: String(limit),
                sort: 'orders', // Sort by orders for "hot" products
            });

            if (mappedCategory) {
                params.append('category', mappedCategory);
            }

            const response = await rateLimitedFetch(
                `${BASE_URL}/item_search_3?${params.toString()}`,
                { method: 'GET', headers: getHeaders() }
            );

            if (!response.ok) {
                await handleApiError(response);
            }

            const data = await response.json();
            const products = (data.result?.items || data.items || [])
                .slice(0, limit)
                .map((item: any) => transformProduct(item, category as CollectionType));

            // Cache for 1 hour
            setCache(cacheKey, products, 60 * 60 * 1000);

            return products;
        } catch (error) {
            console.error('Get hot products failed:', error);
            throw error;
        }
    },

    /**
     * Convert AliExpress product to importable Product format
     */
    toImportableProduct(
        aliProduct: AliExpressProduct,
        options: {
            markup?: number; // Percentage markup (e.g., 40 for 40%)
            collection?: CollectionType;
            customName?: string;
            customDescription?: string;
        } = {}
    ): Product {
        const { markup = 40, collection, customName, customDescription } = options;
        const finalPrice = aliProduct.salePrice * (1 + markup / 100);

        return {
            id: aliProduct.id,
            name: customName || aliProduct.name,
            price: Math.ceil(finalPrice), // Round up
            description: customDescription || aliProduct.description,
            images: aliProduct.images,
            category: aliProduct.category,
            collection: collection || aliProduct.collection,
            isNew: true, // Mark as new when imported
            inStock: aliProduct.inStock,
        };
    },

    /**
     * Get category mapping for collection
     */
    getCategoryMapping(collection: CollectionType): string | undefined {
        return CATEGORY_MAPPING[collection];
    },

    /**
     * Clear all cached data
     */
    clearCache(): void {
        cache.clear();
    },

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: cache.size,
            keys: Array.from(cache.keys()),
        };
    },
};

export default aliexpressService;
