/**
 * Utility script to check Kids products in the database
 * Run with: npx convex run checkProducts
 */

import { query } from "./_generated/server";

// Get all Kids collection products with their CJ and variant status
export const getKidsProducts = query({
    args: {},
    handler: async (ctx) => {
        const allProducts = await ctx.db.query("products").collect();

        // Filter for Kids collection products
        const kidsProducts = allProducts.filter(p =>
            p.collection === 'kids' ||
            p.collection === 'Louie Kids & Co.'
        );

        return kidsProducts.map(p => ({
            id: p._id,
            name: p.name,
            collection: p.collection,
            category: p.category,
            // Variant info
            hasVariants: Boolean(p.variants && p.variants.length > 0),
            variantCount: p.variants?.length || 0,
            variantNames: p.variants?.map(v => v.name) || [],
            // CJ info
            cjSourcingStatus: p.cjSourcingStatus || 'none',
            hasCjVariantId: Boolean(p.cjVariantId),
            cjVariantId: p.cjVariantId,
            cjSku: p.cjSku,
            sourceUrl: p.sourceUrl,
        }));
    },
});
