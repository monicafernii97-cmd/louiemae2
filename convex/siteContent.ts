import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Public query - anyone can read site content
export const get = query({
    args: {},
    handler: async (ctx) => {
        const content = await ctx.db.query("siteContent").first();
        return content;
    },
});

// Protected mutation - require authentication
export const update = mutation({
    args: {
        navLinks: v.optional(v.array(v.any())),
        collections: v.optional(v.array(v.any())),
        home: v.optional(v.any()),
        story: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // Require authentication
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to update site content");
        }

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

// Seed initial site content - protected
export const seed = mutation({
    args: {
        navLinks: v.array(v.any()),
        collections: v.array(v.any()),
        home: v.any(),
        story: v.any(),
    },
    handler: async (ctx, args) => {
        // Allow seeding without auth for initial setup
        // But only if no content exists
        const existing = await ctx.db.query("siteContent").first();
        if (existing) {
            // Already seeded
            return existing._id;
        }
        return await ctx.db.insert("siteContent", args);
    },
});

// Update hero image directly - protected
export const updateHeroImage = mutation({
    args: {
        imageUrl: v.string(),
    },
    handler: async (ctx, args) => {
        // Require authentication
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to update hero image");
        }

        const existing = await ctx.db.query("siteContent").first();
        if (existing) {
            const updatedHome = {
                ...existing.home,
                hero: {
                    ...(existing.home?.hero || {}),
                    image: args.imageUrl,
                },
            };
            await ctx.db.patch(existing._id, { home: updatedHome });
            return existing._id;
        }
        return null;
    },
});
