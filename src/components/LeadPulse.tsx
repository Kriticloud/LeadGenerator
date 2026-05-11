import React, { useState } from 'react';
import { Search, Briefcase, Globe, Mail, Linkedin, Twitter, ExternalLink, ChevronRight, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, History, Clock, X, Eye, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { findLeads } from '../services/geminiService';
import { Lead, LeadActivity } from '../types';
import { cn, downloadLeadsAsCSV } from '../lib/utils';

export default function LeadPulse() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const results = await findLeads(query);
      const leadsWithHistory = results.map(l => ({
        ...l,
        history: [{
          type: 'discovered' as const,
          timestamp: new Date().toISOString(),
          note: 'Lead discovered via AI scout'
        }]
      }));
      setLeads(leadsWithHistory);
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

  const addActivity = (leadId: string, type: LeadActivity['type'], note?: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          history: [
            ...(l.history || []),
            { type, timestamp: new Date().toISOString(), note }
          ]
        };
      }
      return l;
    }));
  };

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden font-sans text-slate-800">
      {/* Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-sm">
            <Search className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            LeadPulse <span className="text-accent italic">AI</span>
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="status-badge">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
            Agent Active
          </div>
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          <button 
            onClick={() => { setLeads([]); setQuery(''); setSelectedLeadId(null); }} 
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors shadow-sm"
          >
            New Search
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Configuration */}
        <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col space-y-6 overflow-y-auto">
          <div>
            <label className="sidebar-label">Search Parameters</label>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Objective</span>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., Marketing agencies in New York for SaaS partnerships"
                  className="w-full h-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
                />
              </div>

              <div className="space-y-2 opacity-60">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Automatic Grounding</span>
                  <div className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 font-mono">Google Search Enabled</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Lead Keywords</span>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded uppercase">Founder</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded uppercase">Decision Maker</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded uppercase">B2B</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full action-button-primary flex items-center justify-center gap-2 mt-4"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {isSearching ? 'Analyzing...' : 'New Search'}
              </button>
            </form>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <label className="sidebar-label text-slate-400 uppercase tracking-wider mb-3 block">System Health</label>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">API Latency</span>
                <span className="text-slate-900 font-mono">42ms</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-accent w-3/4 h-full"></div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Daily Energy</span>
                <span className="text-slate-900 font-mono">14,282 / 50k</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">Discovered Prospects</h2>
              <p className="text-sm text-slate-500 mt-1">
                {leads.length > 0 ? (
                  <>Showing <span className="text-slate-900 font-medium">{leads.length}</span> high-confidence matches found via grounding.</>
                ) : (
                  "Initiate a search to populate the scouting matrix."
                )}
              </p>
            </div>
            {leads.length > 0 && (
              <div className="flex space-x-2">
                <button 
                  onClick={() => downloadLeadsAsCSV(leads)}
                  className="px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded text-sm font-medium hover:bg-emerald-100 transition-all flex items-center gap-2 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel / Sheets CSV
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto relative">
            <AnimatePresence mode="wait">
              {isSearching ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-slate-100 rounded-full border-t-accent animate-spin" />
                    <Search className="absolute inset-0 m-auto w-6 h-6 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Scanning Intelligence Nodes</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">Cross-referencing live data streams with your search criteria...</p>
                </motion.div>
              ) : leads.length > 0 ? (
                <motion.table 
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full text-left border-collapse"
                >
                  <thead className="sticky top-0 z-10">
                    <tr className="data-table-header">
                      <th className="px-8 py-3 border-b border-slate-200">Lead / Company</th>
                      <th className="px-4 py-3 border-b border-slate-200">Role</th>
                      <th className="px-4 py-3 border-b border-slate-200">Signals</th>
                      <th className="px-4 py-3 border-b border-slate-200">Last Activity</th>
                      <th className="px-4 py-3 border-b border-slate-200">Match Score</th>
                      <th className="px-8 py-3 border-b border-slate-200 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((lead, idx) => {
                      const lastActivity = lead.history?.[lead.history.length - 1];
                      return (
                        <tr 
                          key={lead.id} 
                          className={cn(
                            "hover:bg-blue-50/30 transition-colors group cursor-pointer",
                            selectedLeadId === lead.id && "bg-blue-50"
                          )}
                          onClick={() => setSelectedLeadId(lead.id)}
                        >
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                {lead.name}
                                {lead.confidence > 0.8 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                              </span>
                              <span className="text-xs text-slate-500 italic">{lead.company}</span>
                              {lead.contactInfo?.linkedin && (
                                <a 
                                  href={lead.contactInfo.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-accent font-mono flex items-center gap-1 mt-0.5 hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addActivity(lead.id, 'viewed', 'Opened LinkedIn profile');
                                  }}
                                >
                                  <Linkedin className="w-2.5 h-2.5" />
                                  LinkedIn Profile
                                </a>
                              )}
                              {lead.contactInfo?.phone && (
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                  <Phone className="w-2.5 h-2.5" />
                                  {lead.contactInfo.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-5 font-medium text-slate-600 text-sm">
                            {lead.role || "N/A"}
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex gap-1">
                              {lead.signal && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] rounded uppercase font-semibold">
                                  {lead.signal}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] rounded uppercase font-semibold">
                                {lead.industry}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-5 font-mono text-[10px] text-slate-400">
                            {lastActivity && (
                              <div className="flex items-center gap-1.5 uppercase font-bold tracking-tighter">
                                <Clock className="w-3 h-3" />
                                <span className="text-slate-600">{lastActivity.type}</span>
                                <span>•</span>
                                <span>{formatTimestamp(lastActivity.timestamp)}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center">
                              <span className="text-sm font-bold text-accent mr-3 tabular-nums">
                                {(lead.confidence * 100).toFixed(0)}%
                              </span>
                              <div className="w-16 h-1 bg-slate-100 rounded-full">
                                <div 
                                  className="h-full bg-accent rounded-full transition-all duration-1000"
                                  style={{ width: `${lead.confidence * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2">
                               {lead.website && (
                                <a 
                                  href={lead.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-accent text-xs font-bold hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addActivity(lead.id, 'viewed', 'Opened company website');
                                  }}
                                >
                                  Website
                                </a>
                              )}
                              {lead.contactInfo?.linkedin && (
                                <a 
                                  href={lead.contactInfo.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-slate-100 rounded text-accent transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addActivity(lead.id, 'viewed', 'Opened LinkedIn profile');
                                  }}
                                  title="View LinkedIn Profile"
                                >
                                  <Linkedin className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {lead.contactInfo?.phone && (
                                <a 
                                  href={`tel:${lead.contactInfo.phone}`}
                                  className="p-1 hover:bg-slate-100 rounded text-accent transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addActivity(lead.id, 'contacted', `Clicked call link: ${lead.contactInfo?.phone}`);
                                  }}
                                  title="Call Prospect"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button 
                                className="text-slate-400 hover:text-accent font-bold text-xs uppercase tracking-tighter"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLeadId(lead.id);
                                  addActivity(lead.id, 'viewed', 'Viewed lead profile');
                                }}
                              >
                                History
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </motion.table>
              ) : error ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                >
                  <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">Search Parameter Mismatch</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs">{error}</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Search className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Awaiting Intelligence Core</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Enter target niche or industry keywords in the control panel to initialize the LeadPulse mapping sequence.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Status Bar */}
          <footer className="h-12 bg-slate-50 border-t border-slate-200 px-8 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-6 text-[11px] font-medium text-slate-400">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></span>
                Streaming Live Data...
              </div>
              <span>Last Scanned: Just Now</span>
              <span>Proxies: 12 Active</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <span className="text-[11px] font-bold uppercase">Page 1 of 1</span>
            </div>
          </footer>
        </main>

        {/* History Panel */}
        <AnimatePresence>
          {selectedLead && (
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-2xl relative z-20"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-accent" />
                  <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Lead Activity</h3>
                </div>
                <button 
                  onClick={() => setSelectedLeadId(null)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="mb-6">
                  <div className="text-lg font-bold text-slate-900">{selectedLead.name}</div>
                  <div className="text-sm text-slate-500 italic">{selectedLead.company}</div>
                </div>

                <div className="relative space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                  {selectedLead.history?.slice().reverse().map((event, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className={cn(
                        "absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm",
                        event.type === 'discovered' ? 'bg-blue-500' : 
                        event.type === 'viewed' ? 'bg-amber-500' :
                        event.type === 'contacted' ? 'bg-emerald-500' : 'bg-slate-400'
                      )} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
                          {formatTimestamp(event.timestamp)}
                        </span>
                        <div className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                          {event.type}
                          {event.type === 'viewed' && <Eye className="w-3 h-3 text-amber-500" />}
                          {event.type === 'contacted' && <Mail className="w-3 h-3 text-emerald-500" />}
                          {event.type === 'discovered' && <Search className="w-3 h-3 text-blue-500" />}
                        </div>
                        {event.note && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 space-y-3">
                <label className="sidebar-label opacity-40">Quick Actions</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    disabled={!selectedLead.contactInfo?.email}
                    onClick={() => {
                      addActivity(selectedLead.id, 'contacted', 'Initiated email outreach');
                      window.location.href = `mailto:${selectedLead.contactInfo?.email}`;
                    }}
                    className="p-2 border border-slate-200 rounded text-[10px] font-bold uppercase hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-20"
                  >
                    <Mail className="w-4 h-4 text-slate-400 group-hover:text-accent" /> Email
                  </button>
                  <button 
                    disabled={!selectedLead.contactInfo?.phone}
                    onClick={() => {
                      addActivity(selectedLead.id, 'contacted', `Called prospect at ${selectedLead.contactInfo?.phone}`);
                      window.location.href = `tel:${selectedLead.contactInfo?.phone}`;
                    }}
                    className="p-2 border border-slate-200 rounded text-[10px] font-bold uppercase hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-20"
                  >
                    <Phone className="w-4 h-4 text-slate-400 group-hover:text-accent" /> Call
                  </button>
                  <button 
                    disabled={!selectedLead.contactInfo?.linkedin}
                    onClick={() => {
                      addActivity(selectedLead.id, 'contacted', 'Viewed LinkedIn profile');
                      window.open(selectedLead.contactInfo?.linkedin, '_blank');
                    }}
                    className="p-2 border border-slate-200 rounded text-[10px] font-bold uppercase hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-20"
                  >
                    <Linkedin className="w-4 h-4 text-slate-400 group-hover:text-accent" /> Social
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
