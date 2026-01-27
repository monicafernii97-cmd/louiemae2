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
});
