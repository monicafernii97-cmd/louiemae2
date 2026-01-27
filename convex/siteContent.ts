import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
    args: {},
    handler: async (ctx) => {
        const content = await ctx.db.query("siteContent").first();
        return content;
    },
});

export const update = mutation({
    args: {
        navLinks: v.optional(v.array(v.any())),
        collections: v.optional(v.array(v.any())),
        home: v.optional(v.any()),
        story: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("siteContent").first();

        const filteredUpdates = Object.fromEntries(
            Object.entries(args).filter(([_, v]) => v !== undefined)
        );

        if (existing) {
            await ctx.db.patch(existing._id, filteredUpdates);
            return existing._id;
        } else {
            // Create new document if none exists
            return await ctx.db.insert("siteContent", args as any);
        }
    },
});

// Seed initial site content
export const seed = mutation({
    args: {
        navLinks: v.array(v.any()),
        collections: v.array(v.any()),
        home: v.any(),
        story: v.any(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("siteContent").first();
        if (existing) {
            // Already seeded
            return existing._id;
        }
        return await ctx.db.insert("siteContent", args);
    },
});
