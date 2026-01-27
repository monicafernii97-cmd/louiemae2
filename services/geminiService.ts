
import { GoogleGenAI } from "@google/genai";
import { CustomPage } from "../types";

const apiKey = typeof process !== 'undefined' && process.env?.API_KEY ? process.env.API_KEY : '';

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
