import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Public queries
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("blogPosts").collect();
    },
});

export const get = query({
    args: { id: v.id("blogPosts") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Protected mutations
export const create = mutation({
    args: {
        title: v.string(),
        excerpt: v.string(),
        content: v.string(),
        image: v.string(),
        category: v.string(),
        status: v.union(v.literal("published"), v.literal("draft")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to create blog posts");
        }
        const date = new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        return await ctx.db.insert("blogPosts", { ...args, date });
    },
});

export const update = mutation({
    args: {
        id: v.id("blogPosts"),
        title: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        content: v.optional(v.string()),
        image: v.optional(v.string()),
        category: v.optional(v.string()),
        status: v.optional(v.union(v.literal("published"), v.literal("draft"))),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to update blog posts");
        }
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filteredUpdates);
    },
});

export const remove = mutation({
    args: { id: v.id("blogPosts") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("You must be logged in to delete blog posts");
        }
        await ctx.db.delete(args.id);
    },
});
