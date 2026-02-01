"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const scrapeProduct = action({
    args: { url: v.string() },
    handler: async (ctx, { url }) => {
        // 1. Check for AliExpress
        // Support formats:
        // https://www.aliexpress.com/item/10050012345678.html
        // https://www.aliexpress.us/item/325680456789.html
        const aliMatch = url.match(/\/item\/(\d+)\.html/) || url.match(/productId=(\d+)/);

        if (aliMatch && url.includes("aliexpress")) {
            const productId = aliMatch[1];
            return await scrapeAliExpress(productId);
        }

        // 2. Generic Scraper
        return await scrapeGeneric(url);
    },
});

async function scrapeAliExpress(productId: string) {
    const RAPIDAPI_HOST = "aliexpress-datahub.p.rapidapi.com";
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
        throw new Error("RapidAPI key not configured");
    }

    // Try multiple API versions/endpoints as in http.ts
    const endpoints = [
        `https://${RAPIDAPI_HOST}/item_detail_2?itemId=${productId}`,
        `https://${RAPIDAPI_HOST}/item_detail_3?itemId=${productId}`,
        `https://${RAPIDAPI_HOST}/item_detail?itemId=${productId}`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                headers: {
                    "X-RapidAPI-Key": rapidApiKey,
                    "X-RapidAPI-Host": RAPIDAPI_HOST,
                },
            });

            if (!response.ok) {
                lastError = `API Error: ${response.status}`;
                continue;
            }

            const data = await response.json();
            // Check internal error
            if (data.result?.status?.data === "error") {
                lastError = data.result?.status?.msg?.["internal-error"] || "API returned error";
                continue;
            }

            // Normalize AliExpress data to our format
            // We use a simplified normalization here, effectively delegating detailed normalization to the frontend
            // or we could assume the frontend will handle the raw 'data' if we mark it as source: 'aliexpress'
            return {
                source: 'aliexpress',
                data: data
            };

        } catch (e: any) {
            lastError = e.message;
        }
    }
    throw new Error(lastError || "Failed to fetch AliExpress product");
}

async function scrapeGeneric(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load page: ${response.status}`);
        }

        const html = await response.text();

        // simple regex based scraping
        const getMeta = (prop: string) => {
            const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
            return match ? match[1] : null;
        };

        const title = getMeta('og:title') ||
            getMeta('twitter:title') ||
            html.match(/<title>([^<]+)<\/title>/i)?.[1] ||
            'Unknown Product';

        const description = getMeta('og:description') ||
            getMeta('description') ||
            getMeta('twitter:description') ||
            '';

        const image = getMeta('og:image') ||
            getMeta('twitter:image');

        const priceAmount = getMeta('og:price:amount') ||
            getMeta('product:price:amount');
        const currency = getMeta('og:price:currency') ||
            getMeta('product:price:currency') || 'USD';

        // Extract price from logic if possible
        let price = priceAmount ? parseFloat(priceAmount) : 0;

        // If no structured price, try naive regex on title/desc (very risky, maybe skip)
        // Or look for $123.45 patterns nearby? Too complex for regex parser.

        if (!title && !image) {
            throw new Error("Could not extract meaningful data");
        }

        return {
            source: 'generic',
            data: {
                title,
                description,
                image,
                price,
                currency,
                url
            }
        };

    } catch (err: any) {
        throw new Error(`Scraping failed: ${err.message}`);
    }
}
