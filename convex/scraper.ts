"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

// SSRF protection: check if a hostname is private/internal
const isBlockedHost = (hostname: string): boolean => {
    const h = hostname.toLowerCase();
    // Check for IP-based private ranges with proper octet parsing
    const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
        const a = Number(ipv4[1]);
        const b = Number(ipv4[2]);
        if (a === 127 || a === 10 || a === 0 ||
            (a === 192 && b === 168) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31)) {
            return true;
        }
    }
    return (
        h === 'localhost' ||
        h.endsWith('.local') ||
        h.endsWith('.internal')
    );
};

export const scrapeProduct = action({
    args: { url: v.string() },
    handler: async (ctx, { url }) => {
        console.log(`[Scraper] Starting scrape for URL: ${url}`);

        try {
            // Validate URL format and protect against SSRF
            if (!url || !url.startsWith('http')) {
                throw new Error(`Invalid URL format: "${url}". URL must start with http:// or https://`);
            }

            // Validate original URL against SSRF blocklist
            try {
                const parsed = new URL(url);
                if (isBlockedHost(parsed.hostname)) {
                    throw new Error(`Blocked internal/private URL: "${parsed.hostname}"`);
                }
            } catch (parseErr: any) {
                if (parseErr.message.startsWith('Blocked')) throw parseErr;
                throw new Error(`Invalid URL: "${url}"`);
            }

            let resolvedUrl = url;

            // 1. Check for 1688.com product URLs
            // Support formats:
            // https://detail.1688.com/offer/838924089999.html
            // https://m.1688.com/offer/838924089999.html
            const match1688 = resolvedUrl.match(/1688\.com\/offer\/(\d+)\.html/);

            if (match1688) {
                const productId = match1688[1];
                console.log(`[Scraper] Detected 1688 product ID: ${productId}`);
                try {
                    return await scrape1688(productId);
                } catch (apiErr: any) {
                    // OTAPI failed — fall back to generic HTML scraping
                    console.log(`[Scraper] OTAPI failed for 1688 product ${productId}: ${apiErr.message}`);
                    console.log(`[Scraper] Falling back to generic HTML scraping for: ${resolvedUrl}`);
                    return await scrapeGeneric(resolvedUrl);
                }
            }

            // 2. Generic Scraper (handles AliExpress, Amazon, and any other URLs)
            console.log(`[Scraper] Using generic scraper for: ${resolvedUrl}`);
            return await scrapeGeneric(resolvedUrl);

        } catch (err: any) {
            // Top-level catch: prevents generic "Server Error" from Convex
            // by throwing a properly formatted error with details
            const errorMessage = err?.message || 'Unknown scraping error';
            console.error(`[Scraper] FATAL ERROR scraping ${url}: ${errorMessage}`);
            console.error(`[Scraper] Stack: ${err?.stack || 'no stack trace'}`);
            throw new Error(`Scraping failed for "${url}": ${errorMessage}`);
        }
    },
});

// Fetch product details from 1688.com via OTAPI API
async function scrape1688(productId: string) {
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
        throw new Error("RapidAPI key not configured");
    }

    const OTAPI_HOST = "otapi-1688.p.rapidapi.com";
    const otapiId = `abb-${productId}`;

    console.log(`[Scraper] Fetching 1688 product via OTAPI: ${otapiId}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        let response: Response;
        try {
            response = await fetch(
                `https://${OTAPI_HOST}/BatchGetItemFullInfo?language=en&itemId=${otapiId}`,
                {
                    headers: {
                        "X-RapidAPI-Key": rapidApiKey,
                        "x-rapidapi-host": OTAPI_HOST,
                    },
                    signal: controller.signal,
                }
            );
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            throw new Error(`OTAPI API Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.ErrorCode !== 'Ok' || data.Result?.HasError) {
            throw new Error(`OTAPI Error: ${data.Result?.ErrorCode || data.ErrorCode}`);
        }

        console.log(`[Scraper] Successfully fetched 1688 product via OTAPI`);

        return {
            source: '1688',
            data: data,
            apiType: 'otapi-1688',
        };

    } catch (e: any) {
        throw new Error(`OTAPI 1688 API failed: ${e.message}`);
    }
}

async function scrapeGeneric(url: string) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        let response: Response;
        // Use redirect: 'follow' then revalidate final URL against SSRF blocklist
        try {
            response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                },
                redirect: 'follow',
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }

        // Revalidate final URL after redirects
        const finalUrl = response.url || url;
        try {
            const finalParsed = new URL(finalUrl);
            if (isBlockedHost(finalParsed.hostname)) {
                throw new Error(`Redirect landed on blocked host: "${finalParsed.hostname}"`);
            }
        } catch (ssrfErr: any) {
            if (ssrfErr.message.startsWith('Redirect')) throw ssrfErr;
            // URL parse error — proceed anyway since fetch already succeeded
        }

        if (!response.ok) {
            throw new Error(`Failed to load page: HTTP ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        console.log(`[Scraper] Fetched ${html.length} bytes from ${url}`);

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
        // Helper to resolve any URL (relative, protocol-relative, absolute) against the page
        const resolveUrl = (src: string): string => {
            if (!src) return '';
            try {
                return new URL(src, finalUrl).toString();
            } catch {
                return src.startsWith('//') ? `https:${src}` : src;
            }
        };

        const images: string[] = [];
        const ogImage = getMeta('og:image');
        if (ogImage) images.push(resolveUrl(ogImage));
        const twitterImage = getMeta('twitter:image');
        if (twitterImage && twitterImage !== ogImage) {
            images.push(resolveUrl(twitterImage));
        }

        // Look for additional product images in the HTML
        const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
        for (const match of imgMatches) {
            const imgSrc = match[1];
            // Skip tiny icons, tracking pixels, logos, etc.
            if (imgSrc.includes('pixel') || imgSrc.includes('icon') || imgSrc.includes('logo') ||
                imgSrc.includes('avatar') || imgSrc.includes('flag') || imgSrc.includes('badge') ||
                imgSrc.includes('.svg') || imgSrc.includes('1x1') || imgSrc.includes('blank') ||
                imgSrc.includes('data:image') || imgSrc.length < 10) continue;
            const resolved = resolveUrl(imgSrc);
            // Accept images matching common extensions or CDN/hosting patterns
            const hasImageExt = /\.(jpe?g|png|webp|avif)(\?|$)/i.test(resolved);
            const hasCdnPattern = /(cdn|cloudfront|cloudinary|s3\.amazonaws|imgix|akamai|media|upload|photo|product|item|pic)/i.test(resolved);
            const hasSizeParam = /(\d{2,4}x\d{2,4}|width=|height=|w=\d|h=\d|resize)/i.test(resolved);
            if ((hasImageExt || hasCdnPattern || hasSizeParam) &&
                !images.includes(resolved) && images.length < 10) {
                images.push(resolved);
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

        if (title === 'Unknown Product' && images.length === 0) {
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
