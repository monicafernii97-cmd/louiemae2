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

/**
 * Extract structured product attributes from an OTAPI item's
 * FeaturedValues, Properties, and ConfiguredItems.
 *
 * Skips rating/sales keys (extracted separately for display).
 * Merges duplicate property names with comma separation.
 * Limits variant option summaries to 8 values per group.
 */
export function extractOtapiSourceProperties(item: any): Record<string, string> {
    const properties: Record<string, string> = {};

    // FeaturedValues: OTAPI key-value pairs (material, style, season, etc.)
    if (Array.isArray(item.FeaturedValues)) {
        for (const fv of item.FeaturedValues) {
            const name = fv?.Name;
            const value = fv?.Value;
            if (!name || !value || name === 'rating' || name === 'SalesInLast30Days' || name === 'TotalSales') continue;
            properties[name] = String(value);
        }
    }

    // Properties / PropertyNames: structured attribute groups (fabric type, season, age range)
    if (Array.isArray(item.Properties)) {
        for (const prop of item.Properties) {
            const propName = prop?.PropertyName || prop?.Name;
            const propValue = prop?.Value || prop?.DisplayValue;
            if (propName && propValue) {
                const existing = properties[propName];
                properties[propName] = existing ? `${existing}, ${propValue}` : String(propValue);
            }
        }
    }

    // ConfiguredItems Configurators: variant attribute names (颜色=Color, 尺码=Size)
    if (Array.isArray(item.ConfiguredItems) && item.ConfiguredItems.length > 0) {
        const optionGroups = new Map<string, Set<string>>();
        for (const cfg of item.ConfiguredItems) {
            if (!Array.isArray(cfg.Configurators)) continue;
            for (const c of cfg.Configurators) {
                const pName = c?.PropertyName || c?.Pid;
                const pValue = c?.Value || c?.Vid;
                if (!pName || !pValue) continue;
                if (!optionGroups.has(pName)) optionGroups.set(pName, new Set());
                optionGroups.get(pName)!.add(String(pValue));
            }
        }
        for (const [groupName, values] of optionGroups) {
            if (!properties[groupName]) {
                const arr = [...values].slice(0, 8);
                properties[groupName] = arr.join(', ') + (values.size > 8 ? ` (+${values.size - 8} more)` : '');
            }
        }
    }

    // OriginalTitle as supplementary context if different from translated title
    if (typeof item.OriginalTitle === 'string' && item.OriginalTitle !== item.Title) {
        properties['OriginalTitle'] = item.OriginalTitle;
    }

    return properties;
}

/**
 * Clean an OTAPI item description: strip HTML tags, collapse whitespace,
 * truncate to maxLength characters.
 * Returns empty string if no meaningful description available.
 */
export function cleanOtapiDescription(item: any, maxLength = 1000): string {
    if (typeof item.Description === 'string' && item.Description.length > 10) {
        return item.Description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
    }
    return '';
}
