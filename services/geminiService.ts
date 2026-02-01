
import { GoogleGenAI } from "@google/genai";
import { CustomPage } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

// Lazy initialization to prevent crashes when API key is missing
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance && apiKey) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface GeminiDiagnosticResult {
  success: boolean;
  error?: string;
  keyPresent: boolean;
  keyFormat?: string;
  modelTested?: string;
}

/**
 * Test the Gemini API connection and key validity.
 * Run in browser console: window.__testGemini()
 */
export const testGeminiConnection = async (): Promise<GeminiDiagnosticResult> => {
  // Check if API key is present
  if (!apiKey) {
    return {
      success: false,
      error: 'VITE_GEMINI_API_KEY is not set in environment variables',
      keyPresent: false,
    };
  }

  // Check key format (Google AI keys start with 'AIza')
  const keyFormat = apiKey.startsWith('AIza') ? 'valid-format' : 'unknown-format';

  try {
    const ai = getAI();
    if (!ai) {
      return {
        success: false,
        error: 'Failed to initialize GoogleGenAI instance',
        keyPresent: true,
        keyFormat,
      };
    }

    // Simple test prompt
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Say "OK" and nothing else.',
      config: {
        temperature: 0,
        maxOutputTokens: 10,
      }
    });

    if (response.text?.toLowerCase().includes('ok')) {
      console.log('✅ Gemini API connection successful');
      return {
        success: true,
        keyPresent: true,
        keyFormat,
        modelTested: 'gemini-2.0-flash',
      };
    } else {
      return {
        success: false,
        error: `Unexpected response: ${response.text}`,
        keyPresent: true,
        keyFormat,
        modelTested: 'gemini-2.0-flash',
      };
    }
  } catch (error: any) {
    console.error('❌ Gemini API test failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      keyPresent: true,
      keyFormat,
    };
  }
};

// Expose diagnostic function to browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).__testGemini = testGeminiConnection;
  (window as any).__geminiKeyStatus = () => ({
    present: !!apiKey,
    format: apiKey ? (apiKey.startsWith('AIza') ? 'valid' : 'unknown') : 'missing',
    length: apiKey?.length || 0,
  });
}


export const generateConciergeResponse = async (
  userMessage: string,
  history: { role: string; text: string }[]
): Promise<string> => {
  if (!apiKey) {
    return "I'm sorry, I cannot connect to my design knowledge base right now. Please check the API key.";
  }

  try {
    const model = 'gemini-3-flash-preview';

    // Construct context based on the "Louie Mae" brand persona
    const systemInstruction = `
      You are the "Louie Mae Concierge," a sophisticated, warm, and knowledgeable interior design and fashion assistant.
      Your tone is elegant, helpful, and concise. You speak with a slight editorial flair.
      
      About Louie Mae:
      - We sell high-end furniture (rattan, linen, wood), home decor, women's fashion (dresses, sets), and curated kids' items.
      - Our aesthetic is "timeless artistry," "earthy," "neutral," and "minimalist."
      - Key products: Buffet Sideboards, Linen Accent Chairs, Rattan Stools, Organic Kids Clothes.
      
      Your Goal:
      - Help customers find products.
      - Offer styling advice (e.g., "What goes with this chair?").
      - Be a seamless part of the shopping experience.
      - Do not use markdown symbols like ** or #. Keep text clean.
    `;

    const ai = getAI();
    if (!ai) {
      return "I'm sorry, the AI service is not available.";
    }
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction,
      }
    });

    return response.text || "I apologize, I'm having a moment of creative block. Could you repeat that?";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I am currently assisting other clients. Please try again in a moment.";
  }
};

