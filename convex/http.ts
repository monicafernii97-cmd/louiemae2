import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";
import Stripe from "stripe";

const http = httpRouter();

// Add Convex Auth routes
auth.addHttpRoutes(http);

// Helper for CORS headers - allow both production and development origins
const ALLOWED_ORIGINS = [
    "https://louiemae.com",
    "https://www.louiemae.com",
    "http://localhost:3000",
    "http://localhost:5173",
];

const getAllowedOrigin = (requestOrigin?: string | null) => {
    // If request origin is in allowed list, return it (for proper CORS)
    if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
        return requestOrigin;
    }
    // Fallback to production or development default
    return process.env.SITE_URL || "http://localhost:3000";
};

// Default CORS headers (will be overridden with request-specific origin)
const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Will be set dynamically in handlers
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// Create Stripe checkout session
http.route({
    path: "/stripe/checkout",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

        if (!stripeSecretKey) {
            return new Response(
                JSON.stringify({ error: "Stripe not configured. Please set STRIPE_SECRET_KEY in Convex dashboard." }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        }

        const stripe = new Stripe(stripeSecretKey);

        try {
            const body = await request.json();
            const { items, successUrl, cancelUrl } = body;

            // Create line items for Stripe
            const lineItems = items.map((item: any) => ({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: item.name,
                        images: item.image ? [item.image] : [],
                    },
                    unit_amount: Math.round(item.price * 100), // Convert to cents
                },
                quantity: item.quantity,
            }));

            // Create checkout session with shipping
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                line_items: lineItems,
                success_url: successUrl,
                cancel_url: cancelUrl,
                billing_address_collection: "required",
                shipping_address_collection: {
                    allowed_countries: ["US", "CA", "GB", "AU"],
                },
                shipping_options: [
                    {
                        shipping_rate_data: {
                            type: "fixed_amount",
                            fixed_amount: { amount: 999, currency: "usd" },
                            display_name: "Standard Shipping",
                            delivery_estimate: {
                                minimum: { unit: "business_day", value: 5 },
                                maximum: { unit: "business_day", value: 7 },
                            },
                        },
                    },
                    {
                        shipping_rate_data: {
                            type: "fixed_amount",
                            fixed_amount: { amount: 1999, currency: "usd" },
                            display_name: "Express Shipping",
                            delivery_estimate: {
                                minimum: { unit: "business_day", value: 2 },
                                maximum: { unit: "business_day", value: 3 },
                            },
                        },
                    },
                ],
                metadata: {
                    items: JSON.stringify(items.map((item: any) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        variantName: item.variantName,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                    }))),
                },
            });

            return new Response(
                JSON.stringify({ sessionId: session.id, url: session.url }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        } catch (error: any) {
            console.error("Stripe checkout error:", error);
            return new Response(
                JSON.stringify({ error: error.message || "Checkout failed" }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        }
    }),
});

// CORS preflight handler
http.route({
    path: "/stripe/checkout",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }),
});

