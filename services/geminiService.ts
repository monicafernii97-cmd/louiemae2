
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
  'shirt': 'Shirt',
  'tee': 'Tee',
  't-shirt': 'Tee',
  'skirt': 'Skirt',
  'pants': 'Trousers',
  'jeans': 'Jeans',
  'denim': 'Jeans',
  'shorts': 'Shorts',
  'romper': 'Romper',
  'jumpsuit': 'Jumpsuit',
  'bodysuit': 'Bodysuit',
  'onesie': 'Onesie',
  'cardigan': 'Cardigan',
  'sweater': 'Sweater',
  'hoodie': 'Hoodie',
  'jacket': 'Jacket',
  'coat': 'Coat',
  'blazer': 'Blazer',
  'vest': 'Vest',
  'scarf': 'Scarf',
  'hat': 'Hat',
  'bag': 'Bag',
  'purse': 'Handbag',
  'handbag': 'Handbag',
  'shoe': 'Shoes',
  'sneaker': 'Sneakers',
  'sandal': 'Sandals',
  'boot': 'Boots',
  'jogger': 'Joggers',
  'legging': 'Leggings',
  'bikini': 'Swimwear',
  'swimsuit': 'Swimwear',
};

// Collection-specific fallback descriptions - used when API key missing or fails
// Expanded to 15-20 per collection for maximum variety
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
    'Buttery-soft cotton in a cheerful print. Easy-care fabric for busy little ones.',
    'Gentle muslin with adorable embroidery. Softness your baby will love.',
    'Hypoallergenic cotton blend with stretchy comfort. Perfect for sensitive skin.',
    'Light and airy linen-cotton mix. Keeps little ones cool and comfortable.',
    'Eco-friendly bamboo fabric with playful details. Sustainable softness for growing kids.',
    'Premium organic jersey with reinforced seams. Built for play, soft enough for naps.',
    'Sweet gingham cotton with functional snaps. Classic charm meets modern convenience.',
    'Silky-soft modal blend in darling prints. Luxuriously gentle against delicate skin.',
    'Natural cotton with whimsical appliqué details. A keepsake piece for precious years.',
    'Breathable cotton gauze with tender touches. Dreamy comfort for your little one.',
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
    'Airy chiffon layers with subtle shimmer. Romantic elegance for special moments.',
    'Structured cotton with artful pleating. Polished refinement for the discerning dresser.',
    'Silky satin finish with graceful lines. Understated glamour for evening occasions.',
    'Organic cotton with bohemian flair. Free-spirited style rooted in quality.',
    'Lightweight wool blend with refined tailoring. Timeless polish for cooler days.',
    'Soft knit with flattering stretch. Sculpted comfort that hugs in all the right places.',
    'Delicate lace overlay with modern edge. Romantic yet contemporary femininity.',
    'Breathable rayon with fluid movement. Effortless drape for endless versatility.',
    'Premium ponte with structured elegance. All-day comfort without sacrificing style.',
    'Washed silk with lived-in softness. Luxe fabric meets relaxed sophistication.',
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
    'Premium maple with hand-rubbed oil finish. Understated luxury for everyday living.',
    'Reclaimed wood with character and story. Sustainable charm meets timeless appeal.',
    'Solid cherry with traditional joinery. Heirloom quality built to last generations.',
    'Light birch with Scandinavian restraint. Airy simplicity for modern homes.',
    'FSC-certified oak with bouclé upholstery. Conscious craftsmanship meets cozy comfort.',
    'Hand-turned legs with premium velvet seat. Classic silhouette, contemporary comfort.',
    'Sleek acacia with brass-finished details. Refined warmth for curated spaces.',
    'Natural cane weaving on solid mahogany frame. Colonial elegance reimagined.',
  ],
  decor: [
    'Hand-thrown ceramic with organic glaze. An artisan touch for curated spaces.',
    'Woven seagrass with natural variations. Earthy texture that grounds any room.',
    'Handwoven linen with subtle texture. A collected piece for intentional living.',
    'Natural rattan with artisan craftsmanship. Warm, organic, and effortlessly stylish.',
    'Textured stoneware with matte finish. Understated elegance for the modern home.',
    'Sculpted terracotta with rustic charm. Mediterranean warmth for any interior.',
    'Hand-blown glass with delicate bubbles. Light-catching beauty for sunlit spaces.',
    'Woven jute with boho character. Natural texture that adds instant warmth.',
    'Brushed brass with aged patina. Timeless metalwork with storied appeal.',
    'Handcrafted wood with live edge detail. Nature\'s artistry brought indoors.',
    'Macramé cotton with intricate knotwork. Bohemian craft meets modern minimalism.',
    'Marble composite with subtle veining. Luxurious weight and timeless beauty.',
    'Hand-painted ceramic in muted tones. Artisan-made with visible brushstrokes.',
    'Natural cork with contemporary form. Sustainable material meets modern design.',
    'Wicker basket with leather handles. Functional beauty for organized spaces.',
  ],
  default: [
    'Thoughtfully designed with quality materials. A timeless addition to any space.',
    'Crafted with care and attention to detail. Understated elegance for everyday life.',
    'Premium materials meet refined design. Built for those who appreciate lasting quality.',
    'Artisan-made with sustainable practices. Beauty that feels good to own.',
    'Clean lines with considered proportions. Modern simplicity at its finest.',
    'Natural materials with organic appeal. Earthy sophistication for curated homes.',
    'Handcrafted details with modern sensibility. Traditional craft meets contemporary style.',
    'Timeless design with enduring quality. A piece you\'ll treasure for years.',
  ],
};

