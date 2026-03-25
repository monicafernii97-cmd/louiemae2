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
        return await ctx.db.insert("products", {
            ...args,
            publishedAt: new Date().toISOString(),
        });
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
 * TODO: Enforce admin role/claim check here when role system is implemented.
 * Currently a single-owner app, so auth-only guard is sufficient.
 */
export const adminRemove = mutation({
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to delete products");
        }
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

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION: Fix broken product images
// ═══════════════════════════════════════════════════════════════════════════
export const fixBrokenImages = mutation({
    args: {},
    handler: async (ctx) => {
        const allProducts = await ctx.db.query("products").collect();
        let fixed = 0;

        for (const product of allProducts) {
            // Fix: Any product with the dead Unsplash URL (photo-1612196808214)
            const hasBrokenUrl = product.images?.some((img: string) =>
                img.includes("photo-1612196808214")
            );
            if (hasBrokenUrl) {
                await ctx.db.patch(product._id, {
                    images: ["/images/brand/rustic-vase.png"],
                });
                fixed++;
            }
        }

        return { fixed };
    },
});

/**
 * MIGRATION: Approve Berry Sweet Cardigan Set with CJ variant data
 * CJ sourcing succeeded (status 9) with cjProductId and 4 size variants
 */
export const fixBerrySweetCardigan = mutation({
    args: {},
    handler: async (ctx) => {
        const products = await ctx.db.query("products").collect();
        const berry = products.find(p => p.name === "Berry Sweet Cardigan Set");
        if (!berry) {
            return { success: false, message: "Berry Sweet Cardigan Set not found" };
        }

        await ctx.db.patch(berry._id, {
            cjSourcingStatus: "approved",
            cjProductId: "2602080412251614300",
            cjVariantId: "2602080412251614700", // Default variant (66cm)
            cjSku: "CJYE275801801AZ",
            cjSourcingError: undefined,
            cjApprovedAt: new Date().toISOString(),
            inStock: true,
            // CJ variants for admin linking UI
            cjVariants: [
                { vid: "2602080412251614700", sku: "CJYE275801801AZ", name: "Red - 66cm (3-6M)", price: 6.97, image: "https://cf.cjdropshipping.com/quick/product/7d28668d-d69c-4d9a-9c9e-57c475da085b.jpg" },
                { vid: "2602080412251615000", sku: "CJYE275801802BY", name: "Red - 73cm (6-12M)", price: 6.97, image: "https://cf.cjdropshipping.com/quick/product/7d28668d-d69c-4d9a-9c9e-57c475da085b.jpg" },
                { vid: "2602080412251615300", sku: "CJYE275801803CX", name: "Red - 80cm (12-18M)", price: 6.97, image: "https://cf.cjdropshipping.com/quick/product/7d28668d-d69c-4d9a-9c9e-57c475da085b.jpg" },
                { vid: "2602080412251615600", sku: "CJYE275801804DW", name: "Red - 90cm (18-24M)", price: 6.97, image: "https://cf.cjdropshipping.com/quick/product/7d28668d-d69c-4d9a-9c9e-57c475da085b.jpg" },
            ],
            // Customer-facing size variants linked to CJ variant IDs
            variants: [
                { id: "size_66cm", name: "Size: 66cm (3-6M)", priceAdjustment: 0, inStock: true, cjVariantId: "2602080412251614700", cjSku: "CJYE275801801AZ" },
                { id: "size_73cm", name: "Size: 73cm (6-12M)", priceAdjustment: 0, inStock: true, cjVariantId: "2602080412251615000", cjSku: "CJYE275801802BY" },
                { id: "size_80cm", name: "Size: 80cm (12-18M)", priceAdjustment: 0, inStock: true, cjVariantId: "2602080412251615300", cjSku: "CJYE275801803CX" },
                { id: "size_90cm", name: "Size: 90cm (18-24M)", priceAdjustment: 0, inStock: true, cjVariantId: "2602080412251615600", cjSku: "CJYE275801804DW" },
            ],
        });

        return {
            success: true,
            message: "Berry Sweet Cardigan Set approved with 4 size variants linked to CJ",
            cjProductId: "2602080412251614300",
            variantCount: 4,
        };
    },
});