// Stripe webhook handler
http.route({
    path: "/stripe/webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!stripeSecretKey) {
            return new Response("Stripe not configured", { status: 500 });
        }

        const stripe = new Stripe(stripeSecretKey);

        const signature = request.headers.get("stripe-signature");
        const body = await request.text();

        let event: Stripe.Event;

        try {
            if (webhookSecret && signature) {
                event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
            } else {
                // For testing without webhook signature verification
                event = JSON.parse(body) as Stripe.Event;
            }
        } catch (err: any) {
            console.error("Webhook signature verification failed:", err.message);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        // Handle the event
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;

            // Parse items from metadata
            const itemsData = session.metadata?.items ? JSON.parse(session.metadata.items) : [];

            // Get shipping address from session
            const shippingDetails = (session as any).shipping_details;

            const shippingAddress = shippingDetails?.address ? {
                line1: shippingDetails.address.line1 || "",
                line2: shippingDetails.address.line2 || undefined,
                city: shippingDetails.address.city || "",
                state: shippingDetails.address.state || undefined,
                postalCode: shippingDetails.address.postal_code || "",
                country: shippingDetails.address.country || "",
            } : undefined;

            // Create order in database
            await ctx.runMutation(api.orders.createOrder, {
                stripeSessionId: session.id,
                stripePaymentIntentId: session.payment_intent as string || undefined,
                customerEmail: session.customer_details?.email || "",
                customerName: session.customer_details?.name || undefined,
                items: itemsData,
                subtotal: (session.amount_subtotal || 0) / 100,
                shipping: (session.shipping_cost?.amount_total || 0) / 100,
                tax: (session.total_details?.amount_tax || 0) / 100,
                total: (session.amount_total || 0) / 100,
                currency: session.currency || "usd",
                shippingAddress,
            });

            // Send confirmation email via internal action
            if (session.customer_details?.email) {
                try {
                    await ctx.runAction(internal.emails.sendOrderConfirmation, {
                        customerEmail: session.customer_details.email,
                        customerName: session.customer_details.name || undefined,
                        orderId: session.id.slice(-12).toUpperCase(),
                        items: itemsData.map((item: any) => ({
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                        })),
                        subtotal: (session.amount_subtotal || 0) / 100,
                        shipping: (session.shipping_cost?.amount_total || 0) / 100,
                        total: (session.amount_total || 0) / 100,
                        shippingAddress,
                    });
                } catch (emailError: any) {
                    console.error("Failed to send email:", emailError.message);
                    // Don't fail the webhook if email fails
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});


// ═══════════════════════════════════════════════════════════════════════════
// ALIEXPRESS API PROXY ROUTES
// Proxies API calls to RapidAPI to avoid CORS issues and keep API key secure
// ═══════════════════════════════════════════════════════════════════════════

const RAPIDAPI_HOST = "aliexpress-datahub.p.rapidapi.com";

// Search products on AliExpress
http.route({
    path: "/aliexpress/search",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const rapidApiKey = process.env.RAPIDAPI_KEY;

        if (!rapidApiKey) {
            return new Response(
                JSON.stringify({ error: "RapidAPI key not configured. Please set RAPIDAPI_KEY in Convex dashboard." }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        }

        try {
            const body = await request.json();
            const { query, page = 1, pageSize = 20, minPrice, maxPrice, sortBy } = body;

            // Build query params
            const params = new URLSearchParams({
                q: query,
                page: String(page),
                limit: String(pageSize),
            });

            if (minPrice) params.append("startPrice", String(minPrice));
            if (maxPrice) params.append("endPrice", String(maxPrice));
            if (sortBy && sortBy !== "default") params.append("sort", sortBy);

            const response = await fetch(
                `https://${RAPIDAPI_HOST}/item_search_3?${params.toString()}`,
                {
                    method: "GET",
                    headers: {
                        "X-RapidAPI-Key": rapidApiKey,
                        "X-RapidAPI-Host": RAPIDAPI_HOST,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("AliExpress API Error:", response.status, errorText);
                return new Response(
                    JSON.stringify({ error: `API Error: ${response.status}` }),
                    {
                        status: response.status,
                        headers: {
                            "Content-Type": "application/json",
                            ...corsHeaders,
                        }
                    }
                );
            }

            const data = await response.json();

            return new Response(
                JSON.stringify(data),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        } catch (error: any) {
            console.error("AliExpress search error:", error);
            return new Response(
                JSON.stringify({ error: error.message || "Search failed" }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        }
    }),
});

// CORS preflight for search
http.route({
    path: "/aliexpress/search",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }),
});

// Get product details by ID
http.route({
    path: "/aliexpress/product",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const rapidApiKey = process.env.RAPIDAPI_KEY;

        if (!rapidApiKey) {
            return new Response(
                JSON.stringify({ error: "RapidAPI key not configured. Please set RAPIDAPI_KEY in Convex dashboard." }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        }

        try {
            const body = await request.json();
            const { productId } = body;

            if (!productId) {
                return new Response(
                    JSON.stringify({ error: "Product ID is required" }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            ...corsHeaders,
                        }
                    }
                );
            }

            // Try multiple API versions with fallback for resilience
            const endpoints = [
                `https://${RAPIDAPI_HOST}/item_detail_2?itemId=${productId}`,
                `https://${RAPIDAPI_HOST}/item_detail_3?itemId=${productId}`,
                `https://${RAPIDAPI_HOST}/item_detail?itemId=${productId}`,
            ];

            let lastError = null;

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint, {
                        method: "GET",
                        headers: {
                            "X-RapidAPI-Key": rapidApiKey,
                            "X-RapidAPI-Host": RAPIDAPI_HOST,
                            "Content-Type": "application/json",
                        },
                    });

                    if (!response.ok) {
                        lastError = `API Error: ${response.status}`;
                        console.log(`Endpoint ${endpoint} failed with ${response.status}, trying next...`);
                        continue; // Try next endpoint
                    }

                    const data = await response.json();

                    // Check if the response indicates an error (some APIs return 200 with error in body)
                    if (data.result?.status?.data === "error") {
                        lastError = data.result?.status?.msg?.["internal-error"] || "API returned error";
                        console.log(`Endpoint ${endpoint} returned error in body, trying next...`);
                        continue; // Try next endpoint
                    }

                    // Success! Return the data
                    return new Response(
                        JSON.stringify(data),
                        {
                            status: 200,
                            headers: {
                                "Content-Type": "application/json",
                                ...corsHeaders,
                            }
                        }
                    );
                } catch (fetchError: any) {
                    lastError = fetchError.message;
                    console.log(`Endpoint ${endpoint} threw error: ${fetchError.message}, trying next...`);
                    continue; // Try next endpoint
                }
            }

            // All endpoints failed
            console.error("All AliExpress product detail endpoints failed:", lastError);
            return new Response(
                JSON.stringify({ error: lastError || "All API endpoints unavailable" }),
                {
                    status: 503,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        } catch (error: any) {
            console.error("AliExpress product detail error:", error);
            return new Response(
                JSON.stringify({ error: error.message || "Failed to get product details" }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        }
    }),
});

// CORS preflight for product details
http.route({
    path: "/aliexpress/product",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }),
});

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATED MULTI-SOURCE PRODUCT SEARCH
// Searches AliExpress, Alibaba, and more in parallel and combines results
// ═══════════════════════════════════════════════════════════════════════════

interface NormalizedProduct {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    image: string;
    images?: string[];
    url: string;
    source: 'aliexpress' | 'alibaba' | 'aliexpress-true' | 'temu';
    rating?: number;
    sales?: number;
    shipping?: string;
}

// Normalize AliExpress Datahub products
function normalizeAliExpressDatahub(data: any): NormalizedProduct[] {
    const items = data?.result?.resultList || [];
    return items.map((wrapper: any) => {
        const item = wrapper?.item || wrapper;
        return {
            id: `ae_${item.itemId}`,
            title: item.title || 'Unknown Product',
            price: parseFloat(item.sku?.def?.promotionPrice) || parseFloat(item.sku?.def?.price) || 0,
            originalPrice: parseFloat(item.sku?.def?.price) || undefined,
            image: item.image?.startsWith('//') ? `https:${item.image}` : item.image,
            url: item.itemUrl?.startsWith('//') ? `https:${item.itemUrl}` : item.itemUrl || '',
            source: 'aliexpress' as const,
            rating: item.averageStarRate || undefined,
            sales: item.sales || undefined,
        };
    }).filter((p: NormalizedProduct) => p.title && p.price > 0);
}

// Normalize Alibaba Datahub products
function normalizeAlibabaDatahub(data: any): NormalizedProduct[] {
    const items = data?.result?.resultList || [];
    return items.map((wrapper: any) => {
        const item = wrapper?.item || wrapper;

        // Alibaba prices are often ranges like "59.8-63.6" - take the first price
        let price = 0;
        const priceModule = item.sku?.def?.priceModule;
        if (priceModule?.price) {
            // Handle price range format like "59.8-63.6"
            const priceStr = String(priceModule.price);
            const firstPrice = priceStr.split('-')[0];
            price = parseFloat(firstPrice) || 0;
        } else if (priceModule?.priceList?.[0]?.price) {
            price = parseFloat(priceModule.priceList[0].price) || 0;
        }

        const imageUrl = item.image?.startsWith('//') ? `https:${item.image}` : item.image;
        const itemUrl = item.itemUrl?.startsWith('//') ? `https:${item.itemUrl}` : item.itemUrl || '';

        return {
            id: `ab_${item.itemId}`,
            title: item.title || 'Unknown Product',
            price: price,
            image: imageUrl,
            images: item.images?.map((img: string) => img.startsWith('//') ? `https:${img}` : img) || [imageUrl],
            url: itemUrl,
            source: 'alibaba' as const,
        };
    }).filter((p: NormalizedProduct) => p.title && p.price > 0);
}

// Normalize AliExpress True API products (search response)
function normalizeAliExpressTrueApi(data: any): NormalizedProduct[] {
    // True API returns array directly or in different structures
    const items = Array.isArray(data) ? data : (data?.products || data?.items || []);
    return items.map((item: any) => {
        const price = parseFloat(item.target_sale_price) || parseFloat(item.sale_price) || parseFloat(item.original_price) || 0;
        const images = item.product_small_image_urls?.string || [];
        return {
            id: `aet_${item.product_id || item.itemId}`,
            title: item.product_title || item.title || 'Unknown Product',
            price: price,
            originalPrice: parseFloat(item.original_price) || undefined,
            image: images[0] || item.product_main_image_url || '',
            images: images,
            url: item.product_detail_url || '',
            source: 'aliexpress-true' as const,
            rating: item.evaluate_rate ? parseFloat(item.evaluate_rate) : undefined,
        };
    }).filter((p: NormalizedProduct) => p.title && p.price > 0);
}

// Aggregated search endpoint
http.route({
    path: "/products/search",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const rapidApiKey = process.env.RAPIDAPI_KEY;

        if (!rapidApiKey) {
            return new Response(
                JSON.stringify({ error: "RapidAPI key not configured" }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        try {
            const body = await request.json();
            const { query: rawQuery, page = 1, pageSize = 60, sources = ['aliexpress', 'alibaba'] } = body;

            // ═══ QUERY OPTIMIZATION - Remove filler words, extract key terms ═══
            const fillerWords = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'with', 'in', 'on', 'to', 'of', 'that', 'this', 'is', 'i', 'my', 'me', 'need', 'want', 'looking', 'find', 'search', 'good', 'best', 'cheap', 'please', 'help']);
            const synonyms: Record<string, string> = { 'sofa': 'couch', 'couch': 'sofa', 'lamp': 'light', 'chair': 'seat', 'desk': 'table', 'rug': 'carpet' };
            const words = rawQuery.toLowerCase().trim().split(/\s+/).filter((w: string) => w.length > 1 && !fillerWords.has(w)).slice(0, 4);
            const query = words.length > 0 ? words.join(' ') : rawQuery;

            // Use primary + synonym query for maximum variety
            const synQuery = words.map((w: string) => synonyms[w] || w).join(' ');
            const allQueries = query !== synQuery ? [query, synQuery] : [query];
            const pagesPerApi = 5; // Full 5 pages - requires upgraded RapidAPI plan for high volume

            const results: NormalizedProduct[] = [];
            const errors: string[] = [];

            // Helper to fetch with timeout (extended for multi-page)
            const fetchWithTimeout = async (url: string, host: string, timeoutMs = 20000) => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    const response = await fetch(url, {
                        method: "GET",
                        headers: {
                            "X-RapidAPI-Key": rapidApiKey,
                            "X-RapidAPI-Host": host,
                        },
                        signal: controller.signal,
                    });
                    clearTimeout(timeout);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return await response.json();
                } catch (e) {
                    clearTimeout(timeout);
                    throw e;
                }
            };

            // Build all fetch promises - fetch multiple pages per API in parallel
            const fetchPromises: Promise<void>[] = [];

            // AliExpress Datahub - fetch multiple pages for each query variation
            if (sources.includes('aliexpress')) {
                for (const q of allQueries) {
                    for (let p = 1; p <= pagesPerApi; p++) {
                        const params = new URLSearchParams({ q: q, page: String(p), limit: '60' });
                        fetchPromises.push(
                            fetchWithTimeout(
                                `https://aliexpress-datahub.p.rapidapi.com/item_search_3?${params}`,
                                "aliexpress-datahub.p.rapidapi.com"
                            )
                                .then(data => { results.push(...normalizeAliExpressDatahub(data)); })
                                .catch(e => { if (p === 1 && q === allQueries[0]) errors.push(`AliExpress: ${e.message}`); })
                        );
                    }
                }
            }

            // Alibaba Datahub - fetch multiple pages for each query variation
            if (sources.includes('alibaba')) {
                for (const q of allQueries) {
                    for (let p = 1; p <= pagesPerApi; p++) {
                        const params = new URLSearchParams({ q: q, page: String(p) });
                        fetchPromises.push(
                            fetchWithTimeout(
                                `https://alibaba-datahub.p.rapidapi.com/item_search?${params}`,
                                "alibaba-datahub.p.rapidapi.com"
                            )
                                .then(data => { results.push(...normalizeAlibabaDatahub(data)); })
                                .catch(e => { if (p === 1 && q === allQueries[0]) errors.push(`Alibaba: ${e.message}`); })
                        );
                    }
                }
            }

            // AliExpress True API - fetch multiple pages
            if (sources.includes('aliexpress-true')) {
                for (let p = 1; p <= pagesPerApi; p++) {
                    const params = new URLSearchParams({
                        keywords: query,
                        page: String(p),
                        target_currency: 'USD',
                        target_language: 'EN',
                    });
                    fetchPromises.push(
                        fetchWithTimeout(
                            `https://aliexpress-true-api.p.rapidapi.com/api/v3/search?${params}`,
                            "aliexpress-true-api.p.rapidapi.com"
                        )
                            .then(data => { results.push(...normalizeAliExpressTrueApi(data)); })
                            .catch(e => { if (p === 1) errors.push(`AliExpress True: ${e.message}`); })
                    );
                }
            }

            // Wait for all to complete (with individual error handling)
            await Promise.all(fetchPromises);

            // Deduplicate results (same product may appear in multiple query variations)
            const seen = new Set<string>();
            const uniqueResults = results.filter(p => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
            });

            // Sort by price (optional: could add other sort options)
            uniqueResults.sort((a, b) => a.price - b.price);

            return new Response(
                JSON.stringify({
                    products: uniqueResults,
                    totalCount: uniqueResults.length,
                    currentPage: page,
                    sources: sources,
                    queriesUsed: allQueries, // Show what queries were actually searched
                    errors: errors.length > 0 ? errors : undefined,
                }),
                { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        } catch (error: any) {
            console.error("Aggregated search error:", error);
            return new Response(
                JSON.stringify({ error: error.message || "Search failed" }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }
    }),
});

// CORS preflight for aggregated search
http.route({
    path: "/products/search",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, { status: 204, headers: corsHeaders });
    }),
});

export default http;
