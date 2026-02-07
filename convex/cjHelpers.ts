import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════════════
// CJ DROPSHIPPING DATABASE HELPERS
// These must be in a non-Node.js file for Convex to allow queries/mutations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update order CJ status and error
 */
export const updateOrderCjStatus = internalMutation({
    args: {
        orderId: v.id("orders"),
        cjStatus: v.union(
            v.literal("pending"),
            v.literal("sending"),
            v.literal("confirmed"),
            v.literal("processing"),
            v.literal("shipped"),
            v.literal("delivered"),
            v.literal("failed"),
            v.literal("cancelled")
        ),
        cjOrderId: v.optional(v.string()),
        cjError: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.orderId, {
            cjStatus: args.cjStatus,
            cjOrderId: args.cjOrderId,
            cjError: args.cjError || undefined,
            cjLastSyncAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    },
});

/**
 * Update order tracking information
 */
export const updateOrderTracking = internalMutation({
    args: {
        orderId: v.id("orders"),
        trackingNumber: v.string(),
        trackingUrl: v.optional(v.string()),
        carrier: v.optional(v.string()),
        cjStatus: v.optional(v.union(
            v.literal("shipped"),
            v.literal("delivered")
        )),
    },
    handler: async (ctx, args) => {
        const updateData: Record<string, any> = {
            trackingNumber: args.trackingNumber,
            trackingUrl: args.trackingUrl,
            carrier: args.carrier,
            shippedAt: new Date().toISOString(),
            cjLastSyncAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (args.cjStatus) {
            updateData.cjStatus = args.cjStatus;
            updateData.status = args.cjStatus; // Also update main order status
        }

        await ctx.db.patch(args.orderId, updateData);
    },
});

/**
 * Get orders that need tracking sync
 * (CJ confirmed/processing but not yet shipped)
 */
export const getOrdersNeedingSync = internalQuery({
    args: {},
    handler: async (ctx) => {
        // Get orders with CJ status confirmed or processing
        const orders = await ctx.db
            .query("orders")
            .filter((q) =>
                q.or(
                    q.eq(q.field("cjStatus"), "confirmed"),
                    q.eq(q.field("cjStatus"), "processing")
                )
            )
            .collect();

        // Filter to only those that haven't been synced recently (1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        return orders.filter(o => !o.cjLastSyncAt || o.cjLastSyncAt < oneHourAgo);
    },
});

/**
 * Handle CJ order webhook update
 * Called when CJ sends order status updates
 */
export const handleCjWebhookUpdate = internalMutation({
    args: {
        orderNumber: v.string(),
        cjOrderId: v.optional(v.string()),
        cjStatus: v.string(),
        trackingNumber: v.optional(v.string()),
        trackingUrl: v.optional(v.string()),
        carrier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Find order by the order number we used when creating it
        // We use the last 12 chars of stripeSessionId uppercase as orderNumber
        const allOrders = await ctx.db.query("orders").collect();
        const order = allOrders.find(o =>
            o.stripeSessionId.slice(-12).toUpperCase() === args.orderNumber
        );

        if (!order) {
            console.error(`CJ Webhook: Order not found for orderNumber: ${args.orderNumber}`);
            return;
        }

        // Build update object
        const updateData: Record<string, any> = {
            cjLastSyncAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Map cjStatus string to valid status
        const validStatuses = ["pending", "sending", "confirmed", "processing", "shipped", "delivered", "failed", "cancelled"];
        if (validStatuses.includes(args.cjStatus)) {
            updateData.cjStatus = args.cjStatus;

            // Also update main order status for shipped/delivered
            if (args.cjStatus === "shipped") {
                updateData.status = "shipped";
            } else if (args.cjStatus === "delivered") {
                updateData.status = "delivered";
            }
        }

        if (args.cjOrderId) {
            updateData.cjOrderId = args.cjOrderId;
        }

        if (args.trackingNumber) {
            updateData.trackingNumber = args.trackingNumber;
            updateData.shippedAt = new Date().toISOString();
        }

        if (args.trackingUrl) {
            updateData.trackingUrl = args.trackingUrl;
        }

        if (args.carrier) {
            updateData.carrier = args.carrier;
        }

        await ctx.db.patch(order._id, updateData);

        console.log(`CJ Webhook: Updated order ${order._id} with status ${args.cjStatus}`);
    },
});

/**
 * Handle CJ logistics/tracking webhook update
 * Called when CJ sends logistics/shipping updates
 */
export const handleCjLogisticsUpdate = internalMutation({
    args: {
        cjOrderId: v.string(),
        trackingNumber: v.optional(v.string()),
        trackingUrl: v.optional(v.string()),
        carrier: v.optional(v.string()),
        cjStatus: v.string(),
    },
    handler: async (ctx, args) => {
        // Find order by CJ order ID
        const allOrders = await ctx.db.query("orders").collect();
        const order = allOrders.find(o => o.cjOrderId === args.cjOrderId);

        if (!order) {
            console.error(`CJ Logistics Webhook: Order not found for cjOrderId: ${args.cjOrderId}`);
            return;
        }

        const updateData: Record<string, any> = {
            cjLastSyncAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Map status
        const validStatuses = ["shipped", "delivered", "failed"];
        if (validStatuses.includes(args.cjStatus)) {
            updateData.cjStatus = args.cjStatus;
            updateData.status = args.cjStatus; // Sync main status
        }

        if (args.trackingNumber) {
            updateData.trackingNumber = args.trackingNumber;
            if (!order.shippedAt) {
                updateData.shippedAt = new Date().toISOString();
            }
        }

        if (args.trackingUrl) {
            updateData.trackingUrl = args.trackingUrl;
        }

        if (args.carrier) {
            updateData.carrier = args.carrier;
        }

        await ctx.db.patch(order._id, updateData);

        console.log(`CJ Logistics: Updated order ${order._id} with tracking ${args.trackingNumber}, status ${args.cjStatus}`);
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT SOURCING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update product CJ sourcing status
 */
export const updateProductSourcingStatus = internalMutation({
    args: {
        productId: v.id("products"),
        status: v.union(
            v.literal("pending"),
            v.literal("approved"),
            v.literal("rejected"),
            v.literal("none")
        ),
        sourcingId: v.optional(v.string()),
        cjProductId: v.optional(v.string()),
        cjVariantId: v.optional(v.string()),
        cjSku: v.optional(v.string()),
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Idempotency check: if product is already in the desired status, skip update
        const product = await ctx.db.get(args.productId);
        if (!product) {
            console.log(`updateProductSourcingStatus: Product ${args.productId} not found`);
            return;
        }

        // Skip if already approved (prevents duplicate webhook processing)
        if (args.status === "approved" && product.cjSourcingStatus === "approved") {
            console.log(`updateProductSourcingStatus: Product ${args.productId} already approved, skipping`);
            return;
        }

        const updateData: Record<string, any> = {
            cjSourcingStatus: args.status,
        };

        if (args.sourcingId) {
            updateData.cjSourcingId = args.sourcingId;
        }
        if (args.cjProductId) {
            updateData.cjProductId = args.cjProductId;
        }
        if (args.cjVariantId) {
            updateData.cjVariantId = args.cjVariantId;
        }
        if (args.cjSku) {
            updateData.cjSku = args.cjSku;
        }
        if (args.error) {
            updateData.cjSourcingError = args.error;
        }
        if (args.status === "approved") {
            updateData.cjApprovedAt = new Date().toISOString();
        }

        await ctx.db.patch(args.productId, updateData);
    },
});

/**
 * Get product by CJ product ID
 */
export const getProductByCjProductId = internalQuery({
    args: { cjProductId: v.string() },
    handler: async (ctx, args) => {
        const products = await ctx.db
            .query("products")
            .filter((q) => q.eq(q.field("cjProductId"), args.cjProductId))
            .collect();
        return products;
    },
});

/**
 * Get products pending CJ sourcing approval
 */
export const getProductsPendingSourcing = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("products")
            .withIndex("by_cj_sourcing_status", (q) => q.eq("cjSourcingStatus", "pending"))
            .collect();
    },
});

/**
 * Get recently approved products for admin notifications
 */
export const getRecentlyApprovedProducts = internalQuery({
    args: {},
    handler: async (ctx) => {
        // Get products approved in the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const approvedProducts = await ctx.db
            .query("products")
            .withIndex("by_cj_sourcing_status", (q) => q.eq("cjSourcingStatus", "approved"))
            .collect();

        // Filter to only recently approved ones
        return approvedProducts.filter(p =>
            p.cjApprovedAt && p.cjApprovedAt >= sevenDaysAgo
        );
    },
});

/**
 * Get products pending or rejected (for admin view)
 */
export const getProductsWithSourcingIssues = internalQuery({
    args: {},
    handler: async (ctx) => {
        const pending = await ctx.db
            .query("products")
            .withIndex("by_cj_sourcing_status", (q) => q.eq("cjSourcingStatus", "pending"))
            .collect();

        const rejected = await ctx.db
            .query("products")
            .withIndex("by_cj_sourcing_status", (q) => q.eq("cjSourcingStatus", "rejected"))
            .collect();

        return { pending, rejected };
    },
});

/**
 * Delete a product from the database (called by cancelSourcingAndDelete action)
 */
export const deleteProduct = internalMutation({
    args: {
        productId: v.id("products"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.productId);
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// CJ VARIANT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Append a CJ variant from webhook (upsert by vid)
 * Called when CJ sends VARIANT webhooks with size/color options
 */
export const appendCjVariant = internalMutation({
    args: {
        productId: v.id("products"),
        cjVariant: v.object({
            vid: v.string(),
            sku: v.string(),
            name: v.string(),
            price: v.optional(v.number()),
            image: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.productId);
        if (!product) {
            console.error(`Product ${args.productId} not found for CJ variant append`);
            return;
        }

        // Get existing CJ variants or initialize empty array
        const existingVariants = product.cjVariants || [];

        // Check if this vid already exists (upsert)
        const existingIndex = existingVariants.findIndex(v => v.vid === args.cjVariant.vid);

        if (existingIndex >= 0) {
            // Update existing variant
            existingVariants[existingIndex] = args.cjVariant;
        } else {
            // Add new variant
            existingVariants.push(args.cjVariant);
        }

        await ctx.db.patch(args.productId, {
            cjVariants: existingVariants,
            cjSourcingStatus: "approved", // Mark as approved since we're receiving variants
        });

        console.log(`Appended CJ variant ${args.cjVariant.vid} to product ${product.name}`);
    },
});

/**
 * Link a CJ variant to a customer-facing variant (size option)
 * Called from admin UI when user maps CJ variants to sizes
 */
export const linkCjVariantToSize = internalMutation({
    args: {
        productId: v.id("products"),
        customerVariantId: v.string(),  // The internal variant ID (e.g., "size_3t")
        cjVariantId: v.string(),         // CJ vid to link
        cjSku: v.optional(v.string()),   // CJ sku to link
    },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.productId);
        if (!product) {
            throw new Error(`Product ${args.productId} not found`);
        }

        if (!product.variants) {
            throw new Error("Product has no variants to link");
        }

        // Find and update the customer variant
        const updatedVariants = product.variants.map(v => {
            if (v.id === args.customerVariantId) {
                return {
                    ...v,
                    cjVariantId: args.cjVariantId,
                    cjSku: args.cjSku,
                };
            }
            return v;
        });

        await ctx.db.patch(args.productId, {
            variants: updatedVariants,
        });

        console.log(`Linked CJ variant ${args.cjVariantId} to customer variant ${args.customerVariantId}`);
    },
});

/**
 * Unlink a CJ variant from a customer-facing variant
 */
export const unlinkCjVariant = internalMutation({
    args: {
        productId: v.id("products"),
        customerVariantId: v.string(),
    },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.productId);
        if (!product || !product.variants) {
            throw new Error("Product or variants not found");
        }

        const updatedVariants = product.variants.map(v => {
            if (v.id === args.customerVariantId) {
                return {
                    ...v,
                    cjVariantId: undefined,
                    cjSku: undefined,
                };
            }
            return v;
        });

        await ctx.db.patch(args.productId, {
            variants: updatedVariants,
        });
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK DEDUPLICATION HELPERS
// Prevent duplicate processing of CJ webhooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a webhook messageId has already been processed
 */
export const wasWebhookProcessed = internalQuery({
    args: {
        messageId: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("cjWebhookLog")
            .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
            .first();
        return existing !== null;
    },
});

/**
 * Record a processed webhook messageId
 */
export const recordProcessedWebhook = internalMutation({
    args: {
        messageId: v.string(),
        type: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("cjWebhookLog", {
            messageId: args.messageId,
            type: args.type,
            processedAt: new Date().toISOString(),
        });
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// CJ TOKEN STORAGE HELPERS
// Persist tokens in database to avoid rate limiting from frequent token requests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get stored CJ tokens from database
 */
export const getCjTokens = internalQuery({
    args: {},
    handler: async (ctx) => {
        // Get the most recent token record
        const tokens = await ctx.db.query("cjTokens").order("desc").first();
        return tokens;
    },
});

/**
 * Save CJ tokens to database (creates or updates)
 * Uses CJ's actual expiry date strings from their API response
 */
export const saveCjTokens = internalMutation({
    args: {
        openId: v.optional(v.string()),
        accessToken: v.string(),
        accessTokenExpiryDate: v.string(), // CJ's date string
        refreshToken: v.string(),
        refreshTokenExpiryDate: v.string(), // CJ's date string
        createDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Delete any existing tokens
        const existingTokens = await ctx.db.query("cjTokens").collect();
        for (const token of existingTokens) {
            await ctx.db.delete(token._id);
        }

        // Insert new tokens with CJ's expiry dates
        await ctx.db.insert("cjTokens", {
            openId: args.openId,
            accessToken: args.accessToken,
            accessTokenExpiryDate: args.accessTokenExpiryDate,
            refreshToken: args.refreshToken,
            refreshTokenExpiryDate: args.refreshTokenExpiryDate,
            createDate: args.createDate,
            updatedAt: new Date().toISOString(),
        });
    },
});

/**
 * Update only the access token (when refreshing)
 */
export const updateAccessToken = internalMutation({
    args: {
        accessToken: v.string(),
        accessTokenExpiryDate: v.string(), // CJ's date string
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("cjTokens").order("desc").first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                accessToken: args.accessToken,
                accessTokenExpiryDate: args.accessTokenExpiryDate,
                updatedAt: new Date().toISOString(),
            });
        }
    },
});
