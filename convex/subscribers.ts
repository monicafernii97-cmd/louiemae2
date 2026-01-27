import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("subscribers").collect();
    },
});

export const create = mutation({
    args: {
        email: v.string(),
        firstName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check for duplicates
        const existing = await ctx.db
            .query("subscribers")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existing) {
            return null; // Already exists
        }

        return await ctx.db.insert("subscribers", {
            email: args.email,
            firstName: args.firstName,
            dateSubscribed: new Date().toISOString().split('T')[0],
            status: "active",
            tags: ["new"],
            openRate: 0,
        });
    },
});

export const remove = mutation({
    args: { id: v.id("subscribers") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// Seed initial subscribers
export const seed = mutation({
    args: {
        subscribers: v.array(v.object({
            email: v.string(),
            firstName: v.optional(v.string()),
            dateSubscribed: v.string(),
            status: v.union(v.literal("active"), v.literal("unsubscribed")),
            tags: v.array(v.string()),
            openRate: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("subscribers").first();
        if (existing) return; // Already seeded

        for (const sub of args.subscribers) {
            await ctx.db.insert("subscribers", sub);
        }
    },
});
