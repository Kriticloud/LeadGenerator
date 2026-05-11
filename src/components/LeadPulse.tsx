import React, { useState } from 'react';
import { Search, Briefcase, Globe, Mail, Linkedin, Twitter, ExternalLink, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { findLeads } from '../services/geminiService';
import { Lead } from '../types';
import { cn } from '../lib/utils';

export default function LeadPulse() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const results = await findLeads(query);
      setLeads(results);
      if (results.length === 0) {
        setError("No leads found for this criteria. Try refining your search.");
      }
    } catch (err) {
      setError("Search failed. Please try again.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 border-r border-line bg-white flex flex-col items-stretch overflow-hidden">
        <div className="p-6 border-b border-line flex items-center gap-3">
          <div className="w-8 h-8 bg-ink rounded-sm flex items-center justify-center">
            <Search className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-serif italic text-xl font-black tracking-tight leading-none pt-1">
            LeadPulse<span className="text-accent">.</span>AI
          </h1>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="label-micro block mb-2">Lead Criteria</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Marketing agencies in New York for SaaS partnerships"
                className="w-full h-32 px-4 py-3 bg-bg border border-line text-sm font-mono focus:outline-none focus:border-ink transition-colors resize-none"
                id="search-input"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3 bg-ink text-white font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              id="search-button"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {isSearching ? 'Scouting...' : 'Find Leads'}
            </button>
          </form>

          <div>
            <label className="label-micro block mb-3">Recent Investigations</label>
            <div className="space-y-2 opacity-40">
              <div className="text-[10px] font-mono p-2 border border-dashed border-line">NO RECENT ACTIVITY</div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-line bg-bg/50">
          <div className="flex items-center gap-2 text-[10px] font-mono text-ink/60 uppercase tracking-tighter">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Gemini Flash Engine Active
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <div className="label-micro mb-2">Live Report</div>
            <h2 className="text-3xl font-serif italic font-black">Lead Scouting Matrix</h2>
            <p className="text-ink/60 text-sm mt-2 font-mono">
              Displaying qualified prospects based on current search parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {/* Headers */}
            <div className="hidden md:grid grid-cols-12 px-6 py-3 border-y border-line text-ink opacity-40 uppercase tracking-widest font-mono text-[9px]">
              <div className="col-span-1">ID</div>
              <div className="col-span-3">Prospect / Entity</div>
              <div className="col-span-2">Industry</div>
              <div className="col-span-4">Match Reasoning</div>
              <div className="col-span-2 text-right">Confidence</div>
            </div>

            <AnimatePresence mode="popLayout">
              {isSearching ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-20 flex flex-col items-center justify-center text-center space-y-4"
                  id="loading-state"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-2 border-line rounded-full border-t-ink animate-spin" />
                    <Search className="absolute inset-0 m-auto w-6 h-6 text-line" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif italic text-lg">Querying Global Lead Database</p>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-ink/40">Grounding results with Google Search</p>
                  </div>
                </motion.div>
              ) : leads.length > 0 ? (
                leads.map((lead, idx) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="data-grid-item px-6 py-6 group bg-white md:bg-transparent"
                    id={`lead-${lead.id}`}
                  >
                    <div className="flex flex-col md:grid md:grid-cols-12 md:items-start gap-4 md:gap-0">
                      <div className="md:col-span-1 text-[10px] font-mono text-accent">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      
                      <div className="md:col-span-3 space-y-1">
                        <div className="font-bold flex items-center gap-2">
                          {lead.name}
                          {lead.confidence > 0.8 && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                        </div>
                        <div className="text-xs text-ink/60 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {lead.company} {lead.role && `• ${lead.role}`}
                        </div>
                        {lead.website && (
                          <a 
                            href={lead.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-accent flex items-center gap-1 hover:underline font-mono"
                          >
                            <Globe className="w-3 h-3" />
                            {lead.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          {lead.contactInfo?.linkedin && (
                            <a href={lead.contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-zinc-200 rounded-sm transition-colors">
                              <Linkedin className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.contactInfo?.twitter && (
                            <a href={lead.contactInfo.twitter} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-zinc-200 rounded-sm transition-colors">
                              <Twitter className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.contactInfo?.email && (
                            <a href={`mailto:${lead.contactInfo.email}`} className="p-1.5 hover:bg-zinc-200 rounded-sm transition-colors">
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <span className="inline-block px-2 py-0.5 border border-line rounded-full text-[10px] font-mono uppercase">
                          {lead.industry}
                        </span>
                      </div>

                      <div className="md:col-span-4 text-xs space-y-2">
                        <p className="line-clamp-2 italic text-ink/80">{lead.description}</p>
                        <div className="bg-bg p-2 text-[10px] border border-dashed border-line">
                          <span className="font-bold uppercase tracking-tighter mr-2">LOGIC:</span>
                          {lead.reasoning}
                        </div>
                      </div>

                      <div className="md:col-span-2 md:text-right flex items-center md:items-start justify-between md:justify-end gap-2">
                        <span className="md:hidden label-micro opacity-40">Confidence Score</span>
                        <span className={cn(
                          "font-mono text-sm font-bold",
                          lead.confidence > 0.8 ? "text-green-600" : lead.confidence > 0.5 ? "text-amber-600" : "text-red-600"
                        )}>
                          {(lead.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : error ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 flex flex-col items-center text-center space-y-4"
                  id="error-state"
                >
                  <AlertCircle className="w-12 h-12 text-red-500 opacity-20" />
                  <div>
                    <h3 className="font-serif italic text-lg">System Intelligence Gap</h3>
                    <p className="text-xs text-ink/60 font-mono mt-1">{error}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-40 flex flex-col items-center text-center space-y-6"
                  id="empty-state"
                >
                  <div className="relative">
                    <Search className="w-24 h-24 text-line/20" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-accent/5 rounded-full blur-3xl" 
                    />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <p className="font-serif italic text-2xl">Awaiting Directives</p>
                    <p className="text-xs text-ink/40 font-mono tracking-tight">
                      Define your target niche, location, and industry criteria in the matrix panel to start scouting high-converting prospects.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