// Category-specific fallback descriptions for more tailored content
// Used when AI quota is reached - provides descriptions that match the specific product category
const CATEGORY_FALLBACK_DESCRIPTIONS: Record<string, string[]> = {
  // Girls Clothing Categories
  'Girls Layers': [
    'Cozy knit with button details. A sweet layer for little ones, perfect for chilly mornings and cozy afternoons.',
    'Soft fleece cardigan with darling embroidery. The perfect sweater to layer over any outfit.',
    'Lightweight cotton sweater in muted tones. Easy layering for your little lady.',
    'Buttery-soft knit with raglan sleeves. Warmth and style for everyday adventures.',
    'Gentle cotton blend with snap buttons. Sweet enough for special occasions, cozy enough for everyday.',
  ],
  'Girls Dresses': [
    'Twirl-worthy cotton dress with delicate details. A sweet piece for any occasion.',
    'Soft muslin with gentle gathers. Pretty and practical for playful days.',
    'Floral cotton with flutter sleeves. Effortlessly charming for your little one.',
    'Organic cotton dress with dreamy details. A timeless piece for precious moments.',
    'Light and airy with vintage-inspired design. Perfect from playdates to portraits.',
  ],
  'Girls Rompers': [
    'Soft cotton romper with snap closures. Easy dressing meets adorable style.',
    'Breathable muslin romper with playful print. Perfect for warm-weather adventures.',
    'Organic cotton with gentle stretch. Comfortable and cute for active little ones.',
    'Lightweight romper with adjustable straps. Summer-ready and endlessly sweet.',
  ],
  'Girls Tops': [
    'Soft cotton top with sweet details. A wardrobe essential for little ladies.',
    'Breathable knit with playful print. Comfortable and easy to mix and match.',
    'Gentle ruffle trim on soft cotton. Pretty everyday style for your little one.',
    'Organic cotton tee with whimsical design. Soft, sweet, and made for play.',
  ],
  'Girls Bottoms': [
    'Stretchy cotton blend for all-day comfort. Easy to move, easy to style.',
    'Soft knit with gentle elastic waist. Comfort and style for active little ones.',
    'Breathable cotton with playful details. Perfect for everyday adventures.',
  ],
  'Girls Leggings': [
    'Buttery-soft cotton with gentle stretch. Comfortable from morning to bedtime.',
    'Organic cotton leggings with cozy fit. A wardrobe staple for little ladies.',
    'Lightweight knit with fun prints. Easy to pair with any top.',
  ],
  'Girls Outfits & Sets': [
    'Coordinated cotton set with sweet details. Mix-and-match style made easy.',
    'Matching pieces in soft organic cotton. Effortless dressing for any occasion.',
    'Thoughtfully designed set with playful prints. Sweet from head to toe.',
  ],
  'Girls Footwear': [
    'Soft-soled design for little feet. Sweet style meets barefoot comfort.',
    'Gentle materials with secure fastenings. Perfect for first steps and beyond.',
  ],

  // Boys Clothing Categories
  'Boys Layers': [
    'Cozy fleece pullover with easy closures. Built for active adventures.',
    'Soft cotton hoodie with kangaroo pocket. Comfort and style for little guys.',
    'Lightweight knit cardigan in classic tones. Easy layering for any occasion.',
    'Warm cotton sweatshirt with sturdy details. Made for play, soft enough for naps.',
    'Zip-up jacket in brushed cotton. Quick on, quick off for busy boys.',
  ],
  'Boys Tops': [
    'Soft cotton tee with playful graphic. Comfortable and easy-care for everyday.',
    'Breathable henley with heritage style. Classic comfort for little gentlemen.',
    'Organic cotton polo with modern fit. Polished enough for any occasion.',
    'Jersey knit with reinforced seams. Built for adventures, soft against skin.',
  ],
  'Boys Bottoms': [
    'Durable cotton with stretchy comfort. Made for climbing, running, and exploring.',
    'Soft joggers with elastic waist. Easy to dress, easy to play.',
    'Classic cotton pants with adjustable fit. Comfort meets timeless style.',
  ],
  'Boys Shorts': [
    'Lightweight cotton shorts for active days. Cool comfort for warm weather.',
    'Soft knit with secure pockets. Ready for summer adventures.',
  ],
  'Boys Pants': [
    'Durable cotton twill with gentle stretch. Built for active boys who love to explore.',
    'Soft chinos with adjustable waist. Classic style for little gentlemen.',
  ],
  'Boys Joggers': [
    'Cozy fleece joggers with tapered fit. Comfort for play and rest.',
    'Soft cotton joggers with stretchy cuffs. Easy movement for active days.',
  ],
  'Boys Outfits & Sets': [
    'Coordinated cotton set in classic style. Easy dressing for little guys.',
    'Matching pieces with playful details. From playdates to picture day.',
  ],
  'Boys Overalls': [
    'Classic denim overalls with adjustable straps. Timeless style for little ones.',
    'Soft cotton overalls with easy closures. Perfect for everyday adventures.',
  ],
  'Boys Footwear': [
    'Durable design with flexible soles. Built for active little explorers.',
    'Soft materials with secure fit. Comfort and support for growing feet.',
  ],

  // Furniture Categories
  'Accent Chairs': [
    'Artisan-crafted with premium upholstery. A statement piece for curated corners.',
    'Solid hardwood frame with bouclé seat. Nordic elegance, perfect proportions.',
    'Hand-finished with organic curves. Sculptural comfort for intentional spaces.',
  ],
  'Dining Chairs': [
    'Solid oak with handwoven detail. Scandinavian craftsmanship for gathering spaces.',
    'Premium hardwood with ergonomic design. Where comfort meets the dinner table.',
    'Natural materials with artisan finish. Built for generations of gatherings.',
  ],
  'Side Storage Cabinets': [
    'Solid wood construction with artisan details. Functional beauty for every room.',
    'Hand-finished with natural textures. Storage that tells a story.',
  ],
  'Barstools': [
    'Solid oak with woven seat. Counter-height comfort with Nordic charm.',
    'Premium hardwood with footrest detail. Elevated seating for kitchen gatherings.',
  ],
  'Counterstools': [
    'Artisan-crafted with comfortable proportions. Perfect height for morning coffee.',
    'Natural materials meet modern design. Counter seating with character.',
  ],
  'Dining Tables': [
    'Solid hardwood with hand-rubbed finish. The heart of every gathering.',
    'Sustainably sourced wood with timeless design. Built for generations of memories.',
  ],
  'Nightstands': [
    'Compact design with thoughtful storage. Bedside beauty meets function.',
    'Hand-finished wood with clean lines. The perfect nighttime companion.',
  ],
  'Nursery Furniture': [
    'Crafted with little ones in mind. Safe, beautiful, and built to last.',
    'Sustainably sourced wood with gentle curves. Timeless pieces for the nursery.',
  ],
  'Playroom Furniture': [
    'Kid-friendly design with grown-up style. Built for play, designed for beauty.',
    'Durable construction meets playful design. Furniture that grows with them.',
  ],

  // Decor Categories
  'Vases': [
    'Hand-thrown ceramic with organic glaze. An artisan touch for fresh blooms.',
    'Sculptural form with matte finish. Beauty with or without flowers.',
  ],
  'Table Lamps': [
    'Warm glow with artisan base. Ambient light for curated corners.',
    'Natural materials with soft illumination. Lighting that sets the mood.',
  ],
  'Floor Lamps': [
    'Statement lighting with sculptural presence. Ambient warmth for every space.',
    'Artisan design with adjustable shade. Light that works as hard as you do.',
  ],
  'Rugs': [
    'Hand-woven with natural fibers. Grounding texture for layered spaces.',
    'Organic materials with subtle pattern. Underfoot luxury for curated homes.',
  ],
  'Decor Items': [
    'Artisan-made with attention to detail. The finishing touch for thoughtful spaces.',
    'Natural materials with collected character. Decor that tells your story.',
  ],

  // Fashion Categories
  'Dresses': [
    'Flowing silhouette in premium fabric. Effortless elegance for any occasion.',
    'Flattering cut with feminine details. A dress that moves with you.',
  ],
  'Everyday Dresses': [
    'Soft cotton with relaxed fit. From morning coffee to evening plans.',
    'Breathable fabric with easy style. Your new everyday favorite.',
  ],
  'Formal Dresses': [
    'Elegant drape with refined details. Statement dressing for special moments.',
    'Sophisticated silhouette in luxe fabric. Dress to remember.',
  ],
  'Tops': [
    'Soft fabric with flattering fit. A versatile essential for any wardrobe.',
    'Breathable blend with modern details. Effortless style, endless possibilities.',
  ],
  'Blouses': [
    'Flowing fabric with feminine finish. Polished style for work and beyond.',
    'Light and airy with thoughtful details. The blouse you\'ll reach for daily.',
  ],
  'Casual Tops': [
    'Soft cotton with relaxed fit. Easy style for everyday moments.',
    'Comfortable blend with modern edge. Casual never looked this good.',
  ],
  'Bottoms': [
    'Flattering fit with quality fabric. The foundation of effortless style.',
    'Comfortable stretch with clean lines. Bottoms that work for you.',
  ],
  'Pants': [
    'Tailored fit with comfortable stretch. Polished style from desk to dinner.',
    'Premium fabric with modern silhouette. Pants that elevate any outfit.',
  ],
  'Skirts': [
    'Feminine flow with flattering fit. Movement and style in every step.',
    'Soft fabric with timeless design. The skirt you\'ll wear season after season.',
  ],
  'Denim': [
    'Premium denim with perfect stretch. The jeans you\'ve been searching for.',
    'Classic wash with modern fit. Denim that feels like home.',
  ],
  'Blazers': [
    'Structured silhouette with modern ease. Power dressing meets everyday style.',
    'Tailored fit with quality details. The blazer for all occasions.',
  ],
  'Layers': [
    'Lightweight knit with effortless drape. The perfect finishing layer.',
    'Soft cardigan with timeless appeal. Cozy elegance for cooler days.',
  ],
  'Blazers & Layers': [
    'Versatile layering with polished finish. Warmth and style combined.',
    'From boardroom to brunch. Layers that work as hard as you do.',
  ],
  'Active': [
    'Performance fabric with flattering fit. Move freely, look amazing.',
    'Breathable stretch with modern design. Active wear meets everyday style.',
  ],
  'Lounge': [
    'Ultra-soft fabric for relaxed moments. Comfort you\'ll never want to take off.',
    'Cozy blend with elevated style. Loungewear worth being seen in.',
  ],
  'Active & Lounge': [
    'From workout to weekend. Comfort and style without compromise.',
    'Soft stretch with versatile appeal. Rest and play in style.',
  ],
  'Outfits & Sets': [
    'Coordinated pieces with effortless style. Matching made easy.',
    'Curated set with endless options. Mix, match, and make it yours.',
  ],
  'Vacation Edit': [
    'Pack light, look amazing. Vacation-ready style that travels well.',
    'Breezy fabrics with destination appeal. Your getaway wardrobe, curated.',
  ],

  // Toys Category
  'Toys': [
    'Thoughtfully designed for imaginative play. Safe, beautiful, and built to inspire.',
    'Natural materials with playful design. Toys that spark creativity.',
    'Heirloom quality for hours of play. Made to be loved and passed down.',
  ],
};


