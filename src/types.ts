export interface LeadActivity {
  type: 'viewed' | 'contacted' | 'updated' | 'discovered';
  timestamp: string;
  note?: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  industry: string;
  website?: string;
  description: string;
  reasoning: string;
  signal?: string; // Add this for UI badges like "Growth", "Recent Funding"
  confidence: number;
  contactInfo?: {
    email?: string;
    phone?: string;
    linkedin?: string;
    twitter?: string;
  };
  sourceUrl?: string;
  history?: LeadActivity[];
}

export interface SearchState {
  isSearching: boolean;
  query: string;
  results: Lead[];
  error?: string;
}
