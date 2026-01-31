import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate an upload URL for client-side uploads
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Get the URL for a stored file
export const getUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

// Store file metadata (optional - for tracking uploaded files)
export const saveFile = mutation({
    args: {
        storageId: v.id("_storage"),
        fileName: v.string(),
        fileType: v.string(),
        purpose: v.optional(v.string()), // e.g., "hero", "product", "blog"
    },
    handler: async (ctx, args) => {
        // You can store metadata about uploaded files if needed
        // For now, just return the URL
        const url = await ctx.storage.getUrl(args.storageId);
        return { storageId: args.storageId, url };
    },
});

// Delete a stored file
export const deleteFile = mutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        await ctx.storage.delete(args.storageId);
    },
});