// Helper to get fallback description - category-aware with collection fallback
// Ensures the returned description always meets the 3–5 sentence requirement
const getCategoryFallback = (collection: string, category?: string): string => {
  // Build the candidate pool — prefer category-specific, then collection-level
  let pool: string[] = [];
  if (category) {
    const categoryDescriptions = CATEGORY_FALLBACK_DESCRIPTIONS[category];
    if (categoryDescriptions && categoryDescriptions.length > 0) {
      console.log('[Fallback] Using category-specific description for:', category);
      pool = categoryDescriptions;
    }
  }
  if (pool.length === 0) {
    console.log('[Fallback] Using collection-level description for:', collection);
    pool = FALLBACK_DESCRIPTIONS[collection] || FALLBACK_DESCRIPTIONS.default;
  }

  // Pick a random entry
  let result = pool[Math.floor(Math.random() * pool.length)];

  // If the chosen entry is < 3 sentences, pad with collection-safe generic closers
  // (never append another full template — that can contradict material/style claims)
  const GENERIC_CLOSERS: Record<string, string[]> = {
    kids: [
      'Gentle enough for everyday wear.',
      'Easy to care for and built to last.',
      'A thoughtful addition to any little wardrobe.',
    ],
    fashion: [
      'A versatile addition to any wardrobe.',
      'Pairs beautifully with your favorite accessories.',
      'Designed to transition effortlessly from day to evening.',
    ],
    furniture: [
      'A timeless addition to any curated space.',
      'Built with care to last for years.',
      'Complements a wide range of interior styles.',
    ],
    decor: [
      'A finishing touch for thoughtfully designed spaces.',
      'Adds warmth and character to any room.',
      'Crafted with an eye for lasting beauty.',
    ],
    default: [
      'A thoughtful choice for intentional living.',
      'Designed with quality and longevity in mind.',
      'A beautiful addition to any collection.',
    ],
  };
  const countSentences = (t: string) => (t.match(/[.!?](\s|$)/g) || []).length;
  const closers = GENERIC_CLOSERS[collection] || GENERIC_CLOSERS.default;
  let closerIdx = 0;
  while (countSentences(result) < 3 && closerIdx < closers.length) {
    result = result + ' ' + closers[closerIdx];
    closerIdx++;
  }

  return result;
};

