/**
 * Shared OTAPI field extraction helpers.
 *
 * Used by both the Convex backend (convex/http.ts search normalizer)
 * and the frontend (ProductStudio.tsx URL import) to keep OTAPI
 * field extraction logic in one canonical place.
 *
 * IMPORTANT: This file must be pure TypeScript — no browser or
 * Node-specific imports — so that Convex can bundle it.
 */

/** Extracts USD price from an OTAPI ConvertedPriceList or OriginalPrice field. */
export function getOtapiUsdPrice(priceObj: any): number {
    const raw = priceObj?.ConvertedPriceList?.Internal?.Price ?? priceObj?.OriginalPrice ?? 0;
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : 0;
}

/** Extracts a named value from an OTAPI item's FeaturedValues array. */
export function getOtapiFeaturedValue(item: any, name: string): string | undefined {
    const fv = item?.FeaturedValues;
    if (!Array.isArray(fv)) return undefined;
    const entry = fv.find((v: any) => v.Name === name);
    return entry?.Value;
}

/** Extracts images from an OTAPI item's Pictures array + MainPictureUrl fallback. */
export function extractOtapiImages(item: any): string[] {
    const images: string[] = [];
    if (Array.isArray(item?.Pictures)) {
        for (const pic of item.Pictures) {
            if (!pic) continue;
            const url = pic?.Large?.Url || pic?.Medium?.Url || pic?.Url;
            if (url) images.push(url);
        }
    }
    if (images.length === 0 && item?.MainPictureUrl) {
        images.push(item.MainPictureUrl);
    }
    return images;
}

/**
 * Normalized product fields extracted from a single OTAPI item.
 * Used by both URL import (single item) and search (array of items).
 */
export interface OtapiExtractedFields {
    name: string;
    price: number;
    originalPrice: number;
    description: string;
    images: string[];
    sourceUrl: string;
}

/**
 * Extracts normalized product fields from a single OTAPI item object.
 *
 * @param item  The OTAPI item (already unwrapped from the Result envelope).
 * @param fallbackUrl  Fallback URL if the item has no TaobaoItemUrl or ExternalItemUrl.
 */
export function extractOtapiFields(item: any, fallbackUrl = ''): OtapiExtractedFields {
    const promoPrice = getOtapiUsdPrice(item?.PromotionPrice);
    const regularPrice = getOtapiUsdPrice(item?.Price);
    const price = promoPrice > 0 ? promoPrice : regularPrice;
    const originalPrice = regularPrice > promoPrice && promoPrice > 0 ? regularPrice : price;

    return {
        name: item?.Title || item?.OriginalTitle || 'Unknown Product',
        price,
        originalPrice,
        description: item?.Description || 'Imported from 1688.com',
        images: extractOtapiImages(item),
        sourceUrl: item?.TaobaoItemUrl || item?.ExternalItemUrl || fallbackUrl,
    };
}
