import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════
// ALIEXPRESS CACHE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cache an AliExpress product for faster future access
 */
export const cacheProduct = mutation({
    args: {
        aliexpressId: v.string(),
        name: v.string(),
        originalPrice: v.number(),
        salePrice: v.number(),
        images: v.array(v.string()),
        category: v.string(),
        description: v.optional(v.string()),
        averageRating: v.number(),
        reviewCount: v.number(),
        productUrl: v.optional(v.string()),
        sellerName: v.optional(v.string()),
        shippingInfo: v.object({
            freeShipping: v.boolean(),
            estimatedDays: v.optional(v.string()),
            cost: v.optional(v.number()),
        }),
        inStock: v.boolean(),
        searchQuery: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if already cached
        const existing = await ctx.db
            .query("aliexpressCache")
            .withIndex("by_aliexpress_id", (q) => q.eq("aliexpressId", args.aliexpressId))
            .first();

        if (existing) {
            // Update existing cache entry
            await ctx.db.patch(existing._id, {
                ...args,
                lastFetched: new Date().toISOString(),
            });
            return existing._id;
        }

        // Create new cache entry
        return await ctx.db.insert("aliexpressCache", {
            ...args,
            lastFetched: new Date().toISOString(),
        });
    },
});

/**
 * Get cached product by AliExpress ID
 */
export const getCachedProduct = query({
    args: { aliexpressId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("aliexpressCache")
            .withIndex("by_aliexpress_id", (q) => q.eq("aliexpressId", args.aliexpressId))
            .first();
    },
});

/**
 * Get cached products by search query
 */
export const getCachedByQuery = query({
    args: { searchQuery: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("aliexpressCache")
            .withIndex("by_search_query", (q) => q.eq("searchQuery", args.searchQuery))
            .collect();
    },
});

/**
 * Bulk cache multiple products (for search results)
 */
export const cacheProducts = mutation({
    args: {
        products: v.array(v.object({
            aliexpressId: v.string(),
            name: v.string(),
            originalPrice: v.number(),
            salePrice: v.number(),
            images: v.array(v.string()),
            category: v.string(),
            description: v.optional(v.string()),
            averageRating: v.number(),
            reviewCount: v.number(),
            productUrl: v.optional(v.string()),
            sellerName: v.optional(v.string()),
            shippingInfo: v.object({
                freeShipping: v.boolean(),
                estimatedDays: v.optional(v.string()),
                cost: v.optional(v.number()),
            }),
            inStock: v.boolean(),
        })),
        searchQuery: v.string(),
    },
    handler: async (ctx, args) => {
        const cachedIds: Id<"aliexpressCache">[] = [];

        for (const product of args.products) {
            // Check if already cached
            const existing = await ctx.db
                .query("aliexpressCache")
                .withIndex("by_aliexpress_id", (q) => q.eq("aliexpressId", product.aliexpressId))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    ...product,
                    searchQuery: args.searchQuery,
                    lastFetched: new Date().toISOString(),
                });
                cachedIds.push(existing._id);
            } else {
                const id = await ctx.db.insert("aliexpressCache", {
                    ...product,
                    searchQuery: args.searchQuery,
                    lastFetched: new Date().toISOString(),
                });
                cachedIds.push(id);
            }
        }

        return cachedIds;
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT HISTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record a product import
 */
export const recordImport = mutation({
    args: {
        aliexpressId: v.string(),
        importedProductId: v.id("products"),
        originalName: v.string(),
        importedName: v.string(),
        originalPrice: v.number(),
        importedPrice: v.number(),
        markup: v.number(),
        markupType: v.union(v.literal("percentage"), v.literal("fixed")),
        collection: v.string(),
        aiEnhanced: v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("importHistory", {
            ...args,
            importedAt: new Date().toISOString(),
        });
    },
});

/**
 * Get import history with pagination
 */
export const getImportHistory = query({
    args: {
        limit: v.optional(v.number()),
        collection: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;

        if (args.collection) {
            return await ctx.db
                .query("importHistory")
                .withIndex("by_collection", (q) => q.eq("collection", args.collection!))
                .order("desc")
                .take(limit);
        }

        return await ctx.db
            .query("importHistory")
            .order("desc")
            .take(limit);
    },
});

/**
 * Check if a product was already imported
 */
export const wasProductImported = query({
    args: { aliexpressId: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("importHistory")
            .withIndex("by_aliexpress_id", (q) => q.eq("aliexpressId", args.aliexpressId))
            .first();
        return !!existing;
    },
});

/**
 * Get import statistics
 */
export const getImportStats = query({
    handler: async (ctx) => {
        const allImports = await ctx.db.query("importHistory").collect();

        const stats = {
            totalImported: allImports.length,
            aiEnhanced: allImports.filter(i => i.aiEnhanced).length,
            byCollection: {} as Record<string, number>,
            totalMarkupRevenue: 0,
            averageMarkup: 0,
        };

        for (const imp of allImports) {
            stats.byCollection[imp.collection] = (stats.byCollection[imp.collection] || 0) + 1;
            stats.totalMarkupRevenue += imp.importedPrice - imp.originalPrice;
        }

        if (allImports.length > 0) {
            stats.averageMarkup = stats.totalMarkupRevenue / allImports.length;
        }

        return stats;
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN PREFERENCES FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save an admin preference
 */
export const savePreference = mutation({
    args: {
        key: v.string(),
        value: v.any(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("adminPreferences")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                updatedAt: new Date().toISOString(),
            });
            return existing._id;
        }

        return await ctx.db.insert("adminPreferences", {
            key: args.key,
            value: args.value,
            updatedAt: new Date().toISOString(),
        });
    },
});

/**
 * Get an admin preference
 */
export const getPreference = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const pref = await ctx.db
            .query("adminPreferences")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();
        return pref?.value;
    },
});

/**
 * Get all admin preferences
 */
export const getAllPreferences = query({
    handler: async (ctx) => {
        const prefs = await ctx.db.query("adminPreferences").collect();
        const result: Record<string, any> = {};
        for (const pref of prefs) {
            result[pref.key] = pref.value;
        }
        return result;
    },
});
