/**
 * Translation Service — MyMemory API
 *
 * Free, non-AI translation using MyMemory (https://mymemory.translated.net).
 * No API key required for basic use (1000 words/day).
 * Reliable for Chinese (zh) → English (en) translation.
 */

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

/** Detects whether a string contains CJK (Chinese/Japanese/Korean) characters. */
export function detectChinese(text: string): boolean {
    // CJK Unified Ideographs range + common punctuation
    return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text);
}

/** Translates a single text string via MyMemory API. */
export async function translateText(
    text: string,
    from = 'zh-CN',
    to = 'en'
): Promise<string> {
    if (!text.trim()) return text;
    // Skip if no CJK characters detected
    if (!detectChinese(text)) return text;

    try {
        const params = new URLSearchParams({
            q: text.substring(0, 500), // MyMemory limit per request
            langpair: `${from}|${to}`,
        });

        const response = await fetch(`${MYMEMORY_URL}?${params.toString()}`);
        if (!response.ok) throw new Error(`Translation API error: ${response.status}`);

        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translated = data.responseData.translatedText;
            // MyMemory sometimes returns all-caps "TRANSLATED TEXT" — normalize
            if (translated === translated.toUpperCase() && translated.length > 3) {
                return translated.charAt(0) + translated.slice(1).toLowerCase();
            }
            return translated;
        }

        // Fallback: return original if translation failed
        return text;
    } catch (err) {
        console.warn('[Translate] MyMemory translation failed:', err);
        return text;
    }
}

/**
 * Translate all text fields of a product in one batch.
 * Returns an object with translated name, description, and variant names.
 */
export async function translateProductFields(fields: {
    name: string;
    description: string;
    variantNames: string[];
}): Promise<{
    name: string;
    description: string;
    variantNames: string[];
}> {
    // Run all translations in parallel for speed
    const [name, description, ...variantNames] = await Promise.all([
        translateText(fields.name),
        translateText(fields.description),
        ...fields.variantNames.map(vn => translateText(vn)),
    ]);

    return { name, description, variantNames };
}
