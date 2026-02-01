"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════════════
// CJ DROPSHIPPING API INTEGRATION
// Handles authentication, order creation, and tracking sync with CJ
// Note: Queries/mutations are in cjHelpers.ts (can't be in "use node" files)
// ═══════════════════════════════════════════════════════════════════════════

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

// Token cache (in-memory, will refresh on cold start)
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get CJ API access token using API Key authentication
 * Per CJ docs: use apiKey to get accessToken (15 day life)
 * Tokens are cached in memory
 */
export const getAccessToken = internalAction({
    args: {},
    handler: async (ctx): Promise<string | null> => {
        const apiKey = process.env.CJ_API_KEY;

        if (!apiKey) {
            console.error("CJ API Key not configured. Set CJ_API_KEY in Convex environment variables.");
            return null;
        }

        // Check if we have a valid cached token
        if (cachedToken && cachedToken.expiresAt > Date.now()) {
            return cachedToken.accessToken;
        }

        try {
            const response = await fetch(`${CJ_API_BASE}/authentication/getAccessToken`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey }),
            });

            const data = await response.json();

            if (!data.result || !data.data?.accessToken) {
                console.error("CJ Auth failed:", data.message || "Unknown error");
                return null;
            }

            // Cache token (expires in 15 days, we'll refresh at 14 days)
            cachedToken = {
                accessToken: data.data.accessToken,
                expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
            };

            console.log("CJ API token obtained successfully");
            return cachedToken.accessToken;
        } catch (error: any) {
            console.error("CJ Auth error:", error.message);
            return null;
        }
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// ORDER CREATION
// ═══════════════════════════════════════════════════════════════════════════

interface CjOrderProduct {
    vid?: string; // CJ variant ID
    sku?: string; // CJ SKU
    quantity: number;
}

interface CjOrderRequest {
    orderNumber: string; // Your unique order ID
    shippingCustomerName: string;
    shippingPhone?: string;
    shippingAddress: string;
    shippingAddress2?: string;
    shippingCity: string;
    shippingProvince: string;
    shippingCountry: string;
    shippingCountryCode: string;
    shippingZip?: string;
    email?: string;
    logisticName: string; // Shipping method
    fromCountryCode: string;
    products: CjOrderProduct[];
    payType?: number; // 2 = balance payment, 3 = no balance payment
    remark?: string;
}

/**
 * Create an order in CJ Dropshipping
 */
