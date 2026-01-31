import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Public query - for admin list view
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("campaigns").collect();
    },
});

// Protected mutations
export const create = mutation({
    args: {
        subject: v.string(),
        previewText: v.string(),
        content: v.string(),
        type: v.union(v.literal("newsletter"), v.literal("promotion"), v.literal("automation")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to create campaigns");
        }
        return await ctx.db.insert("campaigns", {
            ...args,
            status: "draft",
            stats: { sent: 0, opened: 0, clicked: 0 },
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("campaigns"),
        subject: v.optional(v.string()),
        previewText: v.optional(v.string()),
        content: v.optional(v.string()),
        status: v.optional(v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sent"))),
        sentDate: v.optional(v.string()),
        type: v.optional(v.union(v.literal("newsletter"), v.literal("promotion"), v.literal("automation"))),
        stats: v.optional(v.object({
            sent: v.number(),
            opened: v.number(),
            clicked: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to update campaigns");
        }
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filteredUpdates);
    },
});

export const send = mutation({
    args: { id: v.id("campaigns") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to send campaigns");
        }
        const subscribers = await ctx.db.query("subscribers").collect();
        const activeCount = subscribers.filter(s => s.status === "active").length;

        await ctx.db.patch(args.id, {
            status: "sent",
            sentDate: new Date().toISOString().split('T')[0],
            stats: { sent: activeCount, opened: 0, clicked: 0 },
        });
    },
});

export const remove = mutation({
    args: { id: v.id("campaigns") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to delete campaigns");
        }
        await ctx.db.delete(args.id);
    },
});

// Seed initial campaigns - allow without auth for initial setup
export const seed = mutation({
    args: {
        campaigns: v.array(v.object({
            subject: v.string(),
            previewText: v.string(),
            content: v.string(),
            status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sent")),
            sentDate: v.optional(v.string()),
            type: v.union(v.literal("newsletter"), v.literal("promotion"), v.literal("automation")),
            stats: v.object({
                sent: v.number(),
                opened: v.number(),
                clicked: v.number(),
            }),
        })),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("campaigns").first();
        if (existing) return; // Already seeded

        for (const campaign of args.campaigns) {
            await ctx.db.insert("campaigns", campaign);
        }
    },
});
