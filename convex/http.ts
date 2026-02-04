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
                        // CJ fulfillment - pass variant-level CJ IDs
                        cjVariantId: item.cjVariantId,
                        cjSku: item.cjSku,
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

            // Get customer phone if available
            const customerPhone = session.customer_details?.phone || shippingDetails?.phone || undefined;

            // Create order in database
            const orderId = await ctx.runMutation(api.orders.createOrder, {
                stripeSessionId: session.id,
                stripePaymentIntentId: session.payment_intent as string || undefined,
                customerEmail: session.customer_details?.email || "",
                customerName: session.customer_details?.name || undefined,
                customerPhone,
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

            // Forward order to CJ Dropshipping if items have CJ mapping
            const cjProducts = itemsData
                .filter((item: any) => item.cjVariantId || item.cjSku)
                .map((item: any) => ({
                    vid: item.cjVariantId || undefined,
                    sku: item.cjSku || undefined,
                    quantity: item.quantity,
                }));

            if (cjProducts.length > 0 && shippingAddress) {
                try {
                    await ctx.runAction(internal.cjDropshipping.createCjOrder, {
                        orderId,
                        orderNumber: session.id.slice(-12).toUpperCase(),
                        customerName: session.customer_details?.name || "Customer",
                        customerPhone: customerPhone || "",
                        customerEmail: session.customer_details?.email || "",
                        shippingAddress,
                        products: cjProducts,
                    });
                    console.log(`CJ order forwarding initiated for order ${orderId}`);
                } catch (cjError: any) {
                    console.error("Failed to forward order to CJ:", cjError.message);
                    // Don't fail the webhook if CJ order fails - it will be retried manually
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
// CJ DROPSHIPPING WEBHOOK
// Receives real-time notifications from CJ for order updates, tracking, etc.
// ═══════════════════════════════════════════════════════════════════════════

http.route({
    path: "/cj/webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();

            console.log("CJ Webhook received:", JSON.stringify(body, null, 2));

            const { messageId, type, messageType, params } = body;

            if (!messageId || !type) {
                return new Response(JSON.stringify({ success: false, error: "Invalid webhook payload" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Handle different webhook types
            switch (type) {
                case "ORDER":
                    // Order status update from CJ
                    await handleCjOrderWebhook(ctx, params, messageType);
                    break;

                case "LOGISTIC":
                    // Tracking/logistics update
                    await handleCjLogisticsWebhook(ctx, params);
                    break;

                case "ORDERSPLIT":
                    // Order was split into multiple shipments
                    console.log("CJ Order Split:", params);
                    break;

                case "PRODUCT":
                    // Product status update (approval/rejection)
                    console.log(`CJ PRODUCT update:`, params);
                    await handleCjProductWebhook(ctx, params);
                    break;

                case "VARIANT":
                    // Variant info from CJ - contains the vid we need for fulfillment
                    console.log(`CJ VARIANT update:`, params);
                    await handleCjVariantWebhook(ctx, params);
                    break;

                case "STOCK":
                    // Stock updates - log for now
                    console.log(`CJ STOCK update:`, params);
                    break;

                default:
                    console.log(`Unknown CJ webhook type: ${type}`, params);
            }

            // CJ requires 200 response within 3 seconds
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });

        } catch (error: any) {
            console.error("CJ Webhook error:", error.message);
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }),
});

// Handle CJ Order status webhook
async function handleCjOrderWebhook(ctx: any, params: any, messageType: string) {
    const { cjOrderId, orderNumber, orderStatus, trackNumber, logisticName, trackingUrl } = params;

    if (!orderNumber) {
        console.error("CJ Order webhook missing orderNumber");
        return;
    }

    console.log(`CJ Order ${orderNumber} status: ${orderStatus}, tracking: ${trackNumber}`);

    // Find order by order number (stripeSessionId last 12 chars uppercase)
    try {
        await ctx.runMutation(internal.cjHelpers.handleCjWebhookUpdate, {
            orderNumber,
            cjOrderId: cjOrderId?.toString(),
            cjStatus: mapCjOrderStatus(orderStatus),
            trackingNumber: trackNumber || undefined,
            trackingUrl: trackingUrl || undefined,
            carrier: logisticName || undefined,
        });
    } catch (error: any) {
        console.error("Failed to process CJ order webhook:", error.message);
    }
}

// Handle CJ Logistics/tracking webhook
async function handleCjLogisticsWebhook(ctx: any, params: any) {
    const { orderId, trackingNumber, logisticName, trackingStatus, trackingUrl } = params;

    console.log(`CJ Logistics update for order ${orderId}: ${trackingNumber}, status: ${trackingStatus}`);

    // Map CJ tracking status to our status
    let cjStatus: string = "shipped";
    if (trackingStatus === 12) {
        cjStatus = "delivered";
    } else if (trackingStatus === 13 || trackingStatus === 14) {
        cjStatus = "failed";
    }

    try {
        await ctx.runMutation(internal.cjHelpers.handleCjLogisticsUpdate, {
            cjOrderId: orderId?.toString(),
            trackingNumber: trackingNumber || undefined,
            trackingUrl: trackingUrl || undefined,
            carrier: logisticName || undefined,
            cjStatus,
        });
    } catch (error: any) {
        console.error("Failed to process CJ logistics webhook:", error.message);
    }
}

// Handle CJ Product webhook (approval/rejection status)
async function handleCjProductWebhook(ctx: any, params: any) {
    const { pid, productName, productStatus, statusReason } = params;

    if (!pid) {
        console.error("CJ Product webhook missing pid");
        return;
    }

    // Find product by CJ product ID
    const products = await ctx.runQuery(internal.cjHelpers.getProductByCjProductId, { cjProductId: pid });

    if (!products || products.length === 0) {
        console.log(`CJ Product webhook: No product found for pid=${pid}, storing for later matching`);
        // Product might not be linked yet - store the CJ product ID for later reference
        return;
    }

    for (const product of products) {
        console.log(`CJ Product update for ${product.name}: status=${productStatus}`);

        // Status 22 = approved/active
        if (productStatus === 22) {
            await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                productId: product._id,
                status: "approved",
                cjProductId: pid,
            });
        } else if (productStatus === 5 || productStatus === 6) {
            // Status 5/6 = rejected
            await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                productId: product._id,
                status: "rejected",
                cjProductId: pid,
                error: statusReason || "Product rejected by CJ",
            });
        }
    }
}

