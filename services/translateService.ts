/**
 * Translation Service — MyMemory API
 *
 * Free, non-AI translation using MyMemory (https://mymemory.translated.net).
 * No API key required for basic use (1000 words/day).
 * Reliable for Chinese (zh) → English (en) translation.
 */

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

/** Maximum characters per MyMemory API request. */
const MAX_CHUNK_SIZE = 500;

/**
 * Detects whether a string contains CJK (Chinese/Japanese/Korean) characters.
 * Checks for CJK Unified Ideographs, Extension A, and Compatibility Ideographs.
 */
export function detectChinese(text: string): boolean {
    return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text);
}

/**
 * Translates a single chunk of text (≤500 chars) via the MyMemory API.
 * Returns the original text if the API call fails or no CJK characters are found.
 */
async function translateChunk(
    text: string,
    from: string,
    to: string
): Promise<string> {
    const params = new URLSearchParams({
        q: text,
        langpair: `${from}|${to}`,
    });

    const response = await fetch(`${MYMEMORY_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Translation API error: ${response.status}`);

    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        // MyMemory sometimes returns all-caps — normalize
        if (translated === translated.toUpperCase() && translated.length > 3) {
            return translated.charAt(0) + translated.slice(1).toLowerCase();
        }
        return translated;
    }

    return text;
}

/**
 * Translates a text string via MyMemory API, handling long texts by
 * splitting into ≤500 character chunks at sentence boundaries and
 * concatenating the translated results.
 *
 * Skips translation if no CJK characters are detected.
 *
 * @param text - The text to translate
 * @param from - Source language code (default: 'zh-CN')
 * @param to - Target language code (default: 'en')
 * @returns Translated text, or the original if no CJK detected or on error
 */
export async function translateText(
    text: string,
    from = 'zh-CN',
    to = 'en'
): Promise<string> {
    if (!text.trim()) return text;
    if (!detectChinese(text)) return text;

    try {
        // Split into chunks at sentence boundaries (。！？or newline)
        if (text.length <= MAX_CHUNK_SIZE) {
            return await translateChunk(text, from, to);
        }

        // Split on Chinese sentence-end punctuation or newlines
        const sentences = text.split(/(?<=[。！？\n])/);
        const chunks: string[] = [];
        let current = '';

        for (const sentence of sentences) {
            if ((current + sentence).length > MAX_CHUNK_SIZE && current) {
                chunks.push(current);
                current = sentence;
            } else {
                current += sentence;
            }
        }
        if (current) chunks.push(current);

        // Translate each chunk in parallel
        const translated = await Promise.all(
            chunks.map(chunk => translateChunk(chunk, from, to))
        );
        return translated.join('');
    } catch (err) {
        console.warn('[Translate] MyMemory translation failed:', err);
        return text;
    }
}

/**
 * Translates all text fields of a product in a single batch call.
 * Runs name, description, and all variant name translations in parallel.
 *
 * @param fields - Object containing name, description, and variantNames
 * @returns Object with translated name, description, and variantNames
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
    const [name, description, ...variantNames] = await Promise.all([
        translateText(fields.name),
        translateText(fields.description),
        ...fields.variantNames.map(vn => translateText(vn)),
    ]);

    return { name, description, variantNames };
}
