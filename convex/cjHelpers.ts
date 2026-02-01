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
