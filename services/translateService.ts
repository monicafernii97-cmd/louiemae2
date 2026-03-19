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

/** Timeout in milliseconds for each translation request. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Maximum number of concurrent translation requests to avoid rate limiting. */
const MAX_CONCURRENCY = 3;

/**
 * Detects whether a string contains Chinese characters.
 * Checks CJK Unified Ideographs, Extension A, and Compatibility Ideographs ranges.
 */
export function detectChinese(text: string): boolean {
    return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text);
}

/**
 * Translates a single chunk of text (≤500 chars) via the MyMemory API.
 * Includes a 10-second timeout to prevent indefinite hangs on slow networks.
 * Returns the original text if the API call fails.
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${MYMEMORY_URL}?${params.toString()}`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

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
    } catch {
        clearTimeout(timeoutId);
        return text;
    }
}

/**
 * Runs an array of async tasks with limited concurrency.
 *
 * @param tasks - Array of zero-arg async functions
 * @param limit - Maximum number of tasks to run simultaneously
 * @returns Array of resolved values in the same order as input
 */
async function runWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;

    const worker = async () => {
        while (nextIndex < tasks.length) {
            const i = nextIndex++;
            results[i] = await tasks[i]();
        }
    };

    await Promise.all(
        Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
    );
    return results;
}

/**
 * Translates a text string via MyMemory API, handling long texts by
 * splitting into ≤500 character chunks at sentence boundaries and
 * concatenating the translated results.
 *
 * Skips translation if no Chinese characters are detected.
 *
 * @param text - The text to translate
 * @param from - Source language code (default: 'zh-CN')
 * @param to - Target language code (default: 'en')
 * @returns Translated text, or the original if no Chinese detected or on error
 */
export async function translateText(
    text: string,
    from = 'zh-CN',
    to = 'en'
): Promise<string> {
    if (!text.trim()) return text;
    if (!detectChinese(text)) return text;

    try {
        // Short text — translate directly
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
            } else if (sentence.length > MAX_CHUNK_SIZE) {
                // Split oversized sentence at chunk boundaries
                if (current) chunks.push(current);
                for (let i = 0; i < sentence.length; i += MAX_CHUNK_SIZE) {
                    chunks.push(sentence.slice(i, i + MAX_CHUNK_SIZE));
                }
                current = '';
            } else {
                current += sentence;
            }
        }
        if (current) chunks.push(current);

        // Translate chunks with concurrency limit
        const translated = await runWithConcurrency(
            chunks.map(chunk => () => translateChunk(chunk, from, to)),
            MAX_CONCURRENCY
        );
        return translated.join('');
    } catch (err) {
        console.warn('[Translate] MyMemory translation failed:', err);
        return text;
    }
}

/**
 * Translates all text fields of a product in a single batch call.
 * Runs translations with limited concurrency to avoid rate limiting.
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
    // Build all translation tasks
    const tasks: (() => Promise<string>)[] = [
        () => translateText(fields.name),
        () => translateText(fields.description),
        ...fields.variantNames.map(vn => () => translateText(vn)),
    ];

    // Run with concurrency limit
    const results = await runWithConcurrency(tasks, MAX_CONCURRENCY);
    const [name, description, ...variantNames] = results;

    return { name, description, variantNames };
}
