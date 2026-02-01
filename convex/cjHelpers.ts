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
