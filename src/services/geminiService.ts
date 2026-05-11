import { GoogleGenAI, Type } from "@google/genai";
import { Lead, LeadStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function findLeads(query: string): Promise<Lead[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "undefined") {
    console.error("GEMINI_API_KEY is not defined.");
    throw new Error("API Key Missing: Please configure GEMINI_API_KEY in your local .env file.");
  }

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
       - Legacy Tech/Layout (Flash remnants, table layouts, non-responsive): +20
       - Tech Stack Maturity (e.g. lack of modern frameworks, rigid CMS, jQuery-only): +15
       - Visual Hierarchy & User Flow (Cluttered navigation, poor scanability): +15
    2. Engagement & Conversion Signals (Max +50 Urgency Score):
       - CTA Friction (Vague messaging, poor contrast, hidden below fold): +20
       - Lead Capture Friction (Too many form fields, lack of mobile-friendly inputs): +15
       - Trust Factor (Lack of social proof, outdated legal footers, broken icons): +15
    3. Technical Hygiene (Max +40 Urgency Score):
       - Performance Gaps (Core Web Vitals, slow LCP, unoptimized assets): +20
       - Security & Accessibility (No SSL, mixed content, poor color contrast): +20
    4. Competitor Gap Analysis (Max +0.3 to Probability):
       - Modernity Gap: Competitors utilize interactive elements/AI while target is static: +0.2
       - Authority Gap: Competitors have superior branding/UX that makes target look risky: +0.1

    OUTREACH STRATEGY RULES:
    - 'Cold Message': Must be a high-conversion email. Reference at least ONE specific technical issue from your audit (e.g., mention their lack of SSL or mobile rendering issues). Use a "Value-First" approach—don't just sell, educate.
    - 'WhatsApp Message': Must be punchy (under 250 chars). Mention a specific branding visual (e.g. "I love your logo but noticed your mobile site hides your CTA").
    - Industry Alignment: Adjust tone based on industry (e.g., luxury/professional for Real Estate, energetic/growth-focused for Startups).
    - Status-Awareness: Create the 'coldMessage' as a first-touch sequence, but include a 'followUpAngle' for later.

    SPECIFICITY REQUIREMENTS:
    - 'Website Problems Identified': Provide high-precision diagnostic insights. Instead of "site is slow," use "unoptimized image payloads (>5MB) causing high LCP." For every issue, provide a technical solution.
    - 'Branding Issues Identified': Analyze the "Trust Gap." (e.g., "Mismatched serif fonts create a legacy feel that conflicts with your modern service offering").
    - 'Conversion Funnel Audit': Identify exactly where users drop off. (e.g., "Primary CTA is lost in the footer" or "Form fields are not optimized for mobile thumb reach").
    - 'Executive Audit Summary': A 2-3 sentence high-impact synthesis of ALL audit findings. It must sound authoritative and clearly state the business risk of their current digital state.

    SEARCH STRATEGY:
    - Search for local business directories, Yelp, or industry-specific listings.
    - Look for businesses with active social media but stagnant websites.
    - If a specific city is not provided, look globally or in major tech hubs.
    - DO NOT return 0 leads unless the query is completely nonsensical. Find similar alternatives if exact matches aren't found.

    - Outreach Strategy: Provide both a focused cold email draft AND a punchy WhatsApp/SMS opener.
    
    Output MUST be valid JSON according to the schema. Be specific and data-driven. Do not hallucinate contact details; if you can't find them, leave them null but collect the Website URL and Source information.
  `;

  try {
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
              source: { type: Type.STRING, description: "Where the lead was discovered (e.g. Google Search, LinkedIn)." },
              sourceUrl: { type: Type.STRING },
              
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
                  websiteProblems: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT,
                      properties: {
                        issue: { type: Type.STRING },
                        solution: { type: Type.STRING }
                      }
                    }, 
                    description: "Specific technical or UX problems found on the website with suggested solutions." 
                  },
                  brandingIssues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific branding, aesthetic, or trust-related issues." },
                  suggestedImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
                  funnelAudit: {
                    type: Type.OBJECT,
                    properties: {
                      ctaAnalysis: { type: Type.STRING, description: "Detailed analysis of current CTAs." },
                      leadCaptureAnalysis: { type: Type.STRING, description: "Analysis of lead generation forms and conversion friction." },
                      suggestedFunnelImprovements: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            step: { type: Type.STRING },
                            improvement: { type: Type.STRING }
                          }
                        }
                      }
                    }
                  },
                  executiveSummary: { type: Type.STRING, description: "A high-impact 2-3 sentence overview of the audit findings." }
                }
              },
              
              outreach: {
                type: Type.OBJECT,
                properties: {
                  bestAngle: { type: Type.STRING },
                  coldMessage: { type: Type.STRING, description: "Professional cold email draft." },
                  whatsappMessage: { type: Type.STRING, description: "Punchy, casual WhatsApp/SMS opener for direct outreach." },
                  redesignStrategy: { type: Type.STRING },
                  estimatedImpact: { type: Type.STRING },
                  variations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        status: { type: Type.STRING },
                        message: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            },
            required: ["name", "company", "industry", "website", "leadScore", "urgencyScore", "audit", "outreach"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    try {
      const results = JSON.parse(text);
      if (!Array.isArray(results)) return [];
      
      return results.map((l: any) => ({
        ...l,
        id: Math.random().toString(36).substr(2, 9),
        source: l.source || "AI Scouting",
        outreach: {
          ...l.outreach,
          whatsappMessage: l.outreach.whatsappMessage || `Hi ${l.name || 'there'} from ${l.company}, I noticed some exciting opportunities to level up your website at ${l.website}. Would you be open to a quick chat about a redesign strategy?`,
          variations: l.outreach.variations || [
            { status: 'nurturing', message: `Hi ${l.name || 'there'}, just checking in on ${l.company}'s site. I've been thinking about that branding gap we identified.` },
            { status: 'follow-up', message: `Great talking to you earlier! Wanted to send over that specific performance audit for ${l.website} we discussed.` }
          ]
        },
        audit: {
          ...l.audit,
          websiteProblems: l.audit.websiteProblems || [],
          executiveSummary: l.audit.executiveSummary || `${l.company}'s digital presence is currently hindered by multiple critical design and technical gaps that reduce consumer trust and conversion efficiency. A strategic overhaul is recommended to align with industry standards.`
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
    } catch (parseError) {
      console.error("JSON Parse Error:", text);
      throw new Error("Failed to parse AI response. Try again.");
    }
  } catch (err: any) {
    console.error("Scouting Error:", err);
    if (err.message?.includes("API key")) {
      throw new Error("Invalid or missing API Key. Check your .env file.");
    }
    if (err.message?.includes("googleSearch")) {
      throw new Error("The search tool is currently unavailable for your API key.");
    }
    throw err;
  }
}
