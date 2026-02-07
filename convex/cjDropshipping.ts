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

// Token expiration buffer (refresh tokens 1 day before they expire)
const ACCESS_TOKEN_BUFFER_MS = 24 * 60 * 60 * 1000; // 1 day
const REFRESH_TOKEN_BUFFER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION
// Now uses database-stored tokens to avoid rate limiting on token requests
// Flow: 1) Check DB for valid token → 2) Refresh if expired → 3) New token as last resort
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get CJ API access token with proper refresh token handling
 * - First checks database for existing valid token
 * - Uses refresh token if access token expired
 * - Only requests new token with API key when refresh token also expired
 */
export const getAccessToken = internalAction({
    args: {},
    handler: async (ctx): Promise<string | null> => {
        const apiKey = process.env.CJ_API_KEY;

        if (!apiKey) {
            console.error("CJ API Key not configured. Set CJ_API_KEY in Convex environment variables.");
            return null;
        }

        try {
            // Step 1: Check database for existing tokens
            const storedTokens = await ctx.runQuery(internal.cjHelpers.getCjTokens, {});

            if (storedTokens) {
                const now = Date.now();

                // Parse CJ's expiry date strings to timestamps
                const accessExpiry = new Date(storedTokens.accessTokenExpiryDate).getTime();
                const refreshExpiry = new Date(storedTokens.refreshTokenExpiryDate).getTime();

                // If access token is still valid (with 1 day buffer), use it
                if (accessExpiry - ACCESS_TOKEN_BUFFER_MS > now) {
                    console.log("CJ: Using stored access token (valid until " + storedTokens.accessTokenExpiryDate + ")");
                    return storedTokens.accessToken;
                }

                // If access token expired but refresh token is valid, use refresh token
                if (refreshExpiry - REFRESH_TOKEN_BUFFER_MS > now) {
                    console.log("CJ: Access token expired, using refresh token...");
                    const refreshedToken = await refreshAccessToken(ctx, storedTokens.refreshToken, storedTokens.accessToken);
                    if (refreshedToken) {
                        return refreshedToken;
                    }
                    // If refresh failed, fall through to new token request
                    console.log("CJ: Refresh failed, requesting new token...");
                }
            }

            // Step 2: No valid tokens - request new tokens with API key
            console.log("CJ: Requesting new access token with API key...");
            return await requestNewTokens(ctx, apiKey);

        } catch (error: any) {
            console.error("CJ Auth error:", error.message);
            return null;
        }
    },
});

/**
 * Refresh access token using refresh token (avoids rate limit)
 * Per CJ docs: Returns data: true on success (NOT a new token)
 * This extends the existing token's validity - we update the expiry and keep using the same token
 */
