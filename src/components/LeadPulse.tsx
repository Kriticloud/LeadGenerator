import React, { useState, useEffect } from 'react';
import { 
  Search, Briefcase, Globe, Mail, Linkedin, Twitter, ExternalLink, ChevronRight, CheckCircle2, 
  AlertCircle, Loader2, FileSpreadsheet, History, Clock, X, Eye, Phone, Zap, TrendingUp, 
  BarChart3, Target, Shield, Activity, Filter, Database, Save, MessageCircle, Instagram, 
  Facebook, Settings, Layout, PanelLeft, MoreVertical, Trash2, Send, LogOut, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { findLeads } from '../services/geminiService';
import { Lead, LeadActivity, LeadStatus } from '../types';
import { cn, downloadLeadsAsCSV } from '../lib/utils';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  collection, onSnapshot, query as firestoreQuery, orderBy, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc 
} from 'firebase/firestore';
import { 
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser 
} from 'firebase/auth';

export default function LeadPulse() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleBulkStatusUpdate = async (status: LeadStatus) => {
    setIsBulkUpdating(true);
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        const leadRef = doc(db, 'leads', id);
        const lead = leads.find(l => l.id === id);
        if (!lead) return;
        
        const newActivity: LeadActivity = {
          type: 'status_change',
          timestamp: new Date().toISOString(),
          note: `Bulk status update to ${status}`
        };

        return updateDoc(leadRef, {
          status,
          updatedAt: new Date().toISOString(),
          history: [...(lead.history || []), newActivity]
        });
      });
      await Promise.all(promises);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk update failed:", error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkNote = async (note: string) => {
    if (!note.trim()) return;
    setIsBulkUpdating(true);
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        const leadRef = doc(db, 'leads', id);
        const lead = leads.find(l => l.id === id);
        if (!lead) return;
        
        const newActivity: LeadActivity = {
          type: 'note_added',
          timestamp: new Date().toISOString(),
          note: `Bulk Note: ${note}`
        };

        return updateDoc(leadRef, {
          notes: lead.notes ? `${lead.notes}\n\n${note}` : note,
          updatedAt: new Date().toISOString(),
          history: [...(lead.history || []), newActivity]
        });
      });
      await Promise.all(promises);
      setSelectedIds(new Set());
    } catch (error) {
           console.error("Bulk note failed:", error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkCSV = () => {
    const selectedLeads = leads.filter(l => selectedIds.has(l.id));
    downloadLeadsAsCSV(selectedLeads);
  };
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [reminders, setReminders] = useState<Lead[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Real-time Firestore Sync
  useEffect(() => {
    const q = firestoreQuery(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: Lead[] = [];
      snapshot.forEach((doc) => {
        leadsData.push({ id: doc.id, ...doc.data() } as Lead);
      });
      setLeads(leadsData);
      
      // Filter active reminders
      const activeReminders = leadsData.filter(l => l.followUpAt && !l.reminderSent);
      setReminders(activeReminders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leads');
    });
    return () => unsubscribe();
  }, []);

  // Reminder Notification Engine
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      reminders.forEach(async (lead) => {
        if (lead.followUpAt && new Date(lead.followUpAt) <= now && !lead.reminderSent) {
          // Trigger Notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`Follow-up Due: ${lead.company}`, {
              body: `Scheduled check-in for ${lead.company} is now due.`,
              icon: '/vite.svg'
            });
          }
          
          // Mark as sent in DB
          try {
            const leadRef = doc(db, 'leads', lead.id);
            await updateDoc(leadRef, { reminderSent: true });
          } catch (err) {
            console.error("Failed to update reminder status:", err);
          }
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [reminders]);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert("Notifications enabled! You'll be alerted when follow-ups are due.");
      }
    }
  };


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (!user) {
      setError("Please sign in to scout leads.");
      handleLogin();
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const results = await findLeads(searchQuery);
      // Save results to Firestore
      for (const lead of results) {
        await setDoc(doc(db, 'leads', lead.id), lead);
      }
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

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const newActivity: LeadActivity = {
        type: 'status_change',
        timestamp: new Date().toISOString(),
        note: `Status updated to ${status}`
      };

      await updateDoc(leadRef, {
        status,
        updatedAt: new Date().toISOString(),
        history: [...(lead.history || []), newActivity]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
    }
  };

  const addLeadNote = async (leadId: string, note: string) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const newActivity: LeadActivity = {
        type: 'note_added',
        timestamp: new Date().toISOString(),
        note
      };

      await updateDoc(leadRef, {
        notes: note,
        updatedAt: new Date().toISOString(),
        history: [...(lead.history || []), newActivity]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      if (selectedLeadId === leadId) setSelectedLeadId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leads/${leadId}`);
    }
  };

  const setFollowUpReminder = async (leadId: string, dateTime: string) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const newActivity: LeadActivity = {
        type: 'reminder_set',
        timestamp: new Date().toISOString(),
        note: `Follow-up reminder scheduled for ${new Date(dateTime).toLocaleString()}`
      };

      await updateDoc(leadRef, {
        followUpAt: dateTime,
        reminderSent: false,
        updatedAt: new Date().toISOString(),
        history: [...(lead.history || []), newActivity]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
    }
  };

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredLeads = leads.filter(l => filterStatus === 'all' || l.status === filterStatus);

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden font-sans text-slate-400">
      {/* Premium Header */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-8 shrink-0 z-30">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold tracking-tight text-slate-100 flex items-center gap-2">
              LeadPulse <span className="px-1.5 py-0.5 bg-accent/10 text-accent text-[10px] rounded uppercase">Agent v2.0</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Web Design & Branding Intelligence</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-border rounded-lg">
                <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter truncate max-w-[100px]">
                  {user.displayName || user.email}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-danger transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="px-4 py-1.5 bg-accent text-white text-xs font-bold rounded-lg hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
            >
              <User className="w-3.5 h-3.5" /> Sign In
            </button>
          )}

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 hover:text-slate-100 transition-colors relative"
            >
              <Clock className="w-5 h-5" />
              {reminders.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full animate-pulse border border-bg"></span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-80 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-border bg-slate-900/50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Active Reminders</h3>
                    <button onClick={() => setShowNotifications(false)}><X className="w-3.5 h-3.5 text-slate-500" /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2">
                    {reminders.length === 0 ? (
                      <div className="p-8 text-center text-[10px] text-slate-600 font-bold uppercase">No pending follow-ups</div>
                    ) : (
                      <div className="space-y-1">
                        {reminders.map(lead => (
                          <button 
                            key={lead.id}
                            onClick={() => { setSelectedLeadId(lead.id); setShowNotifications(false); }}
                            className="w-full p-3 hover:bg-slate-900 rounded-xl transition-all text-left group"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold text-slate-200 group-hover:text-accent transition-colors">{lead.company}</span>
                              <span className="text-[9px] font-mono text-accent">{new Date(lead.followUpAt!).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{lead.industry}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-900/50 border-t border-border">
                    <button 
                      onClick={requestNotificationPermission}
                      className="w-full py-2 bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase rounded-lg hover:bg-accent/20 transition-all"
                    >
                      Enable Browser Alerts
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center bg-slate-900/50 border border-border rounded-full px-4 py-1.5">
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">AI Detective Active</span>
          </div>
          
          <div className="flex bg-slate-900 border border-border rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-accent text-white shadow-md" : "text-slate-500 hover:text-slate-300")}
            >
              <Layout className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded-md transition-all", viewMode === 'table' ? "bg-accent text-white shadow-md" : "text-slate-500 hover:text-slate-300")}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={() => downloadLeadsAsCSV(leads)}
            className="p-2 text-slate-500 hover:text-slate-100 transition-colors"
            title="Export to CSV"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Intelligence Control Panel */}
        <aside className="w-80 bg-surface border-r border-border shrink-0 flex flex-col z-20">
          <div className="p-6 flex-1 overflow-y-auto space-y-8">
            <section>
              <label className="sidebar-label">Discovery Mode</label>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                  <textarea
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Restaurants in Dubai with outdated websites"
                    className="w-full h-28 pl-10 pr-4 py-3 bg-slate-900/50 border border-border rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all resize-none placeholder:text-slate-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full action-button-primary flex items-center justify-center gap-2"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  {isSearching ? 'Scouting Leads...' : 'Initialize Scouting'}
                </button>
              </form>
            </section>

            <section>
              <label className="sidebar-label">Pipeline Filters</label>
              <div className="space-y-2">
                {(['all', 'new', 'contacted', 'interested', 'follow-up', 'closed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group",
                      filterStatus === status ? "bg-accent/10 text-accent border border-accent/20" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
                    )}
                  >
                    <span className="capitalize">{status}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[9px] font-bold",
                      filterStatus === status ? "bg-accent text-white" : "bg-slate-900 text-slate-500"
                    )}>
                      {status === 'all' ? leads.length : leads.filter(l => l.status === status).length}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-slate-900/30 rounded-xl p-4 border border-border/50">
              <label className="sidebar-label !mb-4">System Stats</label>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span>Target Quality</span>
                    <span className="text-accent">94%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} className="h-full bg-accent" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-2 bg-slate-900 rounded-lg">
                    <div className="text-lg font-display font-bold text-slate-200">{leads.length}</div>
                    <div className="text-[9px] text-slate-600 font-bold uppercase">Total Leads</div>
                  </div>
                  <div className="text-center p-2 bg-slate-900 rounded-lg">
                    <div className="text-lg font-display font-bold text-emerald-400">
                      {leads.filter(l => l.leadScore > 80).length}
                    </div>
                    <div className="text-[9px] text-slate-600 font-bold uppercase">High Value</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="p-4 border-t border-border bg-slate-900/20">
            <button className="w-full flex items-center justify-center gap-2 p-2 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest">
              <Settings className="w-3.5 h-3.5" /> Configuration
            </button>
          </div>
        </aside>

        {/* Intelligence Grid */}
        <main className="flex-1 overflow-auto bg-bg p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-100">Scouted Intelligence</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Showing {filteredLeads.length} leads matching your current criteria.
                  </p>
                </div>
                {filteredLeads.length > 0 && (
                  <button 
                    onClick={selectAll}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-border rounded-lg text-[10px] font-bold text-slate-400 hover:text-accent transition-all uppercase tracking-widest"
                  >
                    <div className={cn("w-3 h-3 rounded border flex items-center justify-center transition-all", selectedIds.size === filteredLeads.length ? "bg-accent border-accent" : "border-slate-600")}>
                      {selectedIds.size === filteredLeads.length && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {selectedIds.size === filteredLeads.length ? 'Deselect All' : 'Select Page'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg">
                  <Activity className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold text-slate-300">Live Feed</span>
                </div>
              </div>
            </div>

            {isSearching ? (
              <div className="h-96 flex flex-col items-center justify-center text-center">
                <div className="relative mb-8">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="w-24 h-24 border-2 border-slate-900 border-t-accent rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-accent animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Analyzing Digital Landscapes</h3>
                <p className="text-slate-500 max-w-sm">
                  Our agent is currently scanning URLs, analyzing branding quality, and detecting technical discrepancies across the target market...
                </p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="h-96 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center opacity-50">
                <Database className="w-12 h-12 text-slate-700 mb-4" />
                <h3 className="text-lg font-bold text-slate-500">No Intelligence Data Found</h3>
                <p className="text-sm text-slate-600 max-w-xs mb-6">Initialize a scouting sequence to start populating your high-value lead matrix.</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {[
                    "Oldest law firms in London",
                    "Restaurants in Dubai with poor websites",
                    "Manufacturing companies in Ohio",
                    "Accounting firms with no mobile site",
                    "Boutique hotels in Bali"
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={async () => {
                        if (!user) {
                          setError("Please sign in to scout leads.");
                          handleLogin();
                          return;
                        }
                        setSearchQuery(example);
                        setIsSearching(true);
                        setError(null);
                        try {
                          const results = await findLeads(example);
                          for (const lead of results) {
                            await setDoc(doc(db, 'leads', lead.id), lead);
                          }
                          if (results.length === 0) setError("No leads found for this criteria.");
                        } catch (e) {
                          setError("Scouting failed.");
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-900 border border-border rounded-full text-[10px] font-bold text-slate-500 hover:text-accent hover:border-accent transition-all uppercase tracking-wider"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={cn(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              )}>
                {filteredLeads.map((lead) => (
                  <motion.div
                    layoutId={lead.id}
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={cn(
                      "dashboard-card group cursor-pointer relative overflow-hidden",
                      selectedLeadId === lead.id && "border-accent ring-1 ring-accent/30",
                      selectedIds.has(lead.id) && "ring-2 ring-accent border-accent bg-accent/5"
                    )}
                  >
                    {/* Selection Checkbox */}
                    <div 
                      onClick={(e) => toggleSelect(lead.id, e)}
                      className={cn(
                        "absolute top-4 right-4 w-5 h-5 rounded-md border flex items-center justify-center transition-all z-10",
                        selectedIds.has(lead.id) ? "bg-accent border-accent" : "border-border bg-slate-900 group-hover:border-slate-500"
                      )}
                    >
                      {selectedIds.has(lead.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>

                    <div className="flex justify-between items-start mb-4">
                      <div className={cn("status-badge capitalize", `status-${lead.status}`)}>
                        {lead.status}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">
                          {lead.leadScore}% Score
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-display font-bold text-slate-100 group-hover:text-accent transition-colors truncate">
                        {lead.company}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{lead.industry}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="score-badge">
                        <span className="score-value">{lead.urgencyScore}</span>
                        <span className="score-label">Urgency</span>
                      </div>
                      <div className="score-badge">
                        <span className="score-value">{(lead.probability * 100).toFixed(0)}%</span>
                        <span className="score-label">Prob.</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Globe className="w-3 h-3 text-slate-600" />
                        <span className="truncate">{lead.website?.replace(/^https?:\/\//, '')}</span>
                      </div>
                      {lead.contactInfo.email && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <Mail className="w-3 h-3 text-slate-600" />
                          <span className="truncate">{lead.contactInfo.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const statuses: LeadStatus[] = ['new', 'contacted', 'interested', 'follow-up', 'closed'];
                            const currentIndex = statuses.indexOf(lead.status);
                            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                            updateLeadStatus(lead.id, nextStatus);
                          }}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-accent transition-all group/btn relative"
                          title={`Change Status (Current: ${lead.status})`}
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-border px-2 py-1 rounded text-[9px] font-bold text-white opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none transition-all">Next Status</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadId(lead.id);
                          }}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-all group/btn relative"
                          title="Add Note"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-border px-2 py-1 rounded text-[9px] font-bold text-white opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none transition-all">Add Note</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadId(lead.id);
                          }}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-400 transition-all group/btn relative"
                          title="Schedule Follow-up"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-border px-2 py-1 rounded text-[9px] font-bold text-white opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none transition-all">Schedule</span>
                        </button>
                      </div>
                      <button className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Report <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Detail Matrix Panel */}
        <AnimatePresence>
          {selectedLead && (
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-[450px] bg-surface border-l border-border flex flex-col shadow-2xl relative z-40"
            >
              {/* Panel Header */}
              <div className="p-6 border-b border-border bg-slate-900/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-100 uppercase text-xs tracking-wider">Intelligence Data</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Lead ID: {selectedLead.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => deleteLead(selectedLead.id)}
                    className="p-2 hover:bg-danger/10 text-slate-600 hover:text-danger rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSelectedLeadId(null)}
                    className="p-2 hover:bg-slate-800 text-slate-500 hover:text-slate-100 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="p-6 space-y-8">
                  {/* Company Profile */}
                  <section>
                    <h4 className="text-2xl font-display font-bold text-white mb-1">{selectedLead.company}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">{selectedLead.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      <select 
                        value={selectedLead.status}
                        onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value as LeadStatus)}
                        className="bg-slate-900 border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-accent outline-none"
                      >
                        <option value="new">NEW LEAD</option>
                        <option value="contacted">CONTACTED</option>
                        <option value="interested">INTERESTED</option>
                        <option value="follow-up">FOLLOW-UP</option>
                        <option value="closed">CLOSED</option>
                        <option value="rejected">REJECTED</option>
                      </select>
                      <div className="px-3 py-1.5 bg-slate-900 border border-border rounded-lg text-xs font-bold text-slate-400">
                        {selectedLead.businessSize} SIZE
                      </div>
                    </div>

                    {/* Contact Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedLead.website && (
                        <a href={selectedLead.website} target="_blank" className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-border hover:border-accent transition-all group">
                          <Globe className="w-4 h-4 text-slate-500 group-hover:text-accent" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Website</span>
                            <span className="text-xs text-slate-200 truncate w-32">Visit Domain</span>
                          </div>
                        </a>
                      )}
                      {selectedLead.contactInfo.email && (
                        <a href={`mailto:${selectedLead.contactInfo.email}`} className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-border hover:border-accent transition-all group">
                          <Mail className="w-4 h-4 text-slate-500 group-hover:text-accent" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Direct Email</span>
                            <span className="text-xs text-slate-200 truncate w-32">{selectedLead.contactInfo.email}</span>
                          </div>
                        </a>
                      )}
                    </div>
                  </section>

                  {/* Audit Matrix */}
                  <section className="bg-slate-900/50 border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent" />
                        <h5 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Follow-up Schedule</h5>
                      </div>
                      {selectedLead.followUpAt && (
                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-[9px] font-bold rounded uppercase">
                          Scheduled
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <input 
                          type="datetime-local" 
                          defaultValue={selectedLead.followUpAt ? selectedLead.followUpAt.slice(0, 16) : ''}
                          onChange={(e) => {
                            if (e.target.value) setFollowUpReminder(selectedLead.id, e.target.value);
                          }}
                          className="w-full bg-slate-900 border border-border rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent transition-all [color-scheme:dark]"
                        />
                        <div className="mt-2 flex justify-between items-center text-[10px] font-medium text-slate-500">
                          <span>Select date & time for check-in</span>
                          {selectedLead.followUpAt && (
                            <button 
                              onClick={() => {
                                const leadRef = doc(db, 'leads', selectedLead.id);
                                updateDoc(leadRef, { followUpAt: null, reminderSent: false });
                              }}
                              className="text-danger hover:underline uppercase font-bold"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Audit Matrix */}
                  <section className="bg-slate-900/50 border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Shield className="w-4 h-4 text-accent" />
                      <h5 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Site Audit Matrix</h5>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-500">Security</span>
                          {selectedLead.audit.noSSL ? <span className="text-danger font-bold uppercase text-[10px]">No SSL</span> : <span className="text-success font-bold uppercase text-[10px]">Secure</span>}
                        </div>
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-500">Mobile UX</span>
                          {selectedLead.audit.poorMobile ? <span className="text-danger font-bold uppercase text-[10px]">Outdated</span> : <span className="text-success font-bold uppercase text-[10px]">Modern</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-500">Performance</span>
                          {selectedLead.audit.slowSpeed ? <span className="text-warning font-bold uppercase text-[10px]">Slow Load</span> : <span className="text-success font-bold uppercase text-[10px]">Fast</span>}
                        </div>
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-500">Branding</span>
                          <span className={cn(
                            "font-bold uppercase text-[10px]",
                            selectedLead.audit.brandingConsistency === 'poor' ? "text-danger" : 
                            selectedLead.audit.brandingConsistency === 'fair' ? "text-warning" : "text-success"
                          )}>
                            {selectedLead.audit.brandingConsistency}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 block">Website Problems</span>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {selectedLead.audit.websiteProblems?.map((issue, idx) => (
                            <span key={idx} className="px-2 py-1 bg-danger/10 text-danger text-[10px] font-bold rounded-lg border border-danger/20">
                              {issue}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 block">Branding Issues</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedLead.audit.brandingIssues?.map((issue, idx) => (
                            <span key={idx} className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-lg border border-amber-500/20">
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Outreach Strategy */}
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <Target className="w-4 h-4 text-accent" />
                      <h5 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Outreach Strategy</h5>
                    </div>
                    
                    <div className="p-5 bg-accent/5 border border-accent/20 rounded-2xl mb-4">
                      <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Best Outreach Angle</div>
                      <p className="text-sm text-slate-300 font-medium italic">"{selectedLead.outreach.bestAngle}"</p>
                    </div>

                    <div className="space-y-4">
                      <div className="dashboard-card !p-5 !bg-slate-900 border-border">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                          AI Redesign Plan
                          <Zap className="w-3 h-3 text-accent" />
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-3 hover:line-clamp-none transition-all">{selectedLead.outreach.redesignStrategy}</p>
                      </div>

                      <div className="relative">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Copywriter Proposal</div>
                        <div className="p-5 bg-slate-900 rounded-2xl border border-border font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                          {selectedLead.outreach.coldMessage}
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedLead.outreach.coldMessage);
                          }}
                          className="absolute top-10 right-4 p-2 bg-accent text-white rounded-lg shadow-lg hover:bg-accent-hover transition-all"
                          title="Copy Email Copy"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="relative">
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <MessageCircle className="w-3 h-3" /> WhatsApp Opener
                        </div>
                        <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 font-sans text-xs text-slate-300 italic leading-relaxed">
                          "{selectedLead.outreach.whatsappMessage}"
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedLead.outreach.whatsappMessage);
                          }}
                          className="absolute top-10 right-4 p-2 bg-emerald-500 text-white rounded-lg shadow-lg hover:bg-emerald-600 transition-all"
                          title="Copy WhatsApp Copy"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* History & Notes */}
                  <section className="pb-10">
                    <div className="flex items-center gap-2 mb-6">
                      <History className="w-4 h-4 text-slate-500" />
                      <h5 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Lead History</h5>
                    </div>

                    <div className="space-y-4 mb-6">
                      {selectedLead.history.slice().reverse().map((event, idx) => (
                        <div key={idx} className="flex gap-4 group">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5",
                              event.type === 'discovered' ? "bg-blue-500" :
                              event.type === 'status_change' ? "bg-amber-500" :
                              event.type === 'contacted' ? "bg-emerald-500" : "bg-slate-600"
                            )} />
                            <div className="w-px flex-1 bg-border my-1 group-last:hidden" />
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tight">{event.type.replace('_', ' ')}</span>
                              <span className="text-[9px] text-slate-600 font-mono">{formatTimestamp(event.timestamp)}</span>
                            </div>
                            <p className="text-xs text-slate-500 italic">{event.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="relative">
                      <textarea
                        placeholder="Add a private note for this lead..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const val = (e.target as HTMLTextAreaElement).value;
                            if (val.trim()) {
                              addLeadNote(selectedLead.id, val);
                              (e.target as HTMLTextAreaElement).value = '';
                            }
                          }
                        }}
                        className="w-full h-24 bg-slate-900 border border-border rounded-xl p-4 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
                      />
                      <div className="absolute right-3 bottom-3 flex items-center gap-2 text-[9px] font-bold text-slate-700">
                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-border">Enter</kbd> to save
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Bottom Outreach Bar */}
              <div className="p-6 border-t border-border bg-slate-950/50 grid grid-cols-2 gap-3 shrink-0">
                <button 
                  onClick={() => {
                    const phone = selectedLead.contactInfo.phone?.replace(/\D/g, '');
                    const message = encodeURIComponent(selectedLead.outreach.whatsappMessage);
                    if (phone) window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                  }}
                  disabled={!selectedLead.contactInfo.phone}
                  className="flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:grayscale"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button 
                  onClick={() => {
                    const subject = encodeURIComponent(`Question about ${selectedLead.company}'s Digital Presence`);
                    const body = encodeURIComponent(selectedLead.outreach.coldMessage);
                    window.location.href = `mailto:${selectedLead.contactInfo.email}?subject=${subject}&body=${body}`;
                  }}
                  disabled={!selectedLead.contactInfo.email}
                  className="flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 disabled:opacity-30"
                >
                  <Send className="w-4 h-4" /> Send Email
                </button>
                
                <div className="col-span-2 grid grid-cols-3 gap-2 mt-1">
                  <a href={selectedLead.contactInfo.linkedin} target="_blank" className={cn("p-2 bg-slate-900 border border-border rounded-lg flex items-center justify-center hover:border-accent transition-all", !selectedLead.contactInfo.linkedin && "opacity-30 pointer-events-none")}>
                    <Linkedin className="w-4 h-4 text-slate-500" />
                  </a>
                  <a href={selectedLead.contactInfo.instagram} target="_blank" className={cn("p-2 bg-slate-900 border border-border rounded-lg flex items-center justify-center hover:border-accent transition-all", !selectedLead.contactInfo.instagram && "opacity-30 pointer-events-none")}>
                    <Instagram className="w-4 h-4 text-slate-500" />
                  </a>
                  <a href={selectedLead.contactInfo.facebook} target="_blank" className={cn("p-2 bg-slate-900 border border-border rounded-lg flex items-center justify-center hover:border-accent transition-all", !selectedLead.contactInfo.facebook && "opacity-30 pointer-events-none")}>
                    <Facebook className="w-4 h-4 text-slate-500" />
                  </a>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Persistence Notification */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-panel px-6 py-4 rounded-2xl flex items-center gap-4 z-50 border-accent/30"
          >
            <div className="w-10 h-10 border-4 border-slate-900 border-t-accent rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-sm font-bold text-white leading-none mb-1">Agent Scout in Progress</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Saving high-value intelligence to encrypted core...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: -32, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 min-w-[600px] z-[60]"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-accent/50 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  {selectedIds.size}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Leads Selected</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ready for Batch Operations</p>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-800 mx-2"></div>

              <div className="flex items-center gap-2">
                <select 
                  onChange={(e) => handleBulkStatusUpdate(e.target.value as LeadStatus)}
                  className="bg-slate-950 border border-border px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-300 outline-none hover:border-accent transition-all uppercase"
                  disabled={isBulkUpdating}
                >
                  <option value="">Update Status</option>
                  <option value="contacted">Mark Contacted</option>
                  <option value="interested">Mark Interested</option>
                  <option value="follow-up">Mark Follow-up</option>
                  <option value="closed">Mark Closed</option>
                </select>

                <button 
                  onClick={() => {
                    const note = prompt("Enter a note for all selected leads:");
                    if (note) handleBulkNote(note);
                  }}
                  disabled={isBulkUpdating}
                  className="px-4 py-1.5 bg-slate-950 border border-border rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:border-slate-600 transition-all uppercase flex items-center gap-2"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Batch Note
                </button>

                <button 
                  onClick={handleBulkCSV}
                  className="px-4 py-1.5 bg-slate-950 border border-border rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:border-slate-600 transition-all uppercase flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Selection
                </button>

                <div className="flex bg-slate-950 border border-border rounded-lg p-1">
                  <button 
                    onClick={() => {
                      const selected = leads.filter(l => selectedIds.has(l.id));
                      selected.forEach((lead, idx) => {
                        if (lead.contactInfo.email) {
                          setTimeout(() => {
                            window.open(`mailto:${lead.contactInfo.email}?subject=Redesign Proposal for ${lead.company}&body=${encodeURIComponent(lead.outreach.coldMessage)}`, '_blank');
                          }, idx * 1000);
                        }
                      });
                    }}
                    className="px-4 py-2 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-accent transition-all flex items-center gap-2"
                    title="Bulk Email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => {
                      const selected = leads.filter(l => selectedIds.has(l.id));
                      selected.forEach((lead, idx) => {
                        const phone = lead.contactInfo.phone?.replace(/\D/g, '');
                        if (phone) {
                          setTimeout(() => {
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lead.outreach.whatsappMessage)}`, '_blank');
                          }, idx * 1000);
                        }
                      });
                    }}
                    className="px-4 py-2 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2"
                    title="Bulk WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setSelectedIds(new Set())}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
