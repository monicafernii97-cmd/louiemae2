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
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
        throw new Error("RapidAPI key not configured");
    }

    // Try multiple API versions/endpoints for resilience
    // Priority: item_detail_2 > item_detail_3 > item_detail > True API
    const DATAHUB_HOST = "aliexpress-datahub.p.rapidapi.com";
    const TRUE_API_HOST = "aliexpress-true-api.p.rapidapi.com";

    const endpoints = [
        // Datahub endpoints (multiple versions)
        { url: `https://${DATAHUB_HOST}/item_detail_2?itemId=${productId}`, host: DATAHUB_HOST, type: 'datahub' },
        { url: `https://${DATAHUB_HOST}/item_detail_3?itemId=${productId}`, host: DATAHUB_HOST, type: 'datahub' },
        { url: `https://${DATAHUB_HOST}/item_detail?itemId=${productId}`, host: DATAHUB_HOST, type: 'datahub' },
        // AliExpress True API as fallback
        { url: `https://${TRUE_API_HOST}/api/v3/product/${productId}`, host: TRUE_API_HOST, type: 'true-api' },
        { url: `https://${TRUE_API_HOST}/api/product/${productId}`, host: TRUE_API_HOST, type: 'true-api' },
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            console.log(`Trying endpoint: ${endpoint.url}`);

            const response = await fetch(endpoint.url, {
                headers: {
                    "X-RapidAPI-Key": rapidApiKey,
                    "X-RapidAPI-Host": endpoint.host,
                },
            });

            if (!response.ok) {
                lastError = `API Error: ${response.status} from ${endpoint.host}`;
                console.log(`Endpoint failed with ${response.status}, trying next...`);
                continue;
            }

            const data = await response.json();

            // Check internal error for datahub
            if (endpoint.type === 'datahub' && data.result?.status?.data === "error") {
                lastError = data.result?.status?.msg?.["internal-error"] || "API returned error";
                console.log(`Datahub endpoint returned internal error, trying next...`);
                continue;
            }

            // Check for True API error format
            if (endpoint.type === 'true-api' && (data.error || data.status === 'error')) {
                lastError = data.error || data.message || "True API returned error";
                console.log(`True API endpoint returned error, trying next...`);
                continue;
            }

            console.log(`Successfully fetched from ${endpoint.host}`);

            // Normalize based on API type
            return {
                source: endpoint.type === 'true-api' ? 'aliexpress-true' : 'aliexpress',
                data: data
            };

        } catch (e: any) {
            lastError = e.message;
            console.log(`Endpoint threw error: ${e.message}, trying next...`);
        }
    }

    throw new Error(lastError || "this endpoint is temporarily unavailable, try again later. If this persists, contact developer for more information. Meanwhile, try using other version of this Endpoint if it exists");
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
