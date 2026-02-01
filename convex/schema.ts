import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
    // Convex Auth tables (users, sessions, accounts, etc.)
    ...authTables,

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
        variants: v.optional(v.array(v.object({
            id: v.string(),
            name: v.string(),
            image: v.optional(v.string()),
            priceAdjustment: v.number(),
            inStock: v.boolean(),
        }))),
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
        customerPhone: v.optional(v.string()), // Required by CJ API
        items: v.array(v.object({
            productId: v.string(),
            variantId: v.optional(v.string()),
            variantName: v.optional(v.string()),
            name: v.string(),
            price: v.number(),
            quantity: v.number(),
            image: v.optional(v.string()),
            // CJ Dropshipping product mapping
            cjVariantId: v.optional(v.string()), // CJ variant ID (vid)
            cjSku: v.optional(v.string()), // CJ product SKU
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
        // CJ Dropshipping fulfillment fields
        cjOrderId: v.optional(v.string()), // CJ's order reference ID
        cjStatus: v.optional(v.union(
            v.literal("pending"), // Not yet sent to CJ
            v.literal("sending"), // Being sent to CJ
            v.literal("confirmed"), // CJ accepted order
            v.literal("processing"), // CJ is fulfilling
            v.literal("shipped"), // CJ shipped the order
            v.literal("delivered"), // Delivered to customer
            v.literal("failed"), // CJ order creation failed
            v.literal("cancelled") // Order cancelled at CJ
        )),
        cjError: v.optional(v.string()), // Error message if CJ order fails
        cjLastSyncAt: v.optional(v.string()), // Last time we synced with CJ
        // Tracking information
        trackingNumber: v.optional(v.string()),
        trackingUrl: v.optional(v.string()),
        carrier: v.optional(v.string()), // Shipping carrier name
        shippedAt: v.optional(v.string()), // When the order was shipped
        estimatedDelivery: v.optional(v.string()), // Estimated delivery date
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_session", ["stripeSessionId"])
        .index("by_email", ["customerEmail"])
        .index("by_cj_status", ["cjStatus"]),

    // AliExpress product cache - stores fetched products for faster access
    aliexpressCache: defineTable({
        aliexpressId: v.string(), // Original AliExpress product ID
        name: v.string(),
        originalPrice: v.number(),
        salePrice: v.number(),
        images: v.array(v.string()),
        category: v.string(),
        description: v.optional(v.string()),
        averageRating: v.number(),
        reviewCount: v.number(),
        productUrl: v.optional(v.string()),
        sellerName: v.optional(v.string()),
        shippingInfo: v.object({
            freeShipping: v.boolean(),
            estimatedDays: v.optional(v.string()),
            cost: v.optional(v.number()),
        }),
        inStock: v.boolean(),
        lastFetched: v.string(), // ISO timestamp
        searchQuery: v.optional(v.string()), // Query that found this product
    }).index("by_aliexpress_id", ["aliexpressId"])
        .index("by_search_query", ["searchQuery"]),

    // Import history - tracks what was imported and when
    importHistory: defineTable({
        aliexpressId: v.string(), // Original AliExpress ID
        importedProductId: v.id("products"), // Reference to imported product
        originalName: v.string(),
        importedName: v.string(),
        originalPrice: v.number(),
        importedPrice: v.number(),
        markup: v.number(), // Percentage or fixed amount
        markupType: v.union(v.literal("percentage"), v.literal("fixed")),
        collection: v.string(),
        aiEnhanced: v.boolean(),
        importedAt: v.string(), // ISO timestamp
        importedBy: v.optional(v.string()), // Future: user ID
    }).index("by_aliexpress_id", ["aliexpressId"])
        .index("by_imported_at", ["importedAt"])
        .index("by_collection", ["collection"]),

    // User preferences - stores pricing rules and settings
    adminPreferences: defineTable({
        key: v.string(), // e.g., "pricingRule", "defaultCollection"
        value: v.any(),
        updatedAt: v.string(),
    }).index("by_key", ["key"]),
});