// Handle CJ Variant webhook (variant IDs for fulfillment)
async function handleCjVariantWebhook(ctx: any, params: any) {
    const {
        pid,
        vid,
        variantSku,
        variantName,
        variantStatus,
        variantImage,
        variantSellPrice,
        variantValue1,
        variantValue2,
    } = params;

    if (!pid || !vid) {
        console.error("CJ Variant webhook missing pid or vid");
        return;
    }

    console.log(`Processing CJ Variant: pid=${pid}, vid=${vid}, sku=${variantSku}`);

    // Find product by CJ product ID
    const products = await ctx.runQuery(internal.cjHelpers.getProductByCjProductId, { cjProductId: pid });

    // If not found by CJ product ID, try to find pending products and link them
    if (!products || products.length === 0) {
        console.log(`CJ Variant webhook: No product found for pid=${pid}, trying to find pending products`);

        // Try to find pending products that might match this CJ product
        const pendingProducts = await ctx.runQuery(internal.cjHelpers.getProductsPendingSourcing, {});

        if (pendingProducts && pendingProducts.length > 0) {
            // Log available pending products for manual linking if needed
            console.log(`Found ${pendingProducts.length} pending products that could be linked to CJ pid=${pid}`);
        }
        return;
    }

    // Only process if variant is active (status 22)
    if (variantStatus !== 22) {
        console.log(`CJ Variant ${vid} has status ${variantStatus}, skipping (not active)`);
        return;
    }

    // Build a friendly variant name from available data
    const friendlyName = variantName ||
        (variantValue1 && variantValue2 ? `${variantValue1} - ${variantValue2}` :
            variantValue1 || variantValue2 || `Variant ${vid}`);

    // Build the CJ variant object
    const cjVariant = {
        vid: vid,
        sku: variantSku || "",
        name: friendlyName,
        price: variantSellPrice ? parseFloat(variantSellPrice) : undefined,
        image: variantImage,
    };

    // Append variant to each matching product
    for (const product of products) {
        console.log(`Appending CJ variant to ${product.name}: vid=${vid}, name=${friendlyName}`);

        await ctx.runMutation(internal.cjHelpers.appendCjVariant, {
            productId: product._id,
            cjVariant,
        });
    }
}


// Map CJ order status strings to our status
function mapCjOrderStatus(cjStatus: string): string {
    const statusMap: Record<string, string> = {
        "CREATED": "confirmed",
        "IN_CART": "confirmed",
        "UNPAID": "confirmed",
        "UNSHIPPED": "processing",
        "SHIPPED": "shipped",
        "DELIVERED": "delivered",
        "CANCELLED": "cancelled",
    };
    return statusMap[cjStatus] || "processing";
}


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
    variants?: Array<{
        id: string;
        name: string;
        image?: string;
        priceAdjustment: number;
        inStock: boolean;
    }>;
}

