import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function findLeads(query: string): Promise<Lead[]> {
  const systemInstruction = `
    You are an expert sales lead generator. Your goal is to find real companies and people that match the user's lead criteria.
    Use Google Search to find actual, existing entities.
    
    For each lead, you must provide:
    1. Name (Entity or Key Person if found)
    2. Company
    3. Role (if person)
    4. Industry
    5. Website URL
    6. Description (What they do)
    7. Reasoning (Why they match the query)
    8. Signal (A short 1-2 word status like "Growth", "New Role", "Funding", "Expansion")
    9. Phone Number (if found)
    10. Confidence (0.0 to 1.0)
    
    Be specific. Do not hallucinate. If you can't find clear contact info, leave it blank but provide the website.
    Focus on high-quality matches.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find leads for: ${query}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            company: { type: Type.STRING },
            role: { type: Type.STRING },
            industry: { type: Type.STRING },
            website: { type: Type.STRING },
            description: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            signal: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            contactInfo: {
              type: Type.OBJECT,
              properties: {
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                twitter: { type: Type.STRING },
              }
            },
            sourceUrl: { type: Type.STRING }
          },
          required: ["name", "company", "industry", "description", "reasoning", "confidence"]
        }
      }
    }
  });

  try {
    const text = response.text;
    if (!text) return [];
    const leads = JSON.parse(text) as Lead[];
    return leads.map(l => ({
      ...l,
      id: l.id || Math.random().toString(36).substr(2, 9)
    }));
  } catch (e) {
    console.error("Error parsing leads:", e);
    return [];
  }
}
