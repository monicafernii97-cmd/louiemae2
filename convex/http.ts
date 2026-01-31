import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";
import Stripe from "stripe";

const http = httpRouter();

// Add Convex Auth routes
auth.addHttpRoutes(http);

// Helper for CORS headers - use environment variable for production domain
const getAllowedOrigin = () => {
    const siteUrl = process.env.SITE_URL;
    if (siteUrl) {
        return siteUrl;
    }
    // Fallback for development
    return "http://localhost:3000";
};

const corsHeaders = {
    "Access-Control-Allow-Origin": getAllowedOrigin(),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// Create Stripe checkout session
http.route({
    path: "/stripe/checkout",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

        if (!stripeSecretKey) {
            return new Response(
                JSON.stringify({ error: "Stripe not configured. Please set STRIPE_SECRET_KEY in Convex dashboard." }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        }

        const stripe = new Stripe(stripeSecretKey);

        try {
            const body = await request.json();
            const { items, successUrl, cancelUrl } = body;

            // Create line items for Stripe
            const lineItems = items.map((item: any) => ({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: item.name,
                        images: item.image ? [item.image] : [],
                    },
                    unit_amount: Math.round(item.price * 100), // Convert to cents
                },
                quantity: item.quantity,
            }));

            // Create checkout session with shipping
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                line_items: lineItems,
                success_url: successUrl,
                cancel_url: cancelUrl,
                billing_address_collection: "required",
                shipping_address_collection: {
                    allowed_countries: ["US", "CA", "GB", "AU"],
                },
                shipping_options: [
                    {
                        shipping_rate_data: {
                            type: "fixed_amount",
                            fixed_amount: { amount: 999, currency: "usd" },
                            display_name: "Standard Shipping",
                            delivery_estimate: {
                                minimum: { unit: "business_day", value: 5 },
                                maximum: { unit: "business_day", value: 7 },
                            },
                        },
                    },
                    {
                        shipping_rate_data: {
                            type: "fixed_amount",
                            fixed_amount: { amount: 1999, currency: "usd" },
                            display_name: "Express Shipping",
                            delivery_estimate: {
                                minimum: { unit: "business_day", value: 2 },
                                maximum: { unit: "business_day", value: 3 },
                            },
                        },
                    },
                ],
                metadata: {
                    items: JSON.stringify(items.map((item: any) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        variantName: item.variantName,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                    }))),
                },
            });

            return new Response(
                JSON.stringify({ sessionId: session.id, url: session.url }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        } catch (error: any) {
            console.error("Stripe checkout error:", error);
            return new Response(
                JSON.stringify({ error: error.message || "Checkout failed" }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    }
                }
            );
        }
    }),
});

// CORS preflight handler
http.route({
    path: "/stripe/checkout",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }),
});

// Stripe webhook handler
http.route({
    path: "/stripe/webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!stripeSecretKey) {
            return new Response("Stripe not configured", { status: 500 });
        }

        const stripe = new Stripe(stripeSecretKey);

        const signature = request.headers.get("stripe-signature");
        const body = await request.text();

        let event: Stripe.Event;

        try {
            if (webhookSecret && signature) {
                event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
            } else {
                // For testing without webhook signature verification
                event = JSON.parse(body) as Stripe.Event;
            }
        } catch (err: any) {
            console.error("Webhook signature verification failed:", err.message);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        // Handle the event
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;

            // Parse items from metadata
            const itemsData = session.metadata?.items ? JSON.parse(session.metadata.items) : [];

            // Get shipping address from session
            const shippingDetails = (session as any).shipping_details;

            const shippingAddress = shippingDetails?.address ? {
                line1: shippingDetails.address.line1 || "",
                line2: shippingDetails.address.line2 || undefined,
                city: shippingDetails.address.city || "",
                state: shippingDetails.address.state || undefined,
                postalCode: shippingDetails.address.postal_code || "",
                country: shippingDetails.address.country || "",
            } : undefined;

            // Create order in database
            await ctx.runMutation(api.orders.createOrder, {
                stripeSessionId: session.id,
                stripePaymentIntentId: session.payment_intent as string || undefined,
                customerEmail: session.customer_details?.email || "",
                customerName: session.customer_details?.name || undefined,
                items: itemsData,
                subtotal: (session.amount_subtotal || 0) / 100,
                shipping: (session.shipping_cost?.amount_total || 0) / 100,
                tax: (session.total_details?.amount_tax || 0) / 100,
                total: (session.amount_total || 0) / 100,
                currency: session.currency || "usd",
                shippingAddress,
            });

            // Send confirmation email via internal action
            if (session.customer_details?.email) {
                try {
                    await ctx.runAction(internal.emails.sendOrderConfirmation, {
                        customerEmail: session.customer_details.email,
                        customerName: session.customer_details.name || undefined,
                        orderId: session.id.slice(-12).toUpperCase(),
                        items: itemsData.map((item: any) => ({
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                        })),
                        subtotal: (session.amount_subtotal || 0) / 100,
                        shipping: (session.shipping_cost?.amount_total || 0) / 100,
                        total: (session.amount_total || 0) / 100,
                        shippingAddress,
                    });
                } catch (emailError: any) {
                    console.error("Failed to send email:", emailError.message);
                    // Don't fail the webhook if email fails
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});

export default http;
