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

    LEAD QUALIFICATION LOGIC (Scoring Guidelines):
    1. Website Modernity & UX (Max +50 Lead Score):
       - Legacy Tech/Layout (Flash remnants, table layouts, non-responsive): +25
       - Poor Visual Hierarchy & Typography: +15
       - Lack of Accessibility/Contrast: +10
    2. Engagement & Conversion Signals (Max +50 Urgency Score):
       - No clear CTA or broken lead funnels/forms: +30
       - Dormant marketing (last blog post > 1 year, broken social links): +20
    3. Technical Hygiene (Max +40 Urgency Score):
       - No SSL ('Not Secure' warning): +25
       - Slow LCP (Large Contentful Paint) / Performance issues: +15
    4. Market/Competitor Position (Max +0.3 to Probability):
       - High Gap: Competitors have modern AI-driven sites while lead is legacy: +0.2
       - Industry Volatility: Sector is moving to digital-first (e.g. HealthTech, Real Estate): +0.1

    SPECIFICITY REQUIREMENTS:
    - 'Website Problems Identified': Must be granular (e.g., "Non-standard navigation pattern confusing users" not just "bad UI").
    - 'Branding Issues Identified': Focus on psychological impact (e.g., "Mismatched color palette reduces trust in professional services" not just "bad colors").

    SEARCH STRATEGY:
    - Search for local business directories, Yelp, or industry-specific listings.
    - Look for businesses with active social media but stagnant websites.
    - If a specific city is not provided, look globally or in major tech hubs.
    - DO NOT return 0 leads unless the query is completely nonsensical. Find similar alternatives if exact matches aren't found.

    - Outreach Strategy: Provide both a focused cold email draft AND a punchy WhatsApp/SMS opener.
    
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
                websiteProblems: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific technical or UX problems found on the website." },
                brandingIssues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific branding, aesthetic, or trust-related issues." },
                suggestedImprovements: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            
            outreach: {
              type: Type.OBJECT,
              properties: {
                bestAngle: { type: Type.STRING },
                coldMessage: { type: Type.STRING, description: "Professional cold email draft." },
                whatsappMessage: { type: Type.STRING, description: "Punchy, casual WhatsApp/SMS opener for direct outreach." },
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
      outreach: {
        ...l.outreach,
        whatsappMessage: l.outreach.whatsappMessage || `Hi ${l.name || 'there'} from ${l.company}, I noticed some exciting opportunities to level up your website at ${l.website}. Would you be open to a quick chat about a redesign strategy?`
      },
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