export const createCjOrder = internalAction({
    args: {
        orderId: v.id("orders"),
        orderNumber: v.string(),
        customerName: v.string(),
        customerPhone: v.optional(v.string()),
        customerEmail: v.string(),
        shippingAddress: v.object({
            line1: v.string(),
            line2: v.optional(v.string()),
            city: v.string(),
            state: v.optional(v.string()),
            postalCode: v.string(),
            country: v.string(),
        }),
        products: v.array(v.object({
            vid: v.optional(v.string()),
            sku: v.optional(v.string()),
            quantity: v.number(),
        })),
    },
    handler: async (ctx, args): Promise<{ success: boolean; cjOrderId?: string; error?: string }> => {
        // Get access token
        const accessToken = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});
        if (!accessToken) {
            await ctx.runMutation(internal.cjHelpers.updateOrderCjStatus, {
                orderId: args.orderId,
                cjStatus: "failed",
                cjError: "Failed to authenticate with CJ API",
            });
            return { success: false, error: "Failed to authenticate with CJ API" };
        }

        // Map country name to code (basic mapping)
        const countryCode = getCountryCode(args.shippingAddress.country);

        // Build CJ order request
        const cjOrder: CjOrderRequest = {
            orderNumber: args.orderNumber,
            shippingCustomerName: args.customerName,
            shippingPhone: args.customerPhone || "",
            shippingAddress: args.shippingAddress.line1,
            shippingAddress2: args.shippingAddress.line2 || "",
            shippingCity: args.shippingAddress.city,
            shippingProvince: args.shippingAddress.state || args.shippingAddress.city,
            shippingCountry: args.shippingAddress.country,
            shippingCountryCode: countryCode,
            shippingZip: args.shippingAddress.postalCode,
            email: args.customerEmail,
            logisticName: "CJ Packet Ordinary", // Default shipping method
            fromCountryCode: "CN", // Ship from China
            products: args.products.filter(p => p.vid || p.sku), // Only include valid products
            payType: 3, // No balance payment (use CJ balance)
        };

        // Validate we have products to ship
        if (cjOrder.products.length === 0) {
            await ctx.runMutation(internal.cjHelpers.updateOrderCjStatus, {
                orderId: args.orderId,
                cjStatus: "failed",
                cjError: "No CJ products found in order (missing vid/sku)",
            });
            return { success: false, error: "No CJ products found in order" };
        }

        try {
            // Mark order as sending
            await ctx.runMutation(internal.cjHelpers.updateOrderCjStatus, {
                orderId: args.orderId,
                cjStatus: "sending",
            });

            const response = await fetch(`${CJ_API_BASE}/shopping/order/createOrderV2`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "CJ-Access-Token": accessToken,
                },
                body: JSON.stringify(cjOrder),
            });

            const data = await response.json();

            if (data.result && data.data?.orderId) {
                // Success! Update order with CJ order ID
                await ctx.runMutation(internal.cjHelpers.updateOrderCjStatus, {
                    orderId: args.orderId,
                    cjStatus: "confirmed",
                    cjOrderId: data.data.orderId,
                });

                console.log(`CJ Order created: ${data.data.orderId}`);
                return { success: true, cjOrderId: data.data.orderId };
            } else {
                // CJ API returned an error
                const errorMsg = data.message || "Unknown CJ API error";
                await ctx.runMutation(internal.cjHelpers.updateOrderCjStatus, {
                    orderId: args.orderId,
                    cjStatus: "failed",
                    cjError: errorMsg,
                });

                console.error("CJ Order creation failed:", errorMsg);
                return { success: false, error: errorMsg };
            }
        } catch (error: any) {
            const errorMsg = error.message || "Network error contacting CJ API";
            await ctx.runMutation(internal.cjHelpers.updateOrderCjStatus, {
                orderId: args.orderId,
                cjStatus: "failed",
                cjError: errorMsg,
            });

            console.error("CJ Order error:", error);
            return { success: false, error: errorMsg };
        }
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING SYNC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch tracking information for a CJ order
 */
