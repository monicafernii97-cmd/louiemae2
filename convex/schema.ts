import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Products table
    products: defineTable({
        name: v.string(),
        price: v.number(),
        description: v.string(),
        images: v.array(v.string()),
        category: v.string(),
        collection: v.string(),
        isNew: v.optional(v.boolean()),
        inStock: v.optional(v.boolean()),
    }),

    // Blog posts table
    blogPosts: defineTable({
        title: v.string(),
        excerpt: v.string(),
        content: v.string(),
        date: v.string(),
        image: v.string(),
        category: v.string(),
        status: v.union(v.literal("published"), v.literal("draft")),
    }),

    // Site content - single document for nav, home, story, collections
    siteContent: defineTable({
        navLinks: v.array(v.any()), // NavLink[]
        collections: v.array(v.any()), // CollectionConfig[]
        home: v.any(), // HomePageContent
        story: v.any(), // StoryPageContent
    }),

    // Custom pages
    customPages: defineTable({
        title: v.string(),
        slug: v.string(),
        sections: v.array(v.any()), // PageSection[]
    }).index("by_slug", ["slug"]),

    // Newsletter subscribers
    subscribers: defineTable({
        email: v.string(),
        firstName: v.optional(v.string()),
        dateSubscribed: v.string(),
        status: v.union(v.literal("active"), v.literal("unsubscribed")),
        tags: v.array(v.string()),
        openRate: v.number(),
    }).index("by_email", ["email"]),

    // Email campaigns
    campaigns: defineTable({
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
    }),

    // Orders
    orders: defineTable({
        stripeSessionId: v.string(),
        stripePaymentIntentId: v.optional(v.string()),
        customerEmail: v.string(),
        customerName: v.optional(v.string()),
        items: v.array(v.object({
            productId: v.string(),
            name: v.string(),
            price: v.number(),
            quantity: v.number(),
            image: v.optional(v.string()),
        })),
        subtotal: v.number(),
        shipping: v.optional(v.number()),
        tax: v.optional(v.number()),
        total: v.number(),
        currency: v.string(),
        status: v.union(
            v.literal("pending"),
            v.literal("paid"),
            v.literal("processing"),
            v.literal("shipped"),
            v.literal("delivered"),
            v.literal("cancelled")
        ),
        shippingAddress: v.optional(v.object({
            line1: v.string(),
            line2: v.optional(v.string()),
            city: v.string(),
            state: v.optional(v.string()),
            postalCode: v.string(),
            country: v.string(),
        })),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_session", ["stripeSessionId"])
        .index("by_email", ["customerEmail"]),
});