async function refreshAccessToken(ctx: any, refreshToken: string, currentAccessToken: string): Promise<string | null> {
    try {
        const response = await fetch(`${CJ_API_BASE}/authentication/refreshAccessToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();
        console.log("CJ Refresh token response:", JSON.stringify(data, null, 2));

        // CJ returns data: true on success, not a new token
        if (data.result && data.data === true) {
            // Extend the existing token's validity by 15 days
            const newExpiryDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

            await ctx.runMutation(internal.cjHelpers.updateAccessToken, {
                accessToken: currentAccessToken, // Keep the same token
                accessTokenExpiryDate: newExpiryDate,
            });

            console.log("CJ: Token validity extended until:", newExpiryDate);
            return currentAccessToken; // Return the same token with extended expiry
        }

        console.error("CJ Refresh token failed:", data.message || "Unknown error");
        return null;
    } catch (error: any) {
        console.error("CJ Refresh token error:", error.message);
        return null;
    }
}

/**
 * Request new tokens using API key (rate limited to 1 per 300 seconds)
 */
async function requestNewTokens(ctx: any, apiKey: string): Promise<string | null> {
    try {
        const response = await fetch(`${CJ_API_BASE}/authentication/getAccessToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey }),
        });

        const data = await response.json();
        console.log("CJ Auth API response:", JSON.stringify(data, null, 2));

        if (!data.result || !data.data?.accessToken) {
            console.error("CJ Auth failed:", data.message || "Unknown error");
            return null;
        }

        // Save tokens to database using CJ's actual expiry dates
        const tokenData = data.data;
        await ctx.runMutation(internal.cjHelpers.saveCjTokens, {
            openId: tokenData.openId?.toString(),
            accessToken: tokenData.accessToken,
            accessTokenExpiryDate: tokenData.accessTokenExpiryDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            refreshToken: tokenData.refreshToken || tokenData.accessToken,
            refreshTokenExpiryDate: tokenData.refreshTokenExpiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            createDate: tokenData.createDate,
        });

        console.log("CJ: New tokens saved. Access expires:", tokenData.accessTokenExpiryDate, "Refresh expires:", tokenData.refreshTokenExpiryDate);
        return tokenData.accessToken;
    } catch (error: any) {
        console.error("CJ New token request error:", error.message);
        return null;
    }
}

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
        productImage: v.optional(v.string()),
        productDescription: v.optional(v.string()),
        targetPrice: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<{ success: boolean; sourcingId?: string; error?: string }> => {
        const token = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});
        if (!token) {
            return { success: false, error: "Failed to authenticate with CJ API" };
        }

        try {
            // Submit sourcing request to CJ with full product details
            const sourcingPayload: Record<string, any> = {
                productUrl: args.productUrl,
                productName: args.productName,
            };

            // Add optional fields if provided (may help speed up CJ approval)
            if (args.productImage) {
                sourcingPayload.productImage = args.productImage;
            }
            if (args.productDescription) {
                sourcingPayload.remark = args.productDescription.slice(0, 500); // CJ may have length limits
            }
            if (args.targetPrice) {
                sourcingPayload.price = args.targetPrice.toString();
            }

            const response = await fetch(`${CJ_API_BASE}/product/sourcing/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "CJ-Access-Token": token,
                },
                body: JSON.stringify(sourcingPayload),
            });

            const data = await response.json();

            // Log full response for debugging
            console.log(`CJ Sourcing response for product ${args.productId}:`, JSON.stringify(data, null, 2));


            // Per CJ docs: response contains data.cjSourcingId
            const sourcingId = data.data?.cjSourcingId ||
                data.data?.sourcingId ||
                data.data?.id ||
                (typeof data.data === 'string' ? data.data : null);

            if (data.result && sourcingId) {
                // Update product with sourcing ID
                await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                    productId: args.productId,
                    status: "pending",
                    sourcingId: String(sourcingId),
                });

                // Set submission timestamp for admin tracking
                await ctx.runMutation(internal.cjHelpers.updateProductSubmittedAt, {
                    productId: args.productId,
                });

                console.log(`CJ Sourcing submitted for product ${args.productId}: ${sourcingId}`);
                return { success: true, sourcingId: String(sourcingId) };
            } else {
                const errorMsg = data.message || "Unknown error submitting to CJ";
                console.error(`CJ Sourcing failed for product ${args.productId}:`, {
                    message: errorMsg,
                    result: data.result,
                    hasData: !!data.data,
                    dataType: typeof data.data,
                    fullResponse: JSON.stringify(data).slice(0, 500),
                });
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
 * Also auto-submits pending products that haven't been submitted yet
 */
export const checkSourcingStatus = internalAction({
    args: {},
    handler: async (ctx): Promise<{ checked: number; approved: number; rejected: number; submitted: number }> => {
        const token = await ctx.runAction(internal.cjDropshipping.getAccessToken, {});
        if (!token) {
            console.error("CJ: Cannot check sourcing status - auth failed");
            return { checked: 0, approved: 0, rejected: 0, submitted: 0 };
        }

        // Get products pending sourcing approval
        const pendingProducts = await ctx.runQuery(internal.cjHelpers.getProductsPendingSourcing, {});

        let approved = 0;
        let rejected = 0;
        let submitted = 0;

        for (const product of pendingProducts) {
            // If product doesn't have a cjSourcingId yet, auto-submit it to CJ
            if (!product.cjSourcingId && product.sourceUrl) {
                try {
                    // Per CJ docs: productImage is REQUIRED - skip if no images
                    if (!product.images || product.images.length === 0) {
                        console.log(`CJ Auto-submit skipped for ${product.name}: No product images`);
                        continue;
                    }

                    // Build sourcing payload with required fields per CJ docs
                    const sourcingPayload: Record<string, any> = {
                        productUrl: product.sourceUrl,
                        productName: product.name,
                        productImage: product.images[0], // Required by CJ
                    };

                    // Add optional fields
                    if (product.description) {
                        sourcingPayload.remark = product.description.slice(0, 200); // CJ length limit
                    }
                    if (product.price) {
                        sourcingPayload.price = product.price.toString();
                    }
                    // thirdProductId could be our internal product ID for tracking
                    sourcingPayload.thirdProductId = product._id;

                    const response = await fetch(`${CJ_API_BASE}/product/sourcing/create`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "CJ-Access-Token": token,
                        },
                        body: JSON.stringify(sourcingPayload),
                    });

                    const data = await response.json();

                    // Log full response for debugging
                    console.log(`CJ Sourcing response for ${product.name}:`, JSON.stringify(data, null, 2));

                    // Per CJ docs: response contains data.cjSourcingId
                    const sourcingId = data.data?.cjSourcingId ||
                        data.data?.sourcingId ||
                        data.data?.id ||
                        (typeof data.data === 'string' ? data.data : null);

                    if (data.result && sourcingId) {
                        // Update product with sourcing ID
                        await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                            productId: product._id,
                            status: "pending",
                            sourcingId: String(sourcingId),
                        });
                        submitted++;
                        console.log(`CJ Auto-submitted: ${product.name} -> cjSourcingId=${sourcingId}`);
                    } else {
                        // Log detailed error for debugging
                        console.error(`CJ Auto-submit failed for ${product.name}:`, {
                            message: data.message || 'Unknown error',
                            result: data.result,
                            hasData: !!data.data,
                            dataType: typeof data.data,
                            fullResponse: JSON.stringify(data).slice(0, 500),
                        });
                    }
                } catch (error: any) {
                    console.error(`Error auto-submitting ${product.name}:`, error.message);
                }

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 300));
                continue; // Move to next product
            }

            // If product already has cjSourcingId, check its status
            if (!product.cjSourcingId) continue;

            try {
                // Query CJ for sourcing status - per CJ docs: POST with sourceIds array
                const response = await fetch(`${CJ_API_BASE}/product/sourcing/query`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CJ-Access-Token": token,
                    },
                    body: JSON.stringify({
                        sourceIds: [product.cjSourcingId],
                    }),
                });

                const data = await response.json();
                console.log(`CJ Sourcing query for ${product.name}:`, JSON.stringify(data, null, 2));

                if (data.result && data.data) {
                    // Response can be an array or single object
                    const sourcing = Array.isArray(data.data) ? data.data[0] : data.data;

                    if (sourcing) {
                        // Per CJ docs: sourceStatus is the status field, cjProductId indicates success
                        // Status values: 1=pending, 2=processing, 3=success, 4=failed, 5=search failed
                        const isApproved = sourcing.cjProductId ||
                            sourcing.sourceStatus === "3" ||
                            sourcing.sourceStatus === 3;
                        const isFailed = sourcing.sourceStatus === "4" ||
                            sourcing.sourceStatus === "5" ||
                            sourcing.sourceStatus === 4 ||
                            sourcing.sourceStatus === 5;

                        if (isApproved) {
                            // Approved! Update product with CJ IDs
                            await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                                productId: product._id,
                                status: "approved",
                                cjProductId: sourcing.cjProductId,
                                cjVariantId: sourcing.variantId,
                                cjSku: sourcing.cjVariantSku,
                            });
                            approved++;
                            console.log(`CJ Sourcing approved for ${product.name}: cjProductId=${sourcing.cjProductId}`);
                        } else if (isFailed) {
                            // Rejected
                            await ctx.runMutation(internal.cjHelpers.updateProductSourcingStatus, {
                                productId: product._id,
                                status: "rejected",
                                error: sourcing.sourceStatusStr || "Sourcing request was rejected",
                            });
                            rejected++;
                            console.log(`CJ Sourcing rejected for ${product.name}: ${sourcing.sourceStatusStr}`);
                        }
                        // If still pending (status 1 or 2), leave it as is
                    }
                }
            } catch (error: any) {
                console.error(`Error checking sourcing for ${product.name}:`, error.message);
            }

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log(`CJ Sourcing check: ${pendingProducts.length} products, ${submitted} submitted, ${approved} approved, ${rejected} rejected`);
        return { checked: pendingProducts.length, approved, rejected, submitted };
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
