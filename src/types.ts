export interface LeadActivity {
  type: 'viewed' | 'contacted' | 'updated' | 'discovered' | 'status_change' | 'note_added' | 'reminder_set';
  timestamp: string;
  note?: string;
}

export type LeadStatus = 'new' | 'contacted' | 'interested' | 'follow-up' | 'closed' | 'rejected';

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  industry: string;
  website?: string;
  description: string;
  reasoning: string;
  signal?: string;
  confidence: number;
  status: LeadStatus;
  
  // Scoring
  leadScore: number;
  urgencyScore: number;
  probability: number;
  businessSize: string;
  budgetPotential: string;
  
  // Contact & Social
  contactInfo: {
    email?: string;
    phone?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
    address?: string;
  };
  
  // Audit Findings
  audit: {
    outdatedDesign: boolean;
    noSSL: boolean;
    poorMobile: boolean;
    slowSpeed: boolean;
    brandingConsistency: 'poor' | 'fair' | 'good';
    issues: string[];
    suggestedImprovements: string[];
  };
  
  // AI Outreach
  outreach: {
    bestAngle: string;
    coldMessage: string;
    redesignStrategy: string;
    estimatedImpact: string;
  };

  sourceUrl?: string;
  history: LeadActivity[];
  notes?: string;
  followUpAt?: string;
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  agencyName: string;
  targetIndustries: string[];
  targetLocations: string[];
}
