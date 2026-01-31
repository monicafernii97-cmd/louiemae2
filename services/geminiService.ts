
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

// Varied fallback descriptions - sophisticated, high-end materials
const FALLBACK_DESCRIPTIONS = [
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
];

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
  // Random fallback for variety
  const getRandomFallback = () => FALLBACK_DESCRIPTIONS[Math.floor(Math.random() * FALLBACK_DESCRIPTIONS.length)];

  if (!apiKey) return getRandomFallback();

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
    return getRandomFallback();
  }
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
