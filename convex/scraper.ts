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
            try {
                return await scrapeAliExpress(productId);
            } catch (apiErr: any) {
                // RapidAPI failed — fall back to generic HTML scraping
                console.log(`[Scraper] RapidAPI failed for AliExpress product ${productId}: ${apiErr.message}`);
                console.log(`[Scraper] Falling back to generic HTML scraping for: ${url}`);
                return await scrapeGeneric(url);
            }
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
    const DATAHUB_HOST = "aliexpress-datahub.p.rapidapi.com";
    const TRUE_API_HOST = "aliexpress-true-api.p.rapidapi.com";

    const endpoints = [
        { url: `https://${DATAHUB_HOST}/item_detail_2?itemId=${productId}`, host: DATAHUB_HOST, type: 'datahub' },
        { url: `https://${DATAHUB_HOST}/item_detail_3?itemId=${productId}`, host: DATAHUB_HOST, type: 'datahub' },
        { url: `https://${DATAHUB_HOST}/item_detail?itemId=${productId}`, host: DATAHUB_HOST, type: 'datahub' },
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

            if (endpoint.type === 'datahub' && data.result?.status?.data === "error") {
                lastError = data.result?.status?.msg?.["internal-error"] || "API returned error";
                console.log(`Datahub endpoint returned internal error, trying next...`);
                continue;
            }

            if (endpoint.type === 'true-api' && (data.error || data.status === 'error')) {
                lastError = data.error || data.message || "True API returned error";
                console.log(`True API endpoint returned error, trying next...`);
                continue;
            }

            console.log(`Successfully fetched from ${endpoint.host}`);

            return {
                source: 'aliexpress',
                data: data,
                apiType: endpoint.type,
            };

        } catch (e: any) {
            lastError = e.message;
            console.log(`Endpoint threw error: ${e.message}, trying next...`);
        }
    }

    throw new Error(lastError || "All AliExpress API endpoints failed");
}

async function scrapeGeneric(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            throw new Error(`Failed to load page: ${response.status}`);
        }

        const html = await response.text();

        // Extract meta tags
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

        // Extract images — collect multiple sources
        const images: string[] = [];
        const ogImage = getMeta('og:image');
        if (ogImage) images.push(ogImage.startsWith('//') ? `https:${ogImage}` : ogImage);
        const twitterImage = getMeta('twitter:image');
        if (twitterImage && twitterImage !== ogImage) {
            images.push(twitterImage.startsWith('//') ? `https:${twitterImage}` : twitterImage);
        }

        // Look for additional product images in the HTML
        const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
        for (const match of imgMatches) {
            let imgSrc = match[1];
            // Skip tiny icons, tracking pixels, logos, etc.
            if (imgSrc.includes('pixel') || imgSrc.includes('icon') || imgSrc.includes('logo') ||
                imgSrc.includes('avatar') || imgSrc.includes('flag') || imgSrc.includes('badge') ||
                imgSrc.includes('.svg') || imgSrc.includes('1x1') || imgSrc.includes('blank') ||
                imgSrc.includes('data:image') || imgSrc.length < 10) continue;
            // Normalize protocol-relative URLs
            if (imgSrc.startsWith('//')) imgSrc = `https:${imgSrc}`;
            // Only include product-looking images
            if ((imgSrc.includes('product') || imgSrc.includes('item') || imgSrc.includes('img') ||
                imgSrc.includes('photo') || imgSrc.includes('upload') || imgSrc.includes('image') ||
                imgSrc.includes('pic') || imgSrc.includes('media') || imgSrc.includes('cdn')) &&
                !images.includes(imgSrc) && images.length < 10) {
                images.push(imgSrc);
            }
        }

        // Extract price
        const priceAmount = getMeta('og:price:amount') ||
            getMeta('product:price:amount');
        let price = priceAmount ? parseFloat(priceAmount) : 0;

        // If no meta price, try common price patterns in HTML
        if (!price) {
            const priceMatch = html.match(/"price"\s*:\s*"?([\d.]+)"?/i) ||
                html.match(/\$\s*([\d]+\.[\d]{2})/);
            if (priceMatch) price = parseFloat(priceMatch[1]) || 0;
        }

        const currency = getMeta('og:price:currency') ||
            getMeta('product:price:currency') || 'USD';

        if (!title && images.length === 0) {
            throw new Error("Could not extract meaningful data from this page");
        }

        return {
            source: 'generic',
            data: {
                title: title.trim(),
                description: description.trim(),
                image: images[0] || null,
                images, // pass all found images
                price,
                currency,
                url
            }
        };

    } catch (err: any) {
        throw new Error(`Scraping failed: ${err.message}`);
    }
}
