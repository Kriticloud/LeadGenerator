export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  industry: string;
  website?: string;
  description: string;
  reasoning: string;
  confidence: number;
  contactInfo?: {
    email?: string;
    linkedin?: string;
    twitter?: string;
  };
  sourceUrl?: string;
}

export interface SearchState {
  isSearching: boolean;
  query: string;
  results: Lead[];
  error?: string;
}