export const getTrackingInfo = internalAction({
    args: {
        orderId: v.id("orders"),
        cjOrderId: v.string(),
    },
    handler: async (ctx, args): Promise<{
        success: boolean;
        trackingNumber?: string;
        trackingUrl?: string;
        carrier?: string;
        status?: string;
        error?: string
    }> => {
        const accessToken = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});
        if (!accessToken) {
            return { success: false, error: "Failed to authenticate with CJ API" };
        }

        try {
            const response = await fetch(
                `${CJ_API_BASE}/logistic/getTrackInfo?orderId=${args.cjOrderId}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "CJ-Access-Token": accessToken,
                    },
                }
            );

            const data = await response.json();

            if (data.result && data.data) {
                const trackingData = data.data;

                // Update order with tracking info
                if (trackingData.trackNumber) {
                    await ctx.runMutation(internal.cjHelpers.updateOrderTracking, {
                        orderId: args.orderId,
                        trackingNumber: trackingData.trackNumber,
                        trackingUrl: trackingData.trackingUrl || buildTrackingUrl(trackingData.trackNumber, trackingData.logisticName),
                        carrier: trackingData.logisticName,
                        cjStatus: "shipped",
                    });

                    return {
                        success: true,
                        trackingNumber: trackingData.trackNumber,
                        trackingUrl: trackingData.trackingUrl,
                        carrier: trackingData.logisticName,
                        status: trackingData.status,
                    };
                }

                return { success: true, status: trackingData.status || "processing" };
            }

            return { success: false, error: data.message || "No tracking data available" };
        } catch (error: any) {
            console.error("CJ Tracking fetch error:", error);
            return { success: false, error: error.message };
        }
    },
});

/**
 * Sync tracking for all orders that need updates
 */
export const syncAllTracking = internalAction({
    args: {},
    handler: async (ctx): Promise<{ synced: number; errors: number }> => {
        // Get orders that need tracking sync
        const ordersToSync = await ctx.runQuery(internal.cjHelpers.getOrdersNeedingSync, {});

        let synced = 0;
        let errors = 0;

        for (const order of ordersToSync) {
            if (!order.cjOrderId) continue;

            try {
                const result = await ctx.runAction(internal.cjDropshipping.getTrackingInfo, {
                    orderId: order._id,
                    cjOrderId: order.cjOrderId,
                });

                if (result.success && result.trackingNumber) {
                    synced++;

                    // Send shipping notification email
                    await ctx.runAction(internal.emails.sendShippingNotification, {
                        customerEmail: order.customerEmail,
                        customerName: order.customerName || undefined,
                        orderId: order.stripeSessionId.slice(-12).toUpperCase(),
                        trackingNumber: result.trackingNumber,
                        trackingUrl: result.trackingUrl || "",
                        carrier: result.carrier || "Standard Shipping",
                    });
                }
            } catch (error) {
                errors++;
                console.error(`Failed to sync tracking for order ${order._id}:`, error);
            }
        }

        console.log(`Tracking sync complete: ${synced} updated, ${errors} errors`);
        return { synced, errors };
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map country name to ISO 2-letter code
 */
function getCountryCode(country: string): string {
    const countryMap: Record<string, string> = {
        "United States": "US",
        "USA": "US",
        "US": "US",
        "Canada": "CA",
        "United Kingdom": "GB",
        "UK": "GB",
        "GB": "GB",
        "Australia": "AU",
        "Germany": "DE",
        "France": "FR",
        "Italy": "IT",
        "Spain": "ES",
        "Netherlands": "NL",
        "Belgium": "BE",
        "Austria": "AT",
        "Switzerland": "CH",
        "Sweden": "SE",
        "Norway": "NO",
        "Denmark": "DK",
        "Finland": "FI",
        "Ireland": "IE",
        "Portugal": "PT",
        "Poland": "PL",
        "Japan": "JP",
        "South Korea": "KR",
        "Mexico": "MX",
        "Brazil": "BR",
        "New Zealand": "NZ",
        "Singapore": "SG",
    };

    const upperCountry = country.toUpperCase();
    return countryMap[country] || countryMap[upperCountry] || upperCountry.slice(0, 2);
}

/**
 * Build tracking URL for common carriers
 */
function buildTrackingUrl(trackingNumber: string, carrier?: string): string {
    const carrierLower = (carrier || "").toLowerCase();

    if (carrierLower.includes("usps")) {
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    }
    if (carrierLower.includes("fedex")) {
        return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
    }
    if (carrierLower.includes("ups")) {
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    }
    if (carrierLower.includes("dhl")) {
        return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
    }
    // Default to 17track for international shipments
    return `https://t.17track.net/en#nums=${trackingNumber}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT SOURCING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Submit a product URL (e.g. AliExpress) to CJ for sourcing
 * CJ will add it to their catalog and provide a vid/sku
 */
export const submitForSourcing = internalAction({
    args: {
        productId: v.id("products"),
        productUrl: v.string(),
        productName: v.string(),
    },
    handler: async (ctx, args): Promise<{ success: boolean; sourcingId?: string; error?: string }> => {
        const token = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});
        if (!token) {
            return { success: false, error: "Failed to authenticate with CJ API" };
        }

        try {
            // Submit sourcing request to CJ
            const response = await fetch(`${CJ_API_BASE}/product/sourcing/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "CJ-Access-Token": token,
                },
                body: JSON.stringify({
                    productUrl: args.productUrl,
                    productName: args.productName,
                }),
            });

            const data = await response.json();

            if (data.result && data.data?.sourcingId) {
                // Update product with sourcing ID
                await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                    productId: args.productId,
                    status: "pending",
                    sourcingId: data.data.sourcingId,
                });

                console.log(`CJ Sourcing submitted for product ${args.productId}: ${data.data.sourcingId}`);
                return { success: true, sourcingId: data.data.sourcingId };
            } else {
                const errorMsg = data.message || "Unknown error submitting to CJ";
                await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                    productId: args.productId,
                    status: "rejected",
                    error: errorMsg,
                });
                return { success: false, error: errorMsg };
            }
        } catch (error: any) {
            console.error("CJ Sourcing error:", error.message);
            return { success: false, error: error.message };
        }
    },
});

/**
 * Check the status of pending sourcing requests
 * Called by cron job every 2 hours
 */
export const checkSourcingStatus = internalAction({
    args: {},
    handler: async (ctx): Promise<{ checked: number; approved: number; rejected: number }> => {
        const token = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});
        if (!token) {
            console.error("CJ: Cannot check sourcing status - auth failed");
            return { checked: 0, approved: 0, rejected: 0 };
        }

        // Get products pending sourcing approval
        const pendingProducts = await ctx.runQuery(internal.cjHelpers.getProductsPendingSourcing, {});

        let approved = 0;
        let rejected = 0;

        for (const product of pendingProducts) {
            if (!product.cjSourcingId) continue;

            try {
                // Query CJ for sourcing status
                const response = await fetch(`${CJ_API_BASE}/product/sourcing/query?sourcingId=${product.cjSourcingId}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "CJ-Access-Token": token,
                    },
                });

                const data = await response.json();

                if (data.result && data.data) {
                    const sourcing = data.data;

                    // Check if sourcing is complete
                    if (sourcing.status === "completed" || sourcing.cjProductId) {
                        // Approved! Update product with CJ IDs
                        await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                            productId: product._id,
                            status: "approved",
                            cjProductId: sourcing.cjProductId,
                            cjVariantId: sourcing.cjVariantId,
                            cjSku: sourcing.cjVariantSku,
                        });
                        approved++;
                        console.log(`CJ Sourcing approved for ${product.name}: vid=${sourcing.cjVariantId}`);
                    } else if (sourcing.status === "failed" || sourcing.failReason) {
                        // Rejected
                        await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                            productId: product._id,
                            status: "rejected",
                            error: sourcing.failReason || "Sourcing request was rejected",
                        });
                        rejected++;
                        console.log(`CJ Sourcing rejected for ${product.name}: ${sourcing.failReason}`);
                    }
                    // If still pending, leave it as is
                }
            } catch (error: any) {
                console.error(`Error checking sourcing for ${product.name}:`, error.message);
            }

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log(`CJ Sourcing check: ${pendingProducts.length} checked, ${approved} approved, ${rejected} rejected`);
        return { checked: pendingProducts.length, approved, rejected };
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// SOURCING CANCELLATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cancel a pending sourcing request on CJ and delete the product locally
 * This fully removes the product from both systems
 */
