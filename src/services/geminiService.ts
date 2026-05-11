import { GoogleGenAI, Type } from "@google/genai";
import { Lead, LeadStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function findLeads(query: string): Promise<Lead[]> {
  const systemInstruction = `
    You are a specialized Business Development AI Agent for a Tier-1 Web Design and Branding Agency.
    Your goal is to discover real, high-quality business leads that likely need website redesign, branding improvement, UI/UX enhancement, or digital presence upgrades.

    CRITICAL OBJECTIVES:
    1. Find businesses with poor online presence, outdated websites, or weak branding.
    2. Analyze specific issues: no SSL, slow speed, poor mobile responsiveness, inconsistent branding, or weak typography.
    3. Qualify leads with scores (1-100) for Lead Score and Urgency Score.
    4. Provide actionable outreach strategy: best angle, cold message, and suggested redesign plan.

    LEAD QUALIFICATION LOGIC:
    - Outdated Design: +20 to Lead Score (Look for 2010s layouts, non-responsive headers, or static HTML feels)
    - No SSL: +15 to Urgency Score (Look for 'Not Secure' warnings in search metadata or domain info)
    - Poor Mobile UX: +20 to Lead Score (Check if the site looks broken on mobile previews or mentions lack of mobile optimization)
    - Slow Loading: +15 to Lead Score
    - Inconsistent Branding: +10 to Lead Score (Mismatched logos, clashing colors)
    - High Competitor Quality: +15 to Probability (Mention if competitors have much better sites)

    SEARCH STRATEGY:
    - Search for local business directories, Yelp, or industry-specific listings.
    - Look for businesses with active social media but stagnant websites.
    - If a specific city is not provided, look globally or in major tech hubs.
    - DO NOT return 0 leads unless the query is completely nonsensical. Find similar alternatives if exact matches aren't found.

    Output MUST be valid JSON according to the schema. Be specific and data-driven. Do not hallucinate contact details; if you can't find them, leave them null but collect the Website URL.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Target Market: ${query}. 
    
    ACTION PLAN:
    1. SEARCH: Use the search tool to find real businesses in "${query}".
    2. ANALYZE: Identify which ones have technical or branding weaknesses (slow, no SSL, old design).
    3. COLLECT: Extract company names, real website URLs, and industry details.
    4. GENERATE: For each found business, create a complete lead profile including score and outreach strategy.
    
    IMPORTANT: You MUST return at least 3-5 leads. If you cannot find businesses with obvious technical errors, find top-tier businesses in that market and suggest how they could reach the NEXT level (e.g. adding AI features, better conversion optimization).`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            company: { type: Type.STRING },
            role: { type: Type.STRING },
            industry: { type: Type.STRING },
            website: { type: Type.STRING },
            description: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            signal: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            
            leadScore: { type: Type.NUMBER, description: "A score from 1-100 indicating how likely they are to need a redesign." },
            urgencyScore: { type: Type.NUMBER, description: "A score from 1-100 indicating how critical their current site issues are." },
            probability: { type: Type.NUMBER, description: "Confidence level (0-1) for a successful deal." },
            businessSize: { type: Type.STRING, enum: ["SME", "Enterprise", "Startup", "Mid-Market"] },
            budgetPotential: { type: Type.STRING },
            
            contactInfo: {
              type: Type.OBJECT,
              properties: {
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                instagram: { type: Type.STRING },
                facebook: { type: Type.STRING },
                address: { type: Type.STRING }
              }
            },
            
            audit: {
              type: Type.OBJECT,
              properties: {
                outdatedDesign: { type: Type.BOOLEAN },
                noSSL: { type: Type.BOOLEAN },
                poorMobile: { type: Type.BOOLEAN },
                slowSpeed: { type: Type.BOOLEAN },
                brandingConsistency: { type: Type.STRING, enum: ["poor", "fair", "good"] },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedImprovements: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            
            outreach: {
              type: Type.OBJECT,
              properties: {
                bestAngle: { type: Type.STRING },
                coldMessage: { type: Type.STRING },
                redesignStrategy: { type: Type.STRING },
                estimatedImpact: { type: Type.STRING }
              }
            }
          },
          required: ["name", "company", "industry", "website", "leadScore", "urgencyScore", "audit", "outreach"]
        }
      }
    }
  });

  try {
    const text = response.text;
    if (!text) return [];
    const results = JSON.parse(text);
    if (!Array.isArray(results)) return [];
    
    return results.map((l: any) => ({
      ...l,
      id: Math.random().toString(36).substr(2, 9),
      status: 'new' as LeadStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{
        type: 'discovered' as const,
        timestamp: new Date().toISOString(),
        note: 'Lead qualified as high-potential for redesign'
      }]
    }));
  } catch (e) {
    console.error("Error parsing leads:", e);
    return [];
  }
}