export const generatePageStructure = async (
  prompt: string,
  title: string
): Promise<Omit<CustomPage, 'id' | 'slug'>> => {
  if (!apiKey) {
    throw new Error("API Key missing");
  }

  try {
    const model = 'gemini-3-flash-preview';
    const systemInstruction = `
        You are a web architect for "Louie Mae," a high-end lifestyle brand (earthy, minimalist, sophisticated).
        Generate a JSON structure for a new website page based on the user's description.
        
        The Output must be STRICT JSON. No markdown formatting.
        
        The structure must adhere to this TypeScript interface:
        interface PageSection {
          id: string; // generate a random string
          type: 'hero' | 'text' | 'image-text' | 'manifesto';
          heading?: string;
          subheading?: string;
          content?: string;
          image?: string; // Use Unsplash URLs relevant to the topic
        }
        
        interface Output {
           title: string;
           sections: PageSection[];
        }
        
        For 'hero': needs image, heading, subheading.
        For 'text': needs heading, content.
        For 'image-text': needs image, heading, content.
        For 'manifesto': needs content (a centered, impactful quote/statement).
        
        Tone: Elegant, timeless, welcoming, faith-based but subtle.
      `;

    const ai = getAI();
    if (!ai) throw new Error("AI service not available");
    const response = await ai.models.generateContent({
      model,
      contents: `Create a page about: ${prompt}. The title should be approximately: ${title}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response generated");

    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Page Gen Error:", error);
    throw error;
  }
};

export const suggestProductCategory = async (
  productName: string,
  productDescription: string
): Promise<string> => {
  if (!apiKey) return '';

  try {
    const model = 'gemini-3-flash-preview';
    const validCategories = [
      'Girls Tops', 'Girls Bottoms', 'Girls Dresses', 'Girls Rompers',
      'Girls 2-Piece Sets', 'Girls Activewear', 'Girls Accessories', 'Girls Footwear',
      'Boys', 'Toys', 'Nursery Furniture', 'Playroom Furniture'
    ];

    const systemInstruction = `
      You are an inventory manager for "Louie Mae".
      Your task is to categorize a product into one of the following exact categories:
      ${validCategories.join(', ')}

      Rules:
      - Return ONLY the exact category name from the list.
      - Do not add punctuation or extra words.
      - If it's for boys, use 'Boys'.
      - If it's furniture for a baby room, use 'Nursery Furniture'.
      - If it's furniture for play, use 'Playroom Furniture'.
      - If unclear, default to 'Toys' or the closest match.
    `;

    const ai = getAI();
    if (!ai) return '';
    const response = await ai.models.generateContent({
      model,
      contents: `Product: ${productName}. Description: ${productDescription}`,
      config: {
        systemInstruction,
        temperature: 0.1, // Low temperature for deterministic output
      }
    });

    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini Categorization Error:", error);
    return '';
  }
};

// --- Product AI Functions ---

// Human-first names for products by category - expanded lists for variety
const PRODUCT_NAME_INSPIRATIONS = {
  furniture: [
    // Nordic/Scandinavian feminine names
    'Olivia', 'Hazel', 'Margot', 'Clara', 'Elodie', 'Nora', 'Astrid', 'Linnea', 'Freya', 'Ingrid',
    'Saga', 'Elsa', 'Sigrid', 'Maja', 'Liv', 'Freja', 'Signe', 'Alma', 'Elin', 'Thea',
    'Maren', 'Solveig', 'Ylva', 'Birgitta', 'Karin', 'Ebba', 'Inge', 'Dagny', 'Hedda', 'Greta',
    // Classic elegant names
    'Charlotte', 'Eleanor', 'Josephine', 'Adelaide', 'Beatrice', 'Florence', 'Harriet', 'Louisa'
  ],
  fashion: [
    // Nature-inspired names
    'Maeve', 'Sienna', 'Wren', 'Ivy', 'Juniper', 'Willow', 'Fern', 'Clover', 'Luna', 'Autumn',
    'Stella', 'Aurora', 'Dahlia', 'Violet', 'Jade', 'Pearl', 'Ruby', 'Coral', 'Amber', 'Olive',
    'Sage', 'Laurel', 'Briar', 'Heather', 'Iris', 'Lily', 'Rose', 'Daisy', 'Magnolia', 'Jasmine',
    // Soft feminine names
    'Amelie', 'Celeste', 'Camille', 'Delphine', 'Estelle', 'Giselle', 'Colette', 'Simone'
  ],
  kids: [
    // Playful and sweet names
    'Birdie', 'Poppy', 'Rosie', 'Daisy', 'Finley', 'Milo', 'Otto', 'Theo', 'Emmett', 'Bodhi',
    'Clementine', 'Marigold', 'Blossom', 'Sunny', 'Meadow', 'Willa', 'Nellie', 'Goldie', 'Pippa', 'Lottie',
    'Bear', 'Fox', 'Wren', 'Robin', 'Sparrow', 'Cricket', 'Fawn', 'Bunny', 'Acorn', 'Maple',
    // Whimsical names
    'Story', 'Journey', 'Harbor', 'Sailor', 'Scout', 'West', 'True', 'Brave', 'Noble', 'Rowan'
  ],
  decor: [
    // Nature and earth elements
    'Haven', 'Ember', 'Meadow', 'Sage', 'Moss', 'Fawn', 'River', 'Stone', 'Dune', 'Pebble',
    'Cove', 'Glen', 'Dale', 'Heath', 'Brook', 'Reed', 'Clay', 'Slate', 'Terra', 'Opal',
    'Dawn', 'Dusk', 'Haze', 'Mist', 'Fog', 'Frost', 'Snow', 'Rain', 'Storm', 'Cloud',
    // Texture and material inspired
    'Velvet', 'Linen', 'Cotton', 'Wool', 'Silk', 'Canvas', 'Weave', 'Thread', 'Grain', 'Wicker'
  ],
  default: [
    'Aria', 'Nova', 'Luna', 'Stella', 'Aurora', 'Ivy', 'Sage', 'Willow', 'Fern', 'Hazel',
    'Clara', 'Nora', 'Margot', 'Elodie', 'Freya', 'Astrid', 'Ingrid', 'Linnea', 'Thea', 'Maja',
    'Sienna', 'Amber', 'Olive', 'Pearl', 'Coral', 'Jade', 'Violet', 'Dahlia', 'Iris', 'Laurel'
  ]
};

// Product type simplifications for cleaner names
const PRODUCT_TYPE_MAPPINGS: Record<string, string> = {
  'chair': 'Chair',
  'dining': 'Dining Chair',
  'accent': 'Accent Chair',
  'lounge': 'Lounge Chair',
  'armchair': 'Armchair',
  'sofa': 'Sofa',
  'couch': 'Sofa',
  'table': 'Table',
  'coffee': 'Coffee Table',
  'side': 'Side Table',
  'console': 'Console',
  'buffet': 'Buffet',
  'sideboard': 'Sideboard',
  'cabinet': 'Cabinet',
  'shelf': 'Shelf',
  'bookcase': 'Bookcase',
  'desk': 'Desk',
  'bed': 'Bed',
  'dresser': 'Dresser',
  'nightstand': 'Nightstand',
  'stool': 'Stool',
  'bench': 'Bench',
  'ottoman': 'Ottoman',
  'mirror': 'Mirror',
  'lamp': 'Lamp',
  'rug': 'Rug',
  'basket': 'Basket',
  'vase': 'Vase',
  'planter': 'Planter',
  'tray': 'Tray',
  'bowl': 'Bowl',
  'dress': 'Dress',
  'top': 'Top',
  'blouse': 'Blouse',
  'skirt': 'Skirt',
  'pants': 'Trousers',
  'romper': 'Romper',
  'jumpsuit': 'Jumpsuit',
  'cardigan': 'Cardigan',
  'sweater': 'Sweater',
  'jacket': 'Jacket',
  'coat': 'Coat',
};

// Collection-specific fallback descriptions - used when API key missing or fails
const FALLBACK_DESCRIPTIONS: Record<string, string[]> = {
  kids: [
    'Soft organic cotton with gentle stretch. A darling piece for little ones, crafted with comfort in mind.',
    'Breathable muslin in a sweet print. Perfect for warm days and precious moments.',
    'Cozy bamboo blend with snap closures. Thoughtfully designed for easy dressing and all-day comfort.',
    'Pure cotton jersey with playful details. Gentle on delicate skin, built for everyday adventures.',
    'Organic knit with a touch of whimsy. Soft, snuggly, and made for little explorers.',
    'Lightweight cotton with charming florals. Airy comfort for your littlest love.',
    'Natural fiber blend with sweet ruffles. Delightfully soft for those precious early years.',
    'Breathable organic weave with easy closures. Comfort meets darling style.',
  ],
  fashion: [
    'Flowing linen with a relaxed silhouette. Effortlessly elegant from morning coffee to sunset drinks.',
    'Soft cotton with beautiful drape. A versatile piece that moves with you through the day.',
    'Refined crepe in a flattering cut. Timeless femininity for the modern woman.',
    'Luxe modal blend with understated elegance. Easy to style, impossible to ignore.',
    'Textured cotton with thoughtful details. A wardrobe essential with elevated appeal.',
    'Flowing viscose with gentle movement. Feminine grace for every occasion.',
    'Premium linen-cotton blend. Relaxed sophistication that transitions seamlessly day to night.',
    'Soft jersey with a modern silhouette. Effortless style meets all-day comfort.',
  ],
  furniture: [
    'Crafted from solid oak with Nordic precision. A timeless silhouette that anchors any room with quiet sophistication.',
    'Hand-finished walnut meets minimalist design. This piece embodies the art of intentional living.',
    'Natural rattan woven by artisan hands. Earthy texture meets refined simplicity.',
    'Solid wood construction with linen upholstery. Scandinavian elegance, effortlessly refined.',
    'Sustainably sourced hardwood with organic curves. A grounding presence for modern spaces.',
    'Matte oak finish with handwoven natural fibers. Nordic craftsmanship at its finest.',
    'Warm walnut tones paired with cream linen. Sophisticated simplicity for curated interiors.',
    'Natural beechwood with soft organic lines. Minimalist form, maximum presence.',
    'Solid ash construction with earthy undertones. Built for those who appreciate lasting beauty.',
    'Artisan-crafted from sustainable teak. A serene addition to any thoughtfully designed space.',
  ],
  decor: [
    'Hand-thrown ceramic with organic glaze. An artisan touch for curated spaces.',
    'Woven seagrass with natural variations. Earthy texture that grounds any room.',
    'Handwoven linen with subtle texture. A collected piece for intentional living.',
    'Natural rattan with artisan craftsmanship. Warm, organic, and effortlessly stylish.',
    'Textured stoneware with matte finish. Understated elegance for the modern home.',
  ],
  default: [
    'Thoughtfully designed with quality materials. A timeless addition to any space.',
    'Crafted with care and attention to detail. Understated elegance for everyday life.',
    'Premium materials meet refined design. Built for those who appreciate lasting quality.',
  ],
};

// Helper to get random fallback for a collection
const getCollectionFallback = (collection: string): string => {
  const descriptions = FALLBACK_DESCRIPTIONS[collection] || FALLBACK_DESCRIPTIONS.default;
  return descriptions[Math.floor(Math.random() * descriptions.length)];
};


// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT-AWARE AI ENHANCEMENT (V2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Full product context for AI generation
 */
export interface ProductContext {
  originalName: string;
  originalDescription: string;
  category: string;
  collection: string;
  keywords?: string[];
  priceRange?: 'budget' | 'mid' | 'premium';
}

/**
 * Extract meaningful keywords from product text
 */
export const extractKeywords = (text: string): string[] => {
  if (!text) return [];
  const lowerText = text.toLowerCase();
  const keywords: string[] = [];

  // Material patterns
  const materials = lowerText.match(/\b(cotton|linen|silk|velvet|denim|wool|polyester|chiffon|satin|muslin|organic|bamboo|cashmere|fleece|knit|woven|rattan|oak|walnut|wood|leather|suede)\b/gi);
  if (materials) keywords.push(...materials);

  // Style patterns
  const styles = lowerText.match(/\b(floral|striped|solid|printed|embroidered|lace|ruffle|pleated|vintage|boho|minimalist|modern|classic|elegant|casual|formal)\b/gi);
  if (styles) keywords.push(...styles);

  // Season/occasion patterns
  const occasions = lowerText.match(/\b(summer|winter|spring|fall|autumn|party|wedding|beach|office|everyday|holiday|festive)\b/gi);
  if (occasions) keywords.push(...occasions);

  // Clothing-specific patterns
  const clothing = lowerText.match(/\b(dress|romper|onesie|bodysuit|jumpsuit|blouse|top|shirt|pants|skirt|shorts|jacket|cardigan|sweater|coat)\b/gi);
  if (clothing) keywords.push(...clothing);

  // Age/demographic patterns
  const demographics = lowerText.match(/\b(baby|infant|toddler|kids|children|girls|boys|newborn|0-3m|3-6m|6-12m|1-2y|2-3y)\b/gi);
  if (demographics) keywords.push(...demographics);

  // Unique and deduplicate
  return [...new Set(keywords.map(k => k.toLowerCase()))];
};

/**
 * Collection-specific prompt templates
 */
const COLLECTION_PROMPTS: Record<string, { materials: string; vocabulary: string; examples: string }> = {
  kids: {
    materials: `
      MATERIALS TO MENTION (pick 1-2):
      - Organic cotton, soft muslin, gentle bamboo
      - Cozy fleece, breathable knit, natural fibers
      - Hypoallergenic fabrics, OEKO-TEX certified materials
    `,
    vocabulary: `
      VOCABULARY:
      - Soft, cozy, gentle, snuggly, sweet, precious
      - Playful, whimsical, darling, charming
      - Breathable, comfortable, easy-care, durable
      - Thoughtfully designed, lovingly crafted
    `,
    examples: `
      EXAMPLES:
      - "Soft organic cotton with gentle stretch. A darling piece for little ones, crafted with comfort in mind."
      - "Breathable muslin in a sweet floral print. Perfect for warm days and precious moments."
      - "Cozy bamboo blend with snap closures. Thoughtfully designed for easy dressing and all-day comfort."
    `
  },
  fashion: {
    materials: `
      MATERIALS TO MENTION (pick 1-2):
      - Flowing linen, soft cotton, luxe silk blend
      - Textured crepe, elegant chiffon, refined satin
      - Premium modal, organic cotton, sustainable viscose
    `,
    vocabulary: `
      VOCABULARY:
      - Effortless, flattering, versatile, elevated
      - Timeless, feminine, refined, graceful
      - Drape, silhouette, movement, flow
      - Day-to-night, easily styled, wardrobe essential
    `,
    examples: `
      EXAMPLES:
      - "Flowing linen with a relaxed silhouette. Effortlessly elegant from morning coffee to sunset drinks."
      - "Soft cotton with beautiful drape. A versatile piece that moves with you through the day."
      - "Refined crepe in a flattering cut. Timeless femininity for the modern woman."
    `
  },
  furniture: {
    materials: `
      MATERIALS TO MENTION (pick 1-2):
      - Solid oak, walnut, ash, beechwood, teak
      - Natural rattan, handwoven fibers, cane
      - Premium linen, organic cotton, bouclé upholstery
    `,
    vocabulary: `
      VOCABULARY:
      - Nordic, Scandinavian, minimalist, curated
      - Artisan-crafted, hand-finished, sustainably sourced
      - Timeless, refined, grounding, serene, intentional
    `,
    examples: `
      EXAMPLES:
      - "Solid walnut with hand-rubbed finish. Nordic restraint meets lasting craftsmanship."
      - "Artisan-woven rattan on a sustainably sourced ash frame. A grounding presence for curated spaces."
      - "Premium bouclé over solid oak construction. Scandinavian elegance, effortlessly refined."
    `
  },
  decor: {
    materials: `
      MATERIALS TO MENTION (pick 1-2):
      - Hand-thrown ceramic, artisan stoneware
      - Natural rattan, woven seagrass, jute
      - Linen, cotton, handwoven textiles
    `,
    vocabulary: `
      VOCABULARY:
      - Textured, organic, earthy, grounding
      - Artisan, handcrafted, curated, collected
      - Ambient, serene, warm, inviting
    `,
    examples: `
      EXAMPLES:
      - "Hand-thrown ceramic with organic glaze. An artisan touch for curated spaces."
      - "Woven seagrass with natural variations. Earthy texture that grounds any room."
      - "Handwoven linen with subtle texture. A collected piece for intentional living."
    `
  }
};

// Helper function to generate fallback product name
const generateFallbackName = (originalName: string, collection: string): string => {
  const names = PRODUCT_NAME_INSPIRATIONS[collection as keyof typeof PRODUCT_NAME_INSPIRATIONS]
    || PRODUCT_NAME_INSPIRATIONS.default;
  const randomName = names[Math.floor(Math.random() * names.length)];

  // Try to extract a clean product type from the original name
  const lowerName = originalName.toLowerCase();
  let productType = 'Chair';

  // Find matching product type from our mappings
  for (const [keyword, cleanName] of Object.entries(PRODUCT_TYPE_MAPPINGS)) {
    if (lowerName.includes(keyword)) {
      productType = cleanName;
      break;
    }
  }

  // Return 2-3 word format: "Aurora Dining Chair" (no "The")
  return `${randomName} ${productType}`;
};

export const generateProductName = async (
  originalName: string,
  collection: string
): Promise<string> => {
  // Use fallback when no API key
  if (!apiKey) {
    return generateFallbackName(originalName, collection);
  }

  try {
    const model = 'gemini-2.0-flash';
    const ai = getAI();
    if (!ai) return generateFallbackName(originalName, collection);

    const systemInstruction = `
      You are the product naming specialist for "Louie Mae", a sophisticated, Nordic-inspired home & lifestyle brand.
      
      NAMING RULES (STRICT):
      1. Use a feminine first name: Aurora, Olivia, Hazel, Margot, Clara, Astrid, Linnea, Freya, Nora, Ingrid
      2. Format: "[Name] [Product Type]" - exactly 2-3 words total
      3. NO "The" prefix - just the name and type
      4. Product types: Dining Chair, Accent Chair, Console, Side Table, Buffet, Lounge Chair, Stool, Sofa, Bed, Dresser
      
      GOOD EXAMPLES:
      - "Aurora Dining Chair"
      - "Hazel Console"
      - "Margot Lounge Chair"
      - "Astrid Side Table"
      - "Linnea Stool"
      - "Freya Sofa"
      
      BAD EXAMPLES (NEVER USE):
      - "The Olivia Accent Chair" (has "The")
      - "Modern Nordic Wooden Chair" (too generic)
      - "Olivia Rattan Woven Accent Chair" (too long)
      
      Return ONLY the 2-3 word product name, nothing else.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `Original: "${originalName}" | Collection: ${collection} | Generate 2-3 word name.`,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    let result = response.text?.trim().replace(/^["']|["']$/g, '');
    // If AI returned empty or same as original, use fallback
    if (!result || result === originalName) {
      return generateFallbackName(originalName, collection);
    }
    // Remove "The" if AI added it anyway
    result = result.replace(/^The\s+/i, '');
    return result;
  } catch (error) {
    console.error("Gemini Product Name Error:", error);
    // Use fallback on error (API quota, network issues, etc.)
    return generateFallbackName(originalName, collection);
  }
};

export const generateProductDescription = async (
  productName: string,
  category: string,
  collection: string
): Promise<string> => {
  // Collection-aware fallback
  const getRandomFallback = () => getCollectionFallback(collection);

  if (!apiKey) {
    console.warn('[AI Fallback] No API key configured - using collection fallback for:', collection);
    return getRandomFallback();
  }

  try {
    const model = 'gemini-2.0-flash';
    const ai = getAI();
    if (!ai) return getRandomFallback();

    const systemInstruction = `
      You are the copywriter for "Louie Mae", a sophisticated, Nordic-inspired luxury home brand.
      
      HIGH-END MATERIALS TO MENTION (pick 1-2):
      - Solid oak, walnut, ash, beechwood, teak
      - Natural rattan, handwoven fibers
      - Premium linen, organic cotton, bouclé
      - Sustainable hardwood, FSC-certified wood
      
      SOPHISTICATED VOCABULARY:
      - Nordic, Scandinavian, minimalist, curated, intentional
      - Artisan-crafted, hand-finished, sustainably sourced
      - Timeless, refined, grounding, serene, effortless
      
      STRICT RULES:
      1. Exactly 1-2 sentences (25-40 words)
      2. MUST mention a specific high-end material (oak, walnut, linen, etc.)
      3. MUST include one sophisticated descriptor (Nordic, minimalist, artisan)
      4. Focus on craftsmanship and the feeling it creates
      5. NO generic phrases: "high quality", "beautiful design", "perfect for"
      6. Each description should feel UNIQUE - vary sentence structure and word choice
      
      VARIETY EXAMPLES:
      - "Solid walnut with hand-rubbed finish. Nordic restraint meets lasting craftsmanship."
      - "Artisan-woven rattan on a sustainably sourced ash frame. A grounding presence for curated spaces."
      - "Premium bouclé over solid oak construction. Scandinavian elegance, effortlessly refined."
      - "Hand-finished beechwood with organic curves. Minimalist form that speaks to intentional living."
      
      Return ONLY the description, no quotes.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `"${productName}" | ${category} | ${collection} collection. Write unique, sophisticated description.`,
      config: {
        systemInstruction,
        temperature: 0.85, // Higher for more variety
      }
    });

    return response.text?.trim() || getRandomFallback();
  } catch (error) {
    console.error("Gemini Product Description Error:", error);
    console.warn('[AI Fallback] API error - using collection fallback for:', collection);
    return getRandomFallback();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT-AWARE GENERATION (V2 - Uses full product data)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a boutique-style product name using full product context
 */
export const generateProductNameV2 = async (context: ProductContext): Promise<string> => {
  if (!apiKey) {
    return generateFallbackName(context.originalName, context.collection);
  }

  try {
    const model = 'gemini-2.0-flash';
    const ai = getAI();
    if (!ai) return generateFallbackName(context.originalName, context.collection);

    // Determine product type from context
    const productType = detectProductType(context);
    const keywords = context.keywords || extractKeywords(context.originalName + ' ' + context.originalDescription);

    // Choose name style based on collection
    let nameStyle = '';
    if (context.collection === 'kids') {
      nameStyle = 'playful, sweet, whimsical (Poppy, Birdie, Rosie, Clementine, Meadow)';
    } else if (context.collection === 'fashion') {
      nameStyle = 'elegant, nature-inspired (Sienna, Willow, Maeve, Ivy, Wren)';
    } else {
      nameStyle = 'Nordic, feminine (Astrid, Linnea, Freya, Clara, Nora)';
    }

    const systemInstruction = `
      You are the product naming specialist for "Louie Mae", a sophisticated lifestyle brand.
      
      PRODUCT ANALYSIS:
      - Original Name: "${context.originalName}"
      - Detected Type: ${productType}
      - Keywords Found: ${keywords.join(', ') || 'none'}
      - Collection: ${context.collection}
      
      NAME STYLE FOR THIS COLLECTION: ${nameStyle}
      
      STRICT RULES:
      1. Use a single feminine first name + product type (2-3 words total)
      2. NO "The" prefix
      3. Match the name to the product type:
         - For baby/kids items: "Poppy Romper", "Birdie Dress", "Rosie Onesie"
         - For fashion items: "Sienna Blouse", "Willow Dress", "Maeve Top"
         - For furniture: "Astrid Chair", "Linnea Console", "Freya Sofa"
      4. The product type must match what the item actually is
      
      Return ONLY the 2-3 word name, nothing else.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `Generate boutique name for this ${context.collection} item.`,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    let result = response.text?.trim().replace(/^["']|["']$/g, '');
    if (!result || result === context.originalName) {
      return generateFallbackName(context.originalName, context.collection);
    }
    result = result.replace(/^The\s+/i, '');
    return result;
  } catch (error) {
    console.error("Gemini Product Name V2 Error:", error);
    return generateFallbackName(context.originalName, context.collection);
  }
};

/**
 * Generate a sophisticated product description using full product context
 */
export const generateProductDescriptionV2 = async (context: ProductContext): Promise<string> => {
  // Collection-aware fallback using the shared helper
  const getFallback = () => {
    console.warn('[AI Fallback V2] Using collection fallback for:', context.collection);
    return getCollectionFallback(context.collection);
  };

  if (!apiKey) {
    console.warn('[AI Fallback V2] No API key configured');
    return getFallback();
  }

  try {
    const model = 'gemini-2.0-flash';
    const ai = getAI();
    if (!ai) return getFallback();

    const keywords = context.keywords || extractKeywords(context.originalName + ' ' + context.originalDescription);
    const prompts = COLLECTION_PROMPTS[context.collection] || COLLECTION_PROMPTS.furniture;
    const productType = detectProductType(context);

    const systemInstruction = `
      You are the copywriter for "Louie Mae", a sophisticated lifestyle brand.
      
      PRODUCT TO DESCRIBE:
      - Name: "${context.originalName}"
      - Type: ${productType}
      - Collection: ${context.collection}
      - Keywords from source: ${keywords.join(', ') || 'none'}
      - Original description hints: "${context.originalDescription?.slice(0, 200) || 'none'}"
      
      ${prompts.materials}
      ${prompts.vocabulary}
      
      STRICT RULES:
      1. Exactly 1-2 sentences (25-40 words)
      2. MUST be relevant to the actual product type (${productType})
      3. If it's clothing: focus on fabric, fit, comfort, style
      4. If it's baby/kids: focus on softness, comfort, easy-care, sweetness
      5. If it's furniture: focus on materials, craftsmanship, presence
      6. Use keywords found in the product data when applicable
      7. NO generic phrases: "high quality", "beautiful design", "perfect for"
      
      ${prompts.examples}
      
      Return ONLY the description, no quotes.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `Write a boutique description for this ${productType}.`,
      config: {
        systemInstruction,
        temperature: 0.85,
      }
    });

    return response.text?.trim() || getFallback();
  } catch (error) {
    console.error("Gemini Product Description V2 Error:", error);
    return getFallback();
  }
};

/**
 * Detect product type from context
 */
const detectProductType = (context: ProductContext): string => {
  const text = (context.originalName + ' ' + context.originalDescription + ' ' + context.category).toLowerCase();

  // Baby/Kids clothing
  if (/romper|onesie|bodysuit|baby|infant|newborn/i.test(text)) return 'baby romper/bodysuit';
  if (/toddler|kids|children|girl|boy/i.test(text) && /dress|top|pants|skirt|shorts/i.test(text)) {
    return 'kids clothing';
  }

  // Women's fashion
  if (/dress/i.test(text) && !/kids|baby|girl/i.test(text)) return 'women\'s dress';
  if (/blouse|top/i.test(text)) return 'blouse/top';
  if (/pants|trousers/i.test(text)) return 'pants';
  if (/skirt/i.test(text)) return 'skirt';
  if (/jumpsuit/i.test(text)) return 'jumpsuit';
  if (/cardigan|sweater/i.test(text)) return 'knitwear';

  // Furniture
  if (/chair|seat/i.test(text)) return 'chair';
  if (/table|desk/i.test(text)) return 'table';
  if (/sofa|couch/i.test(text)) return 'sofa';
  if (/cabinet|buffet|sideboard/i.test(text)) return 'storage furniture';
  if (/bed/i.test(text)) return 'bed';

  // Decor
  if (/vase|planter|pot/i.test(text)) return 'vessel/planter';
  if (/basket|storage/i.test(text)) return 'basket';
  if (/lamp|light/i.test(text)) return 'lighting';
  if (/rug|carpet/i.test(text)) return 'rug';
  if (/mirror/i.test(text)) return 'mirror';

  // Default based on collection
  if (context.collection === 'kids') return 'kids item';
  if (context.collection === 'fashion') return 'fashion item';
  if (context.collection === 'furniture') return 'furniture piece';
  return 'home item';
};

// --- Newsletter AI Functions ---

export const generateEmailSubject = async (topic: string): Promise<string[]> => {
  if (!apiKey) return ["New from Louie Mae", "Discover our latest collection", "A note from Monica"];

  try {
    const model = 'gemini-3-flash-preview';
    const systemInstruction = `
      You are an expert email copywriter for "Louie Mae" (High-end, earthy, timeless lifestyle brand).
      Generate 3 distinct email subject lines for the provided topic.
      
      Style Guide:
      - Elegant, intriguing, minimal.
      - Avoid all-caps, excessive emojis, or "salesy" spam words.
      - Lowercase aesthetic is acceptable.
      - Focus on emotion, story, or exclusivity.
      
      Output Format: Return valid JSON array of strings. Example: ["Subject 1", "Subject 2", "Subject 3"]
    `;

    const ai = getAI();
    if (!ai) return [];
    const response = await ai.models.generateContent({
      model,
      contents: `Topic: ${topic}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Subject Gen Error:", error);
    return [];
  }
};

export const generateEmailBody = async (topic: string, type: 'newsletter' | 'promotion' | 'update'): Promise<string> => {
  if (!apiKey) return "";

  try {
    const model = 'gemini-3-flash-preview';
    const systemInstruction = `
      You are the lead editor for "Louie Mae". Write an email body for the given topic.
      
      Brand Voice:
      - Warm, personal (like a letter from a friend).
      - Sophisticated but grounded.
      - Mentions "timeless artistry" or "curated living" where appropriate.
      
      Formatting:
      - Use simple HTML tags (<p>, <br>, <strong>). 
      - Keep paragraphs short.
      - End with a sign-off: "Warmly, Monica".
    `;

    const ai = getAI();
    if (!ai) return "";
    const response = await ai.models.generateContent({
      model,
      contents: `Write a ${type} email about: ${topic}`,
      config: { systemInstruction }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Body Gen Error:", error);
    return "";
  }
};

export const personalizeTemplate = async (templateId: string, topic: string, objective: string): Promise<any> => {
  if (!apiKey) return {
    introduction: "Welcome to our latest update.",
    main_content: "We have some exciting news to share with you.",
    conclusion: "Thank you for being part of our journey.",
    quote: "Simplicity is the ultimate sophistication.",
    // Showcase fallbacks
    collection_title: topic || "New Collection",
    description: "Discover our latest arrivals, curated just for you.",
    // Exclusive fallbacks
    discount: "20% OFF",
    sale_title: topic || "Exclusive Access",
    details: "Shop our private sale for a limited time."
  };

  try {
    const model = 'gemini-1.5-flash';
    const placeholders = templateId === 'minimalist'
      ? ['introduction', 'main_content', 'quote', 'conclusion']
      : templateId === 'showcase'
        ? ['collection_title', 'description']
        : ['discount', 'sale_title', 'details'];

    const systemInstruction = `
      You are an expert copywriter for "Louie Mae" (High-end, earthy, timeless brand).
      Your task is to generate content for an email template based on a topic.
      
      Template Type: ${templateId}
      Topic: ${topic}
      Objective: ${objective}
      
      Required Output (JSON):
      Return a JSON object with the following keys: ${placeholders.join(', ')}.
      
      Style Guide:
      - Tone: Sophisticated, warm, minimalist.
      - avoid "Hey there", usage of emojis, or salesy exclamation marks!!!
      - For 'discount', return something like "20% OFF" or "PRIVATE SALE".
    `;

    const ai = getAI();
    if (!ai) return {};
    const response = await ai.models.generateContent({
      model,
      contents: `Generate content for ${topic}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Template Personalization Error:", error);
    return {};
  }
};