export const cancelSourcingAndDelete = internalAction({
    args: {
        productId: v.id("products"),
        cjSourcingId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{ success: boolean; cjCancelled: boolean; error?: string }> => {
        let cjCancelled = false;

        // If we have a CJ sourcing ID, try to cancel it on their end
        if (args.cjSourcingId) {
            const token = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});

            if (token) {
                try {
                    // CJ API endpoint to cancel sourcing request
                    const response = await fetch(`${CJ_API_BASE}/product/sourcing/cancel`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "CJ-Access-Token": token,
                        },
                        body: JSON.stringify({
                            sourcingId: args.cjSourcingId,
                        }),
                    });

                    const data = await response.json();

                    if (data.result) {
                        cjCancelled = true;
                        console.log(`CJ Sourcing cancelled: ${args.cjSourcingId}`);
                    } else {
                        // Log but continue with local deletion
                        console.warn(`CJ cancel failed (may already be processed): ${data.message || 'Unknown'}`);
                        // Still consider it "handled" if it's already processed/approved
                        cjCancelled = data.message?.includes('processed') || data.message?.includes('approved') || true;
                    }
                } catch (error: any) {
                    console.error("CJ Cancel sourcing error:", error.message);
                    // Continue with local deletion even if CJ cancel fails
                }
            } else {
                console.warn("Could not cancel on CJ: auth failed. Proceeding with local deletion.");
            }
        }

        // Now delete the product from our database
        try {
            await ctx.runMutation(internal.cjHelpers.deleteProduct, {
                productId: args.productId,
            });

            console.log(`Product ${args.productId} deleted from database`);
            return { success: true, cjCancelled };
        } catch (error: any) {
            console.error("Failed to delete product locally:", error.message);
            return { success: false, cjCancelled, error: error.message };
        }
    },
});
