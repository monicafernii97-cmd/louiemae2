"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC CJ ACTIONS
// These actions can be called from the frontend for manual operations
// ═══════════════════════════════════════════════════════════════════════════

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

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
    handler: async (ctx): Promise<{ success: boolean; message: string }> => {
        try {
            const token = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});
            if (token) {
                return { success: true, message: "Successfully connected to CJ Dropshipping API!" };
            }
            return { success: false, message: "Failed to authenticate - check your CJ credentials" };
        } catch (error: any) {
            return { success: false, message: error.message || "Connection failed" };
        }
    },
});

/**
 * Configure CJ webhooks to receive real-time updates
 * This calls CJ's /webhook/set API to register our endpoint
 */
export const configureWebhooks = action({
    args: {},
    handler: async (ctx): Promise<{ success: boolean; message: string }> => {
        try {
            // Get access token first
            const token = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});
            if (!token) {
                return { success: false, message: "Failed to authenticate with CJ API" };
            }

            // Our webhook URL
            const webhookUrl = "https://kindred-squid-489.convex.site/cj/webhook";

            // Configure webhooks for order and logistics updates
            const response = await fetch(`${CJ_API_BASE}/webhook/set`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "CJ-Access-Token": token,
                },
                body: JSON.stringify({
                    product: {
                        type: "ENABLE",
                        callbackUrls: [webhookUrl],
                    },
                    stock: {
                        type: "ENABLE",
                        callbackUrls: [webhookUrl],
                    },
                    order: {
                        type: "ENABLE",
                        callbackUrls: [webhookUrl],
                    },
                    logistics: {
                        type: "ENABLE",
                        callbackUrls: [webhookUrl],
                    },
                }),
            });

            const data = await response.json();

            if (data.result === true) {
                return {
                    success: true,
                    message: "Webhooks configured! You'll now receive real-time order and tracking updates."
                };
            } else {
                return {
                    success: false,
                    message: data.message || "Failed to configure webhooks - your store may need to be verified first"
                };
            }
        } catch (error: any) {
            return { success: false, message: error.message || "Failed to configure webhooks" };
        }
    },
});

/**
 * Check CJ sourcing status for pending products
 * Can be called manually from admin dashboard
 */
export const checkSourcingStatus = action({
    args: {},
    handler: async (ctx): Promise<{ checked: number; approved: number; rejected: number }> => {
        const result = await ctx.runAction(internal.cjDropshipping.checkSourcingStatus, {});
        return result;
    },
});

/**
 * Submit a product for CJ sourcing
 * Called when importing products from AliExpress/other sources
 * Now includes optional image, description, and price for faster CJ review
 */
export const submitProductForSourcing = action({
    args: {
        productId: v.id("products"),
        productUrl: v.string(),
        productName: v.string(),
        productImage: v.optional(v.string()),
        productDescription: v.optional(v.string()),
        targetPrice: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
        const result = await ctx.runAction(internal.cjDropshipping.submitForSourcing, {
            productId: args.productId,
            productUrl: args.productUrl,
            productName: args.productName,
            productImage: args.productImage,
            productDescription: args.productDescription,
            targetPrice: args.targetPrice,
        });
        return result;
    },
});

/**
 * Cancel a pending sourcing request on CJ and delete the product
 * Called from admin CJ Settings page to remove products from import queue
 */
export const cancelAndDeleteProduct = action({
    args: {
        productId: v.id("products"),
        cjSourcingId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{ success: boolean; cjCancelled: boolean; error?: string }> => {
        const result = await ctx.runAction(internal.cjDropshipping.cancelSourcingAndDelete, {
            productId: args.productId,
            cjSourcingId: args.cjSourcingId,
        });
        return result;
    },
});

/**
 * Resubmit a stuck or failed product to CJ sourcing
 * Clears previous error and resubmits with fresh request
 */
export const resubmitProduct = action({
    args: {
        productId: v.id("products"),
    },
    handler: async (ctx, args): Promise<{ success: boolean; message: string; cjSourcingId?: string }> => {
        try {
            // Get product details
            const product = await ctx.runQuery(internal.cjHelpers.getProductById, {
                productId: args.productId
            });

            if (!product) {
                return { success: false, message: "Product not found" };
            }

            if (!product.sourceUrl) {
                return { success: false, message: "Product has no source URL - cannot submit to CJ" };
            }

            if (!product.images || product.images.length === 0) {
                return { success: false, message: "Product has no images - CJ requires at least one image" };
            }

            // Clear previous sourcing status
            await ctx.runMutation(internal.cjHelpers.clearSourcingStatus, {
                productId: args.productId,
            });

            // Resubmit to CJ
            const result = await ctx.runAction(internal.cjDropshipping.submitForSourcing, {
                productId: args.productId,
                productUrl: product.sourceUrl,
                productName: product.name,
                productImage: product.images[0],
                productDescription: product.description?.slice(0, 200),
                targetPrice: product.price,
            });

            if (result.success && result.sourcingId) {
                return {
                    success: true,
                    message: `Resubmitted successfully! CJ Sourcing ID: ${result.sourcingId}`,
                    cjSourcingId: result.sourcingId
                };
            } else {
                return {
                    success: false,
                    message: result.error || "Failed to resubmit to CJ"
                };
            }
        } catch (error: any) {
            return { success: false, message: error.message || "Resubmit failed" };
        }
    },
});

/**
 * Get current CJ token status for admin display
 * Shows when tokens expire and if connection is healthy
 */
export const getTokenStatus = action({
    args: {},
    handler: async (ctx): Promise<{
        connected: boolean;
        accessTokenValid: boolean;
        accessTokenExpiresAt?: string;
        refreshTokenValid: boolean;
        refreshTokenExpiresAt?: string;
        message: string;
    }> => {
        try {
            const tokens = await ctx.runQuery(internal.cjHelpers.getCjTokens, {});

            if (!tokens) {
                return {
                    connected: false,
                    accessTokenValid: false,
                    refreshTokenValid: false,
                    message: "No tokens stored - run Test Connection to authenticate"
                };
            }

            const now = new Date();
            const accessExpiry = new Date(tokens.accessTokenExpiryDate);
            const refreshExpiry = new Date(tokens.refreshTokenExpiryDate);

            const accessValid = accessExpiry > now;
            const refreshValid = refreshExpiry > now;

            return {
                connected: accessValid || refreshValid,
                accessTokenValid: accessValid,
                accessTokenExpiresAt: tokens.accessTokenExpiryDate,
                refreshTokenValid: refreshValid,
                refreshTokenExpiresAt: tokens.refreshTokenExpiryDate,
                message: accessValid
                    ? `Connected - token expires ${accessExpiry.toLocaleDateString()}`
                    : refreshValid
                        ? "Access token expired - will auto-refresh on next API call"
                        : "All tokens expired - run Test Connection to reauthenticate"
            };
        } catch (error: any) {
            return {
                connected: false,
                accessTokenValid: false,
                refreshTokenValid: false,
                message: error.message || "Failed to check token status"
            };
        }
    },
});