// Keep the old function name for backward compatibility
const getCollectionFallback = (collection: string): string => {
  return getCategoryFallback(collection);
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
  // Default product type based on collection — neutral defaults avoid misleading labels
  let productType = collection === 'fashion' ? 'Piece'
    : collection === 'kids' ? 'Item'
    : collection === 'decor' ? 'Accent'
    : collection === 'furniture' ? 'Piece'
    : 'Item';

  // Sort by keyword length descending so specific keys (t-shirt, handbag) match before generic (shirt, bag)
  // Allow optional trailing 's' so plurals like "chairs", "dresses", "boots" match singular keywords
  for (const [keyword, cleanName] of Object.entries(PRODUCT_TYPE_MAPPINGS).sort(
    ([a], [b]) => b.length - a.length
  )) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keywordRegex = new RegExp(`\\b${escaped}(?:e?s)?\\b`, 'i');
    if (keywordRegex.test(lowerName)) {
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

/** Validate that a description contains 3–5 sentences */
const isValidDescriptionLength = (text: string): boolean => {
  const sentenceCount = (text.match(/[.!?](\s|$)/g) || []).length;
  return sentenceCount >= 3 && sentenceCount <= 5;
};

export const generateProductDescription = async (
  productName: string,
  category: string,
  collection: string
): Promise<string> => {
  // Collection-aware fallback
  const getRandomFallback = () => getCategoryFallback(collection, category);

  if (!apiKey) {
    console.warn('[AI Fallback] No API key configured - using collection fallback for:', collection);
    return getRandomFallback();
  }

  try {
    const model = 'gemini-2.0-flash';
    const ai = getAI();
    if (!ai) return getRandomFallback();

    // Use collection-specific prompts instead of hardcoded furniture
    const prompts = COLLECTION_PROMPTS[collection] || COLLECTION_PROMPTS.furniture;

    const systemInstruction = `
      You are the copywriter for "Louie Mae", a sophisticated lifestyle brand selling furniture, home decor, fashion, and kids items.
      
      COLLECTION: ${collection}
      CATEGORY: ${category || 'general'}
      
      ${prompts.materials}
      ${prompts.vocabulary}
      
      STRICT RULES:
      1. Write 3-5 sentences arranged as a mini product listing:
         - Line 1: Opening hook — fabric/material + silhouette/form (1 sentence)
         - Line 2-3: Key features — "Great for [occasion]", fit details, notable design elements
         - Line 4: Practical detail — care/sizing hint OR dimension note for furniture
      2. MUST be relevant to the actual product ("${productName}")
      3. If it's clothing: focus on fabric, fit, style, occasions
      4. If it's furniture: focus on materials, dimensions feel, craftsmanship
      5. If it's kids: focus on softness, safety, easy-care, sweetness
      6. NO generic phrases: "high quality", "beautiful design"
      7. Each description should feel UNIQUE
      
      GOOD EXAMPLES:
      - Fashion: "Flowing linen blend with a relaxed silhouette that moves with you. Perfect for weekend brunches or effortless weekday style. Features a flattering waist detail and side pockets. Available in sizes XS-XL."
      - Furniture: "Solid oak frame with hand-rubbed walnut finish. Nordic-inspired lines bring a grounding presence to any room. Seat height 18in, perfect for dining. Sustainably sourced hardwood built to last."
      - Kids: "Buttery-soft organic cotton with snap closures for easy changes. Sweet floral print perfect for spring outings. Gentle on sensitive skin with OEKO-TEX certified fabric. Machine washable for busy parents."
      
      Return ONLY the description, no quotes or labels.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `Write a product description for "${productName}" in the ${collection} collection, category: ${category || 'general'}.`,
      config: {
        systemInstruction,
        temperature: 0.85,
      }
    });

    const candidate = response.text?.trim() || '';
    return candidate && isValidDescriptionLength(candidate)
      ? candidate
      : getRandomFallback();
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
/**
 * Generate a structured fallback description in Label · Detail format.
 * Used when AI is unavailable, quota-exceeded, or returns unstructured prose.
 */
const getStructuredFallback = (context: ProductContext): string => {
  const productType = detectProductType(context);
  const keywords = context.keywords || extractKeywords(context.originalName + ' ' + context.originalDescription);

  // Build opening sentence from product type
  const openingMap: Record<string, string[]> = {
    kids: [
      'Soft, cozy piece designed with little ones in mind.',
      'Gentle fabric crafted for comfort and easy dressing.',
      'Sweet, breathable piece for everyday adventures.',
    ],
    fashion: [
      'Effortless silhouette in a refined, versatile fabric.',
      'Flattering cut with timeless, feminine appeal.',
      'Flowing fabric with understated elegance.',
    ],
    furniture: [
      'Solid wood construction with artisan-quality finish.',
      'Hand-crafted piece with Nordic-inspired clean lines.',
      'Sustainably sourced materials with timeless presence.',
    ],
    decor: [
      'Artisan-made piece with natural, organic texture.',
      'Hand-crafted accent with earthy, curated appeal.',
      'Textured piece that adds warmth to any space.',
    ],
  };
  const openings = openingMap[context.collection] || openingMap.decor;
  const opening = openings[Math.floor(Math.random() * openings.length)];

  // Detect materials from keywords
  const materialKeywords = keywords.filter(k =>
    /cotton|linen|silk|wool|velvet|denim|muslin|bamboo|fleece|rattan|oak|walnut|wood|knit|woven|ceramic|leather/.test(k)
  );
  const styleKeywords = keywords.filter(k =>
    /floral|striped|embroidered|lace|ruffle|pleated|boho|minimalist|modern|vintage|classic/.test(k)
  );

  const lines = [opening];
  if (materialKeywords.length > 0) {
    lines.push(`Material · ${materialKeywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`);
  }
  if (styleKeywords.length > 0) {
    lines.push(`Style · ${styleKeywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`);
  }
  if (context.collection === 'kids') {
    lines.push('Care · Machine wash gentle, tumble dry low');
  } else if (context.collection === 'fashion') {
    lines.push('Care · Machine wash cold, hang dry');
  } else if (context.collection === 'furniture') {
    lines.push('Care · Wipe clean with a damp cloth');
  }

  return lines.join('\n');
};

export const generateProductDescriptionV2 = async (context: ProductContext): Promise<string> => {
  const getFallback = () => {
    console.warn('[AI Fallback V2] Using structured fallback for:', context.category, 'in', context.collection);
    return getStructuredFallback(context);
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
    const productType = detectProductType(context);

    // Determine which detail labels to request based on product type
    let detailLabels: string;
    if (['kids', 'fashion'].includes(context.collection) || /dress|romper|top|blouse|pants|skirt|jacket|cardigan|sweater|jumpsuit|bodysuit|onesie|clothing|fashion/i.test(productType)) {
      detailLabels = `
        Material · (e.g. "100% organic cotton" or "Linen-cotton blend")
        Fit · (e.g. "Relaxed fit" or "Slim through the body, flared hem")
        Style · (e.g. "Flutter sleeves with smocked bodice" or "Bohemian-inspired with ruffle trim")
        Details · (e.g. "Coconut shell buttons, side pockets" or "Snap closures for easy dressing")
        Care · (e.g. "Machine wash cold, tumble dry low")
        Sizing · (e.g. "Runs true to size, available XS–XL" or "Fits 6–12 months")
      `;
    } else if (context.collection === 'furniture' || /chair|table|sofa|bed|cabinet|desk|stool|bench|shelf|nightstand|dresser|buffet|sideboard|storage/i.test(productType)) {
      detailLabels = `
        Material · (e.g. "Solid white oak with hand-rubbed oil finish")
        Construction · (e.g. "Mortise and tenon joinery" or "Hand-woven rattan seat")
        Dimensions · (only include when explicit measurements exist in the source data)
        Style · (e.g. "Scandinavian minimalist with tapered legs")
        Details · (e.g. "Stackable design" or "Brass-finished hardware, soft-close drawers")
        Care · (e.g. "Wipe clean with damp cloth")
      `;
    } else {
      detailLabels = `
        Material · (primary material or composition)
        Style · (design aesthetic or visual details)
        Details · (functional features, closures, hardware)
        Dimensions · (only include when explicit measurements exist in the source data)
        Care · (maintenance or cleaning instructions)
      `;
    }

    const systemInstruction = `
      You are a product data writer for "Louie Mae", a modern boutique brand.

      YOUR TASK: Extract real product details from the source data below and present them
      as a clean, structured product listing. DO NOT invent information — only enhance
      what can be inferred from the product name, keywords, and source description.

      SOURCE DATA:
      - Product name: "${context.originalName}"
      - Product type: ${productType}
      - Collection: ${context.collection}
      - Extracted keywords: ${keywords.join(', ') || 'none detected'}
      - Source description: "${context.originalDescription?.slice(0, 500) || 'none provided'}"

      OUTPUT FORMAT — use this exact structure:
      Line 1: A single elegant opening sentence (10-20 words max) describing what the product IS.
      Then list each detail on its own line, using "Label · Detail" format:

      ${detailLabels}

      RULES:
      1. ONLY include lines where you have data or can confidently infer from the source. Skip lines you'd have to fabricate.
      2. Keep each line SHORT — max 15 words per line after the label.
      3. The opening sentence should be polished but grounded in data (mention the actual material or product type).
      4. Use clean, modern language — no generic marketing ("high quality", "beautiful design", "perfect for any occasion").
      5. For ${context.collection} products, prefer vocabulary like: ${
        context.collection === 'kids' ? 'soft, gentle, cozy, sweet, breathable, easy-care'
        : context.collection === 'fashion' ? 'effortless, flattering, flowing, refined, versatile'
        : context.collection === 'furniture' ? 'solid, artisan, Nordic, sustainably sourced, hand-finished'
        : 'textured, organic, artisan, handcrafted, curated'
      }
      6. Return ONLY the formatted description — no quotes, no headings, no markdown symbols.

      GOOD EXAMPLE (fashion):
      Flowing linen midi dress with a softly gathered waist.
      Material · 100% European linen
      Fit · Relaxed through the body, A-line skirt
      Style · Puff sleeves with elastic cuffs, V-neckline
      Details · Side pockets, coconut shell buttons
      Care · Machine wash cold, hang dry

      GOOD EXAMPLE (furniture):
      Solid oak dining chair with hand-woven paper cord seat.
      Material · FSC-certified white oak, natural paper cord
      Construction · Traditional mortise and tenon joinery
      Dimensions · W 20 × D 18 × H 31 in, seat height 18 in
      Style · Danish mid-century with tapered legs
      Care · Wipe with damp cloth, oil annually

      GOOD EXAMPLE (kids):
      Soft organic cotton romper with snap closures for easy changes.
      Material · 100% GOTS-certified organic cotton
      Fit · Relaxed with gentle stretch
      Style · Sweet floral print, flutter sleeves
      Details · Nickel-free snaps at inseam and back
      Care · Machine wash gentle, tumble dry low
      Sizing · Fits 3–6 months
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `Create a structured product listing for this ${productType}.`,
      config: {
        systemInstruction,
        temperature: 0.6, // Lower temp for more data-driven, less creative output
      }
    });

    const candidate = response.text?.trim() || '';
    // Validate: must have opening + at least one "Label · Detail" line
    const lines = candidate.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const hasStructuredDetail = lines.slice(1).some(line =>
      /^[A-Za-z][A-Za-z ]+\s[·•‧]\s\S+/.test(line)
    );
    return lines.length >= 2 && hasStructuredDetail
      ? candidate
      : getFallback();
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

// ═══════════════════════════════════════════════════════════════════════════
// VARIANT NAME TRANSLATION (Chinese → English)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if a string contains Chinese characters
 */
const containsChinese = (text: string): boolean => /[\u4e00-\u9fff]/.test(text);

/**
 * Batch-translate variant names from Chinese to English using Gemini.
 * Returns a map of original → translated names.
 * Falls back to originals if API unavailable or no Chinese detected.
 */
export const translateVariantNames = async (variantNames: string[]): Promise<Map<string, string>> => {
  const result = new Map<string, string>();

  // Filter to only names that actually contain Chinese
  const chineseNames = variantNames.filter(containsChinese);
  
  // If none contain Chinese, return as-is
  if (chineseNames.length === 0) {
    variantNames.forEach(n => { result.set(n, n); });
    return result;
  }

  // Set non-Chinese names to themselves
  variantNames.filter(n => !containsChinese(n)).forEach(n => { result.set(n, n); });

  if (!apiKey) {
    // No API key — return originals
    chineseNames.forEach(n => { result.set(n, n); });
    return result;
  }

  try {
    const ai = getAI();
    if (!ai) {
      chineseNames.forEach(n => { result.set(n, n); });
      return result;
    }

    const systemInstruction = `
      You are a product variant label translator. Translate Chinese product variant labels to English.
      
      RULES:
      1. Translate ONLY the Chinese text, keep numbers and symbols as-is
      2. Common translations: 颜色=Color, 尺码/尺寸=Size, 款式=Style, 材质=Material
      3. Return a JSON array of translated strings in the SAME ORDER as input
      4. Keep the "PropertyName: Value" format (e.g., "Color: Red / Size: S")
      5. If a value is already in English or is a number, keep it unchanged
      
      Example input: ["颜色: 红色 / 尺码: S", "颜色: 蓝色 / 尺码: M"]
      Example output: ["Color: Red / Size: S", "Color: Blue / Size: M"]
    `;

    const BATCH_SIZE = 40;
    for (let i = 0; i < chineseNames.length; i += BATCH_SIZE) {
      const batch = chineseNames.slice(i, i + BATCH_SIZE);
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `Translate these variant labels:\n${JSON.stringify(batch)}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        });

        const translated = JSON.parse(response.text || '[]');
        if (Array.isArray(translated) && translated.length === batch.length) {
          batch.forEach((original, idx) => {
            const value = translated[idx];
            result.set(
              original,
              typeof value === 'string' && value.trim() ? value.trim() : original
            );
          });
        } else {
          // Fallback if response shape is wrong for this batch
          batch.forEach(n => { result.set(n, n); });
        }
      } catch (batchError) {
        console.error('[translateVariantNames] Batch translation error:', batchError);
        batch.forEach(n => { result.set(n, n); });
      }
    }
  } catch (error) {
    console.error('[translateVariantNames] Translation error:', error);
    chineseNames.forEach(n => { result.set(n, n); });
  }

  return result;
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
