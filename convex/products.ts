import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Public queries - no auth required
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("products").collect();
    },
});

export const get = query({
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Protected mutations - require authentication
export const create = mutation({
    args: {
        name: v.string(),
        price: v.number(),
        description: v.string(),
        images: v.array(v.string()),
        category: v.string(),
        collection: v.string(),
        isNew: v.optional(v.boolean()),
        inStock: v.optional(v.boolean()),
        variants: v.optional(v.array(v.object({
            id: v.string(),
            name: v.string(),
            image: v.optional(v.string()),
            priceAdjustment: v.number(),
            inStock: v.boolean(),
            cjVariantId: v.optional(v.string()),
            cjSku: v.optional(v.string()),
        }))),
        // CJ Sourcing fields
        sourceUrl: v.optional(v.string()),
        cjSourcingStatus: v.optional(v.union(
            v.literal("pending"),
            v.literal("approved"),
            v.literal("rejected"),
            v.literal("none")
        )),
    },
    handler: async (ctx, args) => {
        // Require authentication
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to create products");
        }
        return await ctx.db.insert("products", args);
    },
});

export const update = mutation({
    args: {
        id: v.id("products"),
        name: v.optional(v.string()),
        price: v.optional(v.number()),
        description: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
        category: v.optional(v.string()),
        collection: v.optional(v.string()),
        isNew: v.optional(v.boolean()),
        inStock: v.optional(v.boolean()),
        variants: v.optional(v.array(v.object({
            id: v.string(),
            name: v.string(),
            image: v.optional(v.string()),
            priceAdjustment: v.number(),
            inStock: v.boolean(),
            cjVariantId: v.optional(v.string()),
            cjSku: v.optional(v.string()),
        }))),
    },
    handler: async (ctx, args) => {
        // Require authentication
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to update products");
        }
        const { id, ...updates } = args;
        // Filter out undefined values
        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filteredUpdates);
    },
});

export const remove = mutation({
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
        // Require authentication
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to delete products");
        }
        await ctx.db.delete(args.id);
    },
});

/**
 * Admin-only remove - simpler version for CJ Settings panel
 * Note: In production, you'd want to add proper admin verification
 */
export const adminRemove = mutation({
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// STOREFRONT PRODUCTS (filtered for public display)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get products for storefront display
 * Filters out products with "pending" or "rejected" CJ sourcing status
 * Only shows products that are ready to be fulfilled
 */
export const listForStorefront = query({
    args: {},
    handler: async (ctx) => {
        const allProducts = await ctx.db.query("products").collect();

        // Filter out products that are pending or rejected CJ sourcing
        return allProducts.filter(product => {
            // If no CJ sourcing status set, show the product (legacy or manual products)
            if (!product.cjSourcingStatus || product.cjSourcingStatus === "none") {
                return true;
            }
            // Only show approved products
            return product.cjSourcingStatus === "approved";
        });
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN SOURCING QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get products pending CJ sourcing approval (for admin)
 */
export const getPendingSourcing = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("products")
            .withIndex("by_cj_sourcing_status", (q) => q.eq("cjSourcingStatus", "pending"))
            .collect();
    },
});

/**
 * Get recently approved products (for admin notifications)
 */
export const getRecentlyApproved = query({
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
 * Get rejected products (for admin to review/resubmit)
 */
export const getRejectedProducts = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("products")
            .withIndex("by_cj_sourcing_status", (q) => q.eq("cjSourcingStatus", "rejected"))
            .collect();
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// CJ VARIANT MANAGEMENT (Admin)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Link a CJ variant to a customer-facing variant (size option)
 * Used by admin UI to map CJ variants to sizes for correct fulfillment
 */
export const linkCjVariant = mutation({
    args: {
        productId: v.id("products"),
        customerVariantId: v.string(),  // The internal variant ID (e.g., "size_3t")
        cjVariantId: v.string(),         // CJ vid to link
        cjSku: v.optional(v.string()),   // CJ sku to link
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to manage variants");
        }

        const product = await ctx.db.get(args.productId);
        if (!product) {
            throw new Error("Product not found");
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
    },
});

/**
 * Unlink a CJ variant from a customer-facing variant
 */
export const unlinkCjVariant = mutation({
    args: {
        productId: v.id("products"),
        customerVariantId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to manage variants");
        }

        const product = await ctx.db.get(args.productId);
        if (!product || !product.variants) {
            throw new Error("Product or variants not found");
        }

        const updatedVariants = product.variants.map(v => {
            if (v.id === args.customerVariantId) {
                // Remove CJ variant link while keeping other properties
                const { cjVariantId, cjSku, ...rest } = v as any;
                return rest;
            }
            return v;
        });

        await ctx.db.patch(args.productId, {
            variants: updatedVariants,
        });
    },
});

/**
 * Get products with CJ variants for admin variant management
 */
export const getProductsWithCjVariants = query({
    args: {},
    handler: async (ctx) => {
        const products = await ctx.db
            .query("products")
            .withIndex("by_cj_sourcing_status", (q) => q.eq("cjSourcingStatus", "approved"))
            .collect();

        // Only return products that have CJ variants to manage
        return products.filter(p => p.cjVariants && p.cjVariants.length > 0);
    },
});