// Normalize AliExpress Datahub products
function normalizeAliExpressDatahub(data: any): NormalizedProduct[] {
    const items = data?.result?.resultList || [];
    return items.map((wrapper: any) => {
        const item = wrapper?.item || wrapper;
        const basePrice = parseFloat(item.sku?.def?.promotionPrice) || parseFloat(item.sku?.def?.price) || 0;

        // Extract variants from SKU data
        const variants: NormalizedProduct['variants'] = [];
        const skuData = item.sku || {};
        const skuList = skuData.skuList || skuData.list || [];
        const skuProps = skuData.props || skuData.properties || [];

        // Build a mapping of propId:valueId -> { name, image } from skuProps
        // This lets us decode propPath codes like "201336100:28320" into readable names
        const propValueMap: Record<string, { propName: string; valueName: string; image?: string }> = {};

        if (Array.isArray(skuProps) && skuProps.length > 0) {
            skuProps.forEach((prop: any) => {
                const propId = prop.id || prop.attrNameId || prop.pid || '';
                const propName = prop.name || prop.attrName || 'Option';
                const values = prop.values || prop.attrValues || [];

                values.forEach((val: any) => {
                    const valueId = val.id || val.attrValueId || val.vid || '';
                    const valueName = val.name || val.attrValue || val.value || val;
                    let valueImage = val.image || val.skuImage || val.img || '';
                    if (valueImage && valueImage.startsWith('//')) {
                        valueImage = `https:${valueImage}`;
                    }

                    // Create multiple lookup keys to handle different API formats
                    const key1 = `${propId}:${valueId}`;
                    const key2 = `${propId}#${valueId}`;
                    const mapValue = { propName, valueName: String(valueName), image: valueImage || undefined };

                    if (propId && valueId) {
                        propValueMap[key1] = mapValue;
                        propValueMap[key2] = mapValue;
                    }
                });
            });
        }

        // Method 1: Parse from skuList (detailed variant data with prices)
        if (Array.isArray(skuList) && skuList.length > 0) {
            skuList.forEach((sku: any, index: number) => {
                // Try to decode propPath using our mapping
                let variantName = '';
                let variantImage = sku.image || sku.skuVal?.image || '';

                const propPath = sku.propPath || sku.skuAttr || '';
                if (propPath) {
                    // propPath format: "propId:valueId;propId2:valueId2" or "propId:valueId,propId2:valueId2"
                    const propPairs = propPath.split(/[;,]/);
                    const decodedParts: string[] = [];

                    propPairs.forEach((pair: string) => {
                        const [propId, valueId] = pair.split(':');
                        const key = `${propId}:${valueId}`;
                        const mapped = propValueMap[key];

                        if (mapped) {
                            decodedParts.push(`${mapped.propName}: ${mapped.valueName}`);
                            // Use the mapped image if we don't have one yet
                            if (!variantImage && mapped.image) {
                                variantImage = mapped.image;
                            }
                        }
                    });

                    if (decodedParts.length > 0) {
                        variantName = decodedParts.join(' / ');
                    }
                }

                // Fallback to other name sources
                if (!variantName) {
                    variantName = sku.name ||
                        sku.attributes?.map((a: any) => `${a.name || 'Option'}: ${a.value}`).join(' / ') ||
                        sku.skuAttr ||
                        `Option ${index + 1}`;
                }

                const variantPrice = parseFloat(sku.promotionPrice || sku.price || sku.skuVal?.skuCalPrice) || 0;
                const priceAdjustment = variantPrice ? variantPrice - basePrice : 0;

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

        // Method 2: Fallback - parse from props/properties directly (size/color categories)
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

        return {
            id: `ae_${item.itemId}`,
            title: item.title || 'Unknown Product',
            price: basePrice,
            originalPrice: parseFloat(item.sku?.def?.price) || undefined,
            image: item.image?.startsWith('//') ? `https:${item.image}` : item.image,
            url: item.itemUrl?.startsWith('//') ? `https:${item.itemUrl}` : item.itemUrl || '',
            source: 'aliexpress' as const,
            rating: item.averageStarRate || undefined,
            sales: item.sales || undefined,
            variants: variants.length > 0 ? variants : undefined,
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

        // Extract variants from Alibaba SKU data
        const variants: NormalizedProduct['variants'] = [];
        const skuData = item.sku || {};
        const skuProps = skuData.props || skuData.properties || item.skuProps || [];

        // Parse from priceList (quantity-based pricing)
        if (priceModule?.priceList && Array.isArray(priceModule.priceList)) {
            priceModule.priceList.forEach((pl: any, index: number) => {
                const variantPrice = parseFloat(pl.price) || 0;
                variants.push({
                    id: `qty_${index}`,
                    name: pl.quantity ? `Qty: ${pl.quantity}+` : `Option ${index + 1}`,
                    priceAdjustment: variantPrice - price,
                    inStock: true,
                });
            });
        }

        // Parse from props/properties (color/size options)
        if (Array.isArray(skuProps) && skuProps.length > 0) {
            skuProps.forEach((prop: any) => {
                const propName = prop.name || prop.attrName || 'Option';
                const values = prop.values || prop.attrValues || [];

                values.forEach((val: any, index: number) => {
                    const valueName = val.name || val.attrValue || val;
                    let valueImage = val.image || '';
                    if (valueImage && valueImage.startsWith('//')) {
                        valueImage = `https:${valueImage}`;
                    }

                    variants.push({
                        id: val.id || `${propName}_${index}`,
                        name: `${propName}: ${valueName}`,
                        image: valueImage || undefined,
                        priceAdjustment: 0,
                        inStock: true,
                    });
                });
            });
        }

        return {
            id: `ab_${item.itemId}`,
            title: item.title || 'Unknown Product',
            price: price,
            image: imageUrl,
            images: item.images?.map((img: string) => img.startsWith('//') ? `https:${img}` : img) || [imageUrl],
            url: itemUrl,
            source: 'alibaba' as const,
            variants: variants.length > 0 ? variants : undefined,
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
