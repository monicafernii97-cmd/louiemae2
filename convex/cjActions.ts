"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC CJ ACTIONS
// These actions can be called from the frontend for manual operations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sync all CJ tracking info (can be called from admin dashboard)
 * Returns count of synced and errored orders
 */
export const syncTracking = action({
    args: {},
    handler: async (ctx): Promise<{ synced: number; errors: number }> => {
        // Call the internal sync action
        const result = await ctx.runAction(internal.cjDropshipping.syncAllTracking, {});
        return result;
    },
});

/**
 * Test CJ API connection
 * Returns success status and any error message
 */
export const testConnection = action({
    args: {},
    handler: async (ctx): Promise<{ success: boolean; error?: string }> => {
        try {
            const token = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});
            if (token) {
                return { success: true };
            }
            return { success: false, error: "Failed to authenticate with CJ API" };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
});
