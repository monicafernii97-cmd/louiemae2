"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

// Internal action to send order confirmation email
export const sendOrderConfirmation = internalAction({
    args: {
        customerEmail: v.string(),
        customerName: v.optional(v.string()),
        orderId: v.string(),
        items: v.array(v.object({
            name: v.string(),
            price: v.number(),
            quantity: v.number(),
        })),
        subtotal: v.number(),
        shipping: v.number(),
        total: v.number(),
        shippingAddress: v.optional(v.object({
            line1: v.string(),
            line2: v.optional(v.string()),
            city: v.string(),
            state: v.optional(v.string()),
            postalCode: v.string(),
            country: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            // Email service not configured - skip silently
            return { success: false, error: "Email service not configured" };
        }

        const resend = new Resend(resendApiKey);

        try {
            const { customerEmail, customerName, orderId, items, subtotal, shipping, total, shippingAddress } = args;

            // Build items HTML
            const itemsHtml = items.map((item) => `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #E8E3DD;">
                        <strong style="color: #4A3B32;">${item.name}</strong>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #E8E3DD; text-align: center;">
                        ${item.quantity}
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #E8E3DD; text-align: right;">
                        $${(item.price * item.quantity).toFixed(2)}
                    </td>
                </tr>
            `).join('');

            // Build shipping address HTML
            const addressHtml = shippingAddress ? `
                <div style="background: #F9F7F4; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #4A3B32; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Shipping Address</h3>
                    <p style="margin: 0; color: #6B5D52;">
                        ${shippingAddress.line1}<br>
                        ${shippingAddress.line2 ? shippingAddress.line2 + '<br>' : ''}
                        ${shippingAddress.city}, ${shippingAddress.state || ''} ${shippingAddress.postalCode}<br>
                        ${shippingAddress.country}
                    </p>
                </div>
            ` : '';

            const { data, error } = await resend.emails.send({
                from: "Louie Mae <withlove@louiemae.com>",
                to: customerEmail,
                subject: `Order Confirmed - ${orderId}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #F9F7F4; font-family: Georgia, serif;">
                        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF;">
                            <div style="background: #4A3B32; padding: 40px; text-align: center;">
                                <h1 style="color: #F5F0EB; margin: 0; font-size: 28px; font-weight: normal; font-style: italic;">Louie Mae</h1>
                                <p style="color: #C9A96E; margin: 10px 0 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3em;">Curated Living</p>
                            </div>
                            <div style="padding: 40px;">
                                <h2 style="color: #4A3B32; font-weight: normal; margin: 0 0 20px 0;">
                                    Thank you for your order${customerName ? `, ${customerName}` : ''}!
                                </h2>
                                <p style="color: #6B5D52; line-height: 1.6; margin: 0 0 30px 0;">
                                    We're preparing your order and will send tracking info once it ships. 
                                    Your order reference is <strong>${orderId}</strong>.
                                </p>
                                <h3 style="color: #4A3B32; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin: 30px 0 15px 0;">Order Summary</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background: #F9F7F4;">
                                            <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6B5D52;">Item</th>
                                            <th style="padding: 12px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6B5D52;">Qty</th>
                                            <th style="padding: 12px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6B5D52;">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>${itemsHtml}</tbody>
                                </table>
                                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #E8E3DD;">
                                    <table style="width: 100%;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #6B5D52;">Subtotal</td>
                                            <td style="padding: 8px 0; text-align: right; color: #4A3B32;">$${subtotal.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6B5D52;">Shipping</td>
                                            <td style="padding: 8px 0; text-align: right; color: #4A3B32;">$${shipping.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 12px 0; font-size: 18px; color: #4A3B32;"><strong>Total</strong></td>
                                            <td style="padding: 12px 0; text-align: right; font-size: 18px; color: #C9A96E;"><strong>$${total.toFixed(2)}</strong></td>
                                        </tr>
                                    </table>
                                </div>
                                ${addressHtml}
                            </div>
                            <div style="background: #F9F7F4; padding: 30px; text-align: center;">
                                <p style="margin: 0 0 10px 0; color: #6B5D52; font-size: 14px;">Questions? Contact us at hello@louiemae.com</p>
                                <p style="margin: 0; color: #9B8B7A; font-size: 12px;">© 2024 Louie Mae. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
            });

            if (error) {
                console.error("Email send error:", error);
                return { success: false, error: error.message };
            }

            return { success: true, emailId: data?.id };
        } catch (error: any) {
            console.error("Email action error:", error);
            return { success: false, error: error.message };
        }
    },
});

// Internal action to send shipping notification email
export const sendShippingNotification = internalAction({
    args: {
        customerEmail: v.string(),
        customerName: v.optional(v.string()),
        orderId: v.string(),
        trackingNumber: v.string(),
        trackingUrl: v.string(),
        carrier: v.string(),
        estimatedDelivery: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            return { success: false, error: "Email service not configured" };
        }

        const resend = new Resend(resendApiKey);

        try {
            const { customerEmail, customerName, orderId, trackingNumber, trackingUrl, carrier, estimatedDelivery } = args;

            const estimatedDeliveryHtml = estimatedDelivery ? `
                <p style="color: #6B5D52; margin: 20px 0 0 0; font-size: 14px;">
                    <strong>Estimated Delivery:</strong> ${estimatedDelivery}
                </p>
            ` : '';

            const { data, error } = await resend.emails.send({
                from: "Louie Mae <withlove@louiemae.com>",
                to: customerEmail,
                subject: `Your Order Has Shipped! - ${orderId}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #F9F7F4; font-family: Georgia, serif;">
                        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF;">
                            <div style="background: #4A3B32; padding: 40px; text-align: center;">
                                <h1 style="color: #F5F0EB; margin: 0; font-size: 28px; font-weight: normal; font-style: italic;">Louie Mae</h1>
                                <p style="color: #C9A96E; margin: 10px 0 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3em;">Curated Living</p>
                            </div>
                            <div style="padding: 40px;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <div style="width: 80px; height: 80px; background: #E8F5E9; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                        <span style="font-size: 40px;">📦</span>
                                    </div>
                                    <h2 style="color: #4A3B32; font-weight: normal; margin: 0;">
                                        Your order is on its way${customerName ? `, ${customerName}` : ''}!
                                    </h2>
                                </div>
                                
                                <p style="color: #6B5D52; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
                                    Great news! Your order <strong>${orderId}</strong> has shipped and is on its way to you.
                                </p>

                                <div style="background: #F9F7F4; padding: 25px; margin: 20px 0; border-radius: 8px;">
                                    <h3 style="color: #4A3B32; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">
                                        Tracking Information
                                    </h3>
                                    <table style="width: 100%;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #6B5D52; font-size: 14px;">Carrier</td>
                                            <td style="padding: 8px 0; text-align: right; color: #4A3B32; font-weight: bold;">${carrier}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6B5D52; font-size: 14px;">Tracking Number</td>
                                            <td style="padding: 8px 0; text-align: right; color: #4A3B32; font-family: monospace; font-weight: bold;">${trackingNumber}</td>
                                        </tr>
                                    </table>
                                    ${estimatedDeliveryHtml}
                                </div>

                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${trackingUrl}" style="display: inline-block; background: #C9A96E; color: #FFFFFF; text-decoration: none; padding: 15px 40px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold; border-radius: 4px;">
                                        Track Your Package
                                    </a>
                                </div>

                                <p style="color: #9B8B7A; font-size: 12px; text-align: center; line-height: 1.6; margin-top: 30px;">
                                    Tracking information may take up to 24 hours to update after shipment.
                                </p>
                            </div>
                            <div style="background: #F9F7F4; padding: 30px; text-align: center;">
                                <p style="margin: 0 0 10px 0; color: #6B5D52; font-size: 14px;">Questions? Contact us at hello@louiemae.com</p>
                                <p style="margin: 0; color: #9B8B7A; font-size: 12px;">© 2024 Louie Mae. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
            });

            if (error) {
                console.error("Shipping notification error:", error);
                return { success: false, error: error.message };
            }

            console.log(`Shipping notification sent to ${customerEmail}`);
            return { success: true, emailId: data?.id };
        } catch (error: any) {
            console.error("Shipping notification action error:", error);
            return { success: false, error: error.message };
        }
    },
});
