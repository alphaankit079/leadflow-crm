import React, { useState, useEffect } from 'react';
import api from './api';
import { 
  Briefcase, Users, DollarSign, TrendingUp, Plus, Search, 
  LogOut, History, UserPlus, Building2, Upload, Download, 
  FileSpreadsheet, CheckCircle2, Sparkles, Trash2, Flame, 
  GripVertical, Filter, Calendar, PhoneCall, LayoutGrid, 
  List, Mail, CheckSquare, MessageSquare, Tag, Zap, 
  ChevronDown, ChevronUp, X, Clock, Send, Target, ShieldCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STAGES = [
  { key: 'NEW', label: 'New Leads', badge: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400', dot: 'bg-blue-500', hex: '#3b82f6' },
  { key: 'CONTACTED', label: 'Contacted', badge: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400', dot: 'bg-amber-500', hex: '#f59e0b' },
  { key: 'DEMO_SCHEDULED', label: 'Demo Scheduled', badge: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800 dark:text-purple-400', dot: 'bg-purple-500', hex: '#a855f7' },
  { key: 'NEGOTIATION', label: 'Negotiation', badge: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800 dark:text-indigo-400', dot: 'bg-indigo-500', hex: '#6366f1' },
  { key: 'WON', label: 'Closed Won', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400', dot: 'bg-emerald-500', hex: '#10b981' },
  { key: 'LOST', label: 'Closed Lost', badge: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800 dark:text-rose-400', dot: 'bg-rose-500', hex: '#f43f5e' }
];

const AVAILABLE_TAGS = ['Enterprise', 'VIP', 'Urgent', 'Inbound', 'Q4-Target', 'SMB'];

const EMAIL_TEMPLATES = [
  {
    name: 'Intro & Discovery Call',
    subject: 'Quick question regarding {{company}} growth workflow',
    body: 'Hi {{name}},\n\nI noticed {{company}} is scaling rapidly. We help teams like yours streamline their B2B revenue operations.\n\nAre you open to a quick 10-minute discovery call this Thursday?\n\nBest regards,\nLeadFlow Team'
  },
  {
    name: 'Post-Demo Follow Up',
    subject: 'Great speaking today + Next steps for {{company}}',
    body: 'Hi {{name}},\n\nThank you for your time on the product demo today! As discussed, I have attached the custom enterprise architecture overview for {{company}}.\n\nLet me know if you have any questions before we finalize the proposal.\n\nWarm regards,\nLeadFlow Team'
  },
  {
    name: 'Commercial Proposal & Discount',
    subject: 'Custom Commercial Proposal for {{company}}',
    body: 'Hi {{name}},\n\nFollowing up on our negotiation, our leadership has approved a special 15% annual volume discount for {{company}} if we close before the end of this month.\n\nLooking forward to welcoming you onboard!\n\nBest,\nLeadFlow Team'
  }
];

// 🤖 Algorithmic Lead Scoring Engine (0 - 100)
const calculateLeadScore = (lead) => {
  if (lead.stage === 'LOST') return 5;
  if (lead.stage === 'WON') return 100;
  let score = 20;
  if (lead.dealValue >= 500000) score += 30;
  else if (lead.dealValue >= 200000) score += 20;
  else if (lead.dealValue >= 100000) score += 10;

  const stageBonus = { NEW: 5, CONTACTED: 15, DEMO_SCHEDULED: 30, NEGOTIATION: 42 };
  score += stageBonus[lead.stage] || 0;

  const interactions = (lead.notes?.length || 0) * 5 + (lead.comments?.length || 0) * 3 + (lead.emails?.length || 0) * 6;
  score += Math.min(interactions, 20);

  return Math.min(score, 98);
};

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('crm_user')) || null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authForm, setAuthForm] = useState({ companyName: '', adminName: '', email: '', password: '' });

  const [leads, setLeads] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(false);
  const [staleAlerts, setStaleAlerts] = useState({ count: 0, leads: [] });
  const [analytics, setAnalytics] = useState({ 
    totalLeads: 0, totalPipelineValue: 0, forecastedRevenue: 0, wonRevenue: 0, conversionRate: 0, stageChartData: [] 
  });
  
  // UI View & Theme State
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('KANBAN'); // 'KANBAN' or 'TABLE'
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [hotDealsOnly, setHotDealsOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');

  // Drag & Drop State
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Modals & Slide-Over Drawer State
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('CHAT'); // 'CHAT' | 'CALLS' | 'TASKS' | 'EMAIL'

  // Drawer Action Inputs
  const [commentText, setCommentText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [callOutcome, setCallOutcome] = useState('CONNECTED');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // CSV Upload States
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvSummary, setCsvSummary] = useState(null);

  // Forms
  const [leadForm, setLeadForm] = useState({ 
    name: '', companyName: '', email: '', phone: '', dealValue: '', 
    currency: 'INR', probability: 25, expectedCloseDate: '', tags: ['Enterprise'] 
  });
  const [memberForm, setMemberForm] = useState({ name: '', email: '', password: '', role: 'REP' });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let queryUrl = `/leads?search=${search}`;
      if (startDate) queryUrl += `&startDate=${startDate}`;
      if (endDate) queryUrl += `&endDate=${endDate}`;
      if (currencyFilter !== 'ALL') queryUrl += `&currency=${currencyFilter}`;
      if (tagFilter !== 'ALL') queryUrl += `&tag=${tagFilter}`;

      const [leadsRes, analyticsRes, teamRes, staleRes] = await Promise.all([
        api.get(queryUrl),
        api.get('/leads/analytics'),
        api.get('/auth/team'),
        api.get('/leads/stale-alerts')
      ]);
      setLeads(leadsRes.data);
      setAnalytics(analyticsRes.data);
      setTeam(teamRes.data);
      setStaleAlerts(staleRes.data);

      if (selectedLead) {
        const refreshed = leadsRes.data.find(l => l._id === selectedLead._id);
        if (refreshed) setSelectedLead(refreshed);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, search, startDate, endDate, currencyFilter, tagFilter]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? '/auth/register-company' : '/auth/login';
      const { data } = await api.post(endpoint, authForm);
      localStorage.setItem('crm_token', data.token);
      localStorage.setItem('crm_user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (err) {
      alert(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leads', leadForm);
      setShowLeadModal(false);
      setLeadForm({ 
        name: '', companyName: '', email: '', phone: '', dealValue: '', 
        currency: 'INR', probability: 25, expectedCloseDate: '', tags: ['Enterprise'] 
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create lead');
    }
  };

  const toggleLeadFormTag = (tag) => {
    setLeadForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  const handleStageChange = async (leadId, newStage) => {
    try {
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, stage: newStage } : l));
      const { data } = await api.patch(`/leads/${leadId}/stage`, { stage: newStage });
      if (selectedLead?._id === leadId) setSelectedLead(data);
      fetchDashboardData();
    } catch (err) {
      alert('Failed to update stage');
      fetchDashboardData();
    }
  };

  const onDragStart = (e, leadId) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, stageKey) => {
    e.preventDefault();
    if (dragOverStage !== stageKey) setDragOverStage(stageKey);
  };

  const onDrop = (e, targetStageKey) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedLeadId) return;

    const lead = leads.find(l => l._id === draggedLeadId);
    if (lead && lead.stage !== targetStageKey) {
      handleStageChange(draggedLeadId, targetStageKey);
    }
    setDraggedLeadId(null);
  };

  const handleAssignChange = async (leadId, newMemberId) => {
    const member = team.find(m => m._id === newMemberId);
    if (!member) return;
    try {
      await api.patch(`/leads/${leadId}/assign`, {
        assignedToId: member._id,
        assignedToName: member.name
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign lead');
    }
  };

  // Drawer Collaboration Handlers
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedLead) return;
    try {
      const { data } = await api.post(`/leads/${selectedLead._id}/comments`, { text: commentText });
      setSelectedLead(data);
      setCommentText('');
      fetchDashboardData();
    } catch (err) {
      alert('Failed to post comment');
    }
  };

  const handleAddCallNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedLead) return;
    try {
      const { data } = await api.post(`/leads/${selectedLead._id}/call-notes`, { text: noteText, callOutcome });
      setSelectedLead(data);
      setNoteText('');
      fetchDashboardData();
    } catch (err) {
      alert('Failed to log call note');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !selectedLead) return;
    try {
      const { data } = await api.post(`/leads/${selectedLead._id}/tasks`, { title: taskTitle, dueDate: taskDueDate });
      setSelectedLead(data);
      setTaskTitle('');
      setTaskDueDate('');
      fetchDashboardData();
    } catch (err) {
      alert('Failed to add task');
    }
  };

  const handleToggleTask = async (taskId) => {
    if (!selectedLead) return;
    try {
      const { data } = await api.patch(`/leads/${selectedLead._id}/tasks/${taskId}`);
      setSelectedLead(data);
      fetchDashboardData();
    } catch (err) {
      alert('Failed to update task');
    }
  };

  const applyEmailTemplate = (tpl) => {
    if (!selectedLead) return;
    setEmailSubject(tpl.subject.replace(/{{company}}/g, selectedLead.companyName).replace(/{{name}}/g, selectedLead.name));
    setEmailBody(tpl.body.replace(/{{company}}/g, selectedLead.companyName).replace(/{{name}}/g, selectedLead.name));
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim() || !selectedLead) return;
    try {
      const { data } = await api.post(`/leads/${selectedLead._id}/send-email`, { 
        subject: emailSubject, 
        body: emailBody 
      });
      setSelectedLead(data);
      setEmailSubject('');
      setEmailBody('');
      fetchDashboardData();
      alert(`Email dispatched to ${selectedLead.email}!`);
    } catch (err) {
      alert('Failed to send email');
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Delete this lead permanently?')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      if (selectedLead?._id === leadId) setSelectedLead(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleSeedDemo = async () => {
    try {
      await api.post('/leads/seed-demo');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load demo data');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/add-member', memberForm);
      alert(`Team member (${memberForm.role}) added! They can now login.`);
      setShowMemberModal(false);
      setMemberForm({ name: '', email: '', password: '', role: 'REP' });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding member');
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return alert('Please select a CSV file first');
    const formData = new FormData();
    formData.append('file', csvFile);
    try {
      setCsvUploading(true);
      const { data } = await api.post('/leads/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCsvSummary(data.summary);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'CSV Import failed');
    } finally {
      setCsvUploading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.get('/leads/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  const handleDownloadSampleCsv = () => {
    const sampleContent = [
      'name,companyName,email,phone,dealValue',
      'Rohan Sharma,Razorpay,rohan@razorpay.com,9876543210,425000',
      'Priya Verma,Zomato,priya@zomato.com,9811122233,185000',
      'Aman Gupta,Blinkit,aman@blinkit.com,9988776655,610000'
    ].join('\n');
    const blob = new Blob([sampleContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample-b2b-leads.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredLeads = leads.filter(lead => {
    if (ownerFilter !== 'ALL' && lead.assignedTo?._id !== ownerFilter) return false;
    if (hotDealsOnly && lead.dealValue < 300000) return false;
    return true;
  });

  // ============================================================================
  // AUTH SCREEN (GLASSMORPHIC ENTERPRISE LOGIN)
  // ============================================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 text-white z-10">
          <div className="flex items-center gap-3 text-indigo-400 font-bold text-2xl mb-2">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/30">
              <Building2 className="w-6 h-6" />
            </div>
            LeadFlow Enterprise
          </div>
          <p className="text-slate-400 text-sm mb-6">
            {isRegistering ? 'Launch your multi-tenant B2B revenue workspace' : 'Sign in to your company revenue workspace'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <>
                <input
                  type="text" placeholder="Company Name (e.g. Acme SaaS)" required
                  className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={authForm.companyName}
                  onChange={(e) => setAuthForm({ ...authForm, companyName: e.target.value })}
                />
                <input
                  type="text" placeholder="Your Full Name (Workspace Admin)" required
                  className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={authForm.adminName}
                  onChange={(e) => setAuthForm({ ...authForm, adminName: e.target.value })}
                />
              </>
            )}
            <input
              type="email" placeholder="Work Email Address" required
              className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            />
            <input
              type="password" placeholder="Password" required
              className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/25 transition cursor-pointer">
              {isRegistering ? 'Create Enterprise Workspace' : 'Sign In to Workspace'}
            </button>
          </form>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-center text-sm text-indigo-400 mt-5 hover:underline cursor-pointer"
          >
            {isRegistering ? 'Already have a workspace? Sign in' : 'New organization? Create a Workspace'}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN CRM DASHBOARD
  // ============================================================================
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/80 text-slate-800'} flex flex-col transition-colors font-sans`}>
      
      {/* Top Enterprise Command Navbar */}
      <header className={`${darkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/90 border-slate-200/80 text-slate-800'} backdrop-blur-md border-b px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 transition-colors`}>
        <div className="flex items-center gap-3.5">
          <div className="bg-linear-to-br from-indigo-600 to-violet-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight leading-none">{user.company || 'Enterprise Workspace'}</h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                {user.role}
              </span>
            </div>
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Active Operator: <strong>{user.name}</strong>
            </span>
          </div>
        </div>

        {/* Global Search & Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text" placeholder="Search leads, companies, emails..."
              className={`pl-9 pr-4 py-2 border rounded-xl text-xs w-60 focus:w-72 transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-100/80 border-slate-200 text-slate-800 focus:bg-white'}`}
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* View Mode Switcher: Kanban vs Table */}
          <div className={`flex items-center p-1 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${viewMode === 'KANBAN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${viewMode === 'TABLE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              <List className="w-3.5 h-3.5" /> Table
            </button>
          </div>

          {(user.role === 'ADMIN' || user.role === 'MANAGER') && leads.length === 0 && (
            <button
              onClick={handleSeedDemo}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-500/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Seed 6 Enterprise Deals
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold cursor-pointer transition ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>

          {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
            <>
              <button
                onClick={() => { setCsvSummary(null); setCsvFile(null); setShowCsvModal(true); }}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold cursor-pointer ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </button>

              <button
                onClick={() => setShowMemberModal(true)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold cursor-pointer ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Team
              </button>
            </>
          )}

          <button
            onClick={() => setShowLeadModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" /> New Deal
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-xl border cursor-pointer transition ${darkMode ? 'border-slate-700 bg-slate-800 text-amber-400 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
            title="Toggle Theme"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 cursor-pointer" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ⚠️ Automated Follow-up Stale Lead Banner */}
      {staleAlerts.count > 0 && (
        <div className="mx-6 mt-4 bg-linear-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="bg-amber-500 text-white font-bold px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase animate-pulse">
              {staleAlerts.count} SLA BREACH RISK
            </span>
            <span className={darkMode ? 'text-amber-200' : 'text-amber-900'}>
              <strong>Follow-up Required:</strong> {staleAlerts.count} deal(s) have been untouched in New/Contacted for 3+ days.
            </span>
          </div>
          <div className="flex gap-1.5">
            {staleAlerts.leads.slice(0, 3).map(l => (
              <span key={l._id} className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${darkMode ? 'bg-slate-900 border-amber-500/30 text-amber-300' : 'bg-white border-amber-200 text-slate-800'}`}>
                {l.name} ({l.companyName})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Executive KPI Cards (5 Enterprise Metrics Including Weighted Forecast) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 px-6 pt-5 pb-3">
        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'} p-4 rounded-2xl border shadow-2xs flex items-center justify-between`}>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Active Deals</p>
            <p className="text-2xl font-extrabold mt-1">{analytics.totalLeads}</p>
            <span className="text-[10px] text-emerald-500 font-medium">Multi-tenant isolated</span>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500"><Users className="w-5 h-5" /></div>
        </div>

        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'} p-4 rounded-2xl border shadow-2xs flex items-center justify-between`}>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total Pipeline</p>
            <p className="text-2xl font-extrabold mt-1">₹{analytics.totalPipelineValue.toLocaleString()}</p>
            <span className="text-[10px] text-slate-400">Gross open deal volume</span>
          </div>
          <div className="bg-purple-500/10 p-3 rounded-xl text-purple-500"><Briefcase className="w-5 h-5" /></div>
        </div>

        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'} p-4 rounded-2xl border shadow-2xs flex items-center justify-between`}>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-indigo-400">Weighted Forecast</p>
            <p className="text-2xl font-extrabold text-indigo-500 mt-1">₹{(analytics.forecastedRevenue || 0).toLocaleString()}</p>
            <span className="text-[10px] text-slate-400">Adjusted by win probability %</span>
          </div>
          <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-500"><Target className="w-5 h-5" /></div>
        </div>

        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'} p-4 rounded-2xl border shadow-2xs flex items-center justify-between`}>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Closed Won Revenue</p>
            <p className="text-2xl font-extrabold text-emerald-500 mt-1">₹{analytics.wonRevenue.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-500 font-medium">Booked revenue</span>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500"><DollarSign className="w-5 h-5" /></div>
        </div>

        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'} p-4 rounded-2xl border shadow-2xs flex items-center justify-between`}>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Win Velocity</p>
            <p className="text-2xl font-extrabold text-amber-500 mt-1">{analytics.conversionRate}%</p>
            <span className="text-[10px] text-slate-400">Lead-to-Won ratio</span>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500"><TrendingUp className="w-5 h-5" /></div>
        </div>
      </div>

      {/* Collapsible Visual Analytics & Funnel Conversion Section */}
      <div className="px-6 pb-3">
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
            className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
          >
            {showAnalyticsPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAnalyticsPanel ? 'Hide Revenue Intelligence & Funnel Drop-off' : 'Show Revenue Intelligence & Funnel Drop-off'}
          </button>
        </div>

        {showAnalyticsPanel && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart 1: Stage Count */}
            <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'} p-4 rounded-2xl border shadow-2xs`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Deal Distribution by Stage</h3>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.stageChartData || []}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: darkMode ? '#0f172a' : '#fff' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {(analytics.stageChartData || []).map((entry, idx) => (
                        <Cell key={idx} fill={STAGES[idx]?.hex || '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Stage Revenue */}
            <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'} p-4 rounded-2xl border shadow-2xs`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Stage-wise Revenue Volume (₹)</h3>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.stageChartData || []}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                    <Tooltip formatter={(val) => [`₹${val.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '12px', backgroundColor: darkMode ? '#0f172a' : '#fff' }} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Sales Funnel Conversion & Drop-Off Bars */}
            <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'} p-4 rounded-2xl border shadow-2xs flex flex-col justify-between`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Sales Funnel Stage Retention</h3>
              <div className="space-y-2.5 my-auto">
                {(analytics.stageChartData || []).slice(0, 5).map((stg, idx) => (
                  <div key={stg.name} className="text-xs">
                    <div className="flex justify-between font-semibold mb-1">
                      <span>{stg.name}</span>
                      <span className="text-slate-400">{stg.count} deals ({stg.conversionPct}%)</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div
                        style={{ width: `${Math.max(stg.conversionPct, 4)}%`, backgroundColor: STAGES[idx]?.hex }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Faceted Filter Ribbon */}
      <div className="px-6 pb-4">
        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'} border rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase mr-1">
              <Filter className="w-3.5 h-3.5 text-indigo-500" /> Filters:
            </span>

            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className={`text-xs border rounded-xl px-3 py-1.5 font-medium cursor-pointer outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
            >
              <option value="ALL">All Owners ({leads.length})</option>
              {team.map(member => (
                <option key={member._id} value={member._id}>{member.name}</option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className={`text-xs border rounded-xl px-3 py-1.5 font-medium cursor-pointer outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
            >
              <option value="ALL">All Tags</option>
              {AVAILABLE_TAGS.map(t => (
                <option key={t} value={t}>🏷️ {t}</option>
              ))}
            </select>

            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className={`text-xs border rounded-xl px-3 py-1.5 font-medium cursor-pointer outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
            >
              <option value="ALL">All Currencies</option>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>

            <button
              onClick={() => setHotDealsOnly(!hotDealsOnly)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border font-semibold transition cursor-pointer ${
                hotDealsOnly
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-500'
                  : darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-500" /> High Value (₹3L+)
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`border rounded-xl px-2.5 py-1 outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`border rounded-xl px-2.5 py-1 outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
            />
            {(startDate || endDate || tagFilter !== 'ALL' || ownerFilter !== 'ALL' || hotDealsOnly) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setTagFilter('ALL'); setOwnerFilter('ALL'); setHotDealsOnly(false); }}
                className="text-indigo-500 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: KANBAN PIPELINE BOARD                                         */}
      {/* ===================================================================== */}
      {viewMode === 'KANBAN' ? (
        <div className="flex-1 px-6 pb-8 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage.key);
              const stageValue = stageLeads.reduce((sum, l) => sum + l.dealValue, 0);
              const isDragTarget = dragOverStage === stage.key;

              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => onDragOver(e, stage.key)}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => onDrop(e, stage.key)}
                  className={`w-80 rounded-2xl p-3 flex flex-col max-h-[68vh] transition-all ${
                    isDragTarget
                      ? 'bg-indigo-500/10 ring-2 ring-indigo-500 ring-dashed'
                      : darkMode ? 'bg-slate-900/70 border border-slate-800/90' : 'bg-slate-100/90 border border-slate-200/60'
                  }`}
                >
                  {/* Column Header */}
                  <div className="px-2 py-1.5 flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider">{stage.label}</h4>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          ₹{stageValue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700 shadow-2xs'}`}>
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Lead Cards Stack */}
                  <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                    {stageLeads.map((lead) => {
                      const score = calculateLeadScore(lead);
                      const currSymbol = lead.currency === 'USD' ? '$' : '₹';
                      const pendingTasks = (lead.tasks || []).filter(t => !t.completed).length;

                      return (
                        <div
                          key={lead._id}
                          draggable
                          onDragStart={(e) => onDragStart(e, lead._id)}
                          onClick={() => setSelectedLead(lead)}
                          className={`group p-4 rounded-2xl border shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${
                            darkMode ? 'bg-slate-800/90 border-slate-700/80 hover:border-indigo-500/50' : 'bg-white border-slate-200/90 hover:border-indigo-300'
                          }`}
                        >
                          {/* Top Row: Company Pill + AI Lead Score */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 -ml-1 cursor-grab" />
                              <span className="text-[11px] font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg">
                                {lead.companyName}
                              </span>
                            </div>

                            {/* AI Lead Score Badge */}
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                score >= 75 ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' :
                                score >= 45 ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' :
                                'bg-slate-500/15 text-slate-400'
                              }`} title="AI Engagement & Deal Score">
                                <Zap className="w-2.5 h-2.5" /> {score}
                              </span>
                            </div>
                          </div>

                          {/* Lead Name & Contact */}
                          <h3 className="font-bold text-sm mt-2.5 group-hover:text-indigo-500 transition-colors">{lead.name}</h3>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{lead.email}</p>

                          {/* Tags Row */}
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {lead.tags.map(t => (
                                <span key={t} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Deal Value & Probability Progress */}
                          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                            <div>
                              <span className="text-sm font-extrabold">
                                {currSymbol}{lead.dealValue.toLocaleString()}
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                Win Prob: <strong>{lead.probability ?? 25}%</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400" onClick={(e) => e.stopPropagation()}>
                              {pendingTasks > 0 && (
                                <span className="text-[10px] bg-amber-500/15 text-amber-500 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Pending Tasks">
                                  <CheckSquare className="w-3 h-3" /> {pendingTasks}
                                </span>
                              )}
                              <select
                                value={lead.stage}
                                onChange={(e) => handleStageChange(lead._id, e.target.value)}
                                className={`text-[11px] font-semibold border rounded-lg px-2 py-1 cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                              >
                                {STAGES.map((s) => (
                                  <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Card Footer: Owner & Close Date */}
                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                                {(lead.assignedTo?.name || user.name).charAt(0)}
                              </div>
                              {(user.role === 'ADMIN' || user.role === 'MANAGER') ? (
                                <select
                                  value={lead.assignedTo?._id || ''}
                                  onChange={(e) => handleAssignChange(lead._id, e.target.value)}
                                  className="font-semibold bg-transparent outline-none cursor-pointer text-slate-500 dark:text-slate-300"
                                >
                                  {team.map(m => (
                                    <option key={m._id} value={m._id} className={darkMode ? 'bg-slate-900' : ''}>{m.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span>{lead.assignedTo?.name || user.name}</span>
                              )}
                            </div>

                            {lead.expectedCloseDate && (
                              <span className="flex items-center gap-1 text-[10px]" title="Expected Close Date">
                                <Clock className="w-3 h-3" />
                                {new Date(lead.expectedCloseDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {stageLeads.length === 0 && (
                      <div className={`text-center py-10 border-2 border-dashed rounded-2xl ${darkMode ? 'border-slate-800 text-slate-600' : 'border-slate-200/80 text-slate-400'}`}>
                        <p className="text-xs font-medium">No deals in {stage.label}</p>
                        <p className="text-[10px] mt-0.5">Drag & drop a card here</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* VIEW 2: COMPACT ENTERPRISE DATA TABLE VIEW                          */
        /* =================================================================== */
        <div className="flex-1 px-6 pb-8 overflow-x-auto">
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xs overflow-hidden`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider font-bold text-slate-400 ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <th className="py-3.5 px-4">Lead & Company</th>
                  <th className="py-3.5 px-4">AI Score</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">Deal Value</th>
                  <th className="py-3.5 px-4">Forecast Prob</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
                {filteredLeads.map(lead => {
                  const score = calculateLeadScore(lead);
                  const stgObj = STAGES.find(s => s.key === lead.stage) || STAGES[0];
                  return (
                    <tr 
                      key={lead._id} 
                      onClick={() => setSelectedLead(lead)}
                      className={`cursor-pointer transition ${darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-indigo-50/40'}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm">{lead.name}</div>
                        <div className="text-slate-400 text-[11px]">{lead.companyName} • {lead.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-extrabold px-2.5 py-1 rounded-full text-[11px] inline-flex items-center gap-1 ${
                          score >= 75 ? 'bg-emerald-500/15 text-emerald-500' : score >= 45 ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-500/15 text-slate-400'
                        }`}>
                          <Zap className="w-3 h-3" /> {score}/100
                        </span>
                      </td>
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.stage}
                          onChange={(e) => handleStageChange(lead._id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${stgObj.badge}`}
                        >
                          {STAGES.map(s => <option key={s.key} value={s.key} className="bg-slate-900 text-white">{s.label}</option>)}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-sm">
                        {lead.currency === 'USD' ? '$' : '₹'}{lead.dealValue.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div style={{ width: `${lead.probability ?? 25}%` }} className="h-full bg-indigo-500 rounded-full" />
                          </div>
                          <span className="font-semibold">{lead.probability ?? 25}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(lead.tags || []).map(t => (
                            <span key={t} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-semibold text-[10px]">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium">{lead.assignedTo?.name || user.name}</td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedLead(lead)} className="text-indigo-500 hover:underline font-semibold mr-3 cursor-pointer">
                          Open Hub
                        </button>
                        {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                          <button onClick={() => handleDeleteLead(lead._id)} className="text-rose-500 hover:underline font-semibold cursor-pointer">
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* RIGHT-SIDE SLIDE-OVER LEAD COLLABORATION DRAWER (HUBSPOT STYLE)       */}
      {/* ===================================================================== */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50 animate-fadeIn">
          <div className={`${darkMode ? 'bg-slate-900 text-white border-l border-slate-800' : 'bg-white text-slate-800 border-l border-slate-200'} w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden`}>
            
            {/* Drawer Top Header */}
            <div className={`p-6 border-b flex items-start justify-between ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/70'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    {selectedLead.companyName}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Score: {calculateLeadScore(selectedLead)}/100
                  </span>
                </div>
                <h2 className="text-xl font-extrabold mt-2">{selectedLead.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedLead.email} • {selectedLead.phone} • Value: <strong>₹{selectedLead.dealValue.toLocaleString()}</strong> ({selectedLead.probability ?? 25}% Win Prob)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                  <button
                    onClick={() => handleDeleteLead(selectedLead._id)}
                    className="p-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    title="Delete Deal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedLead(null)}
                  className={`p-2 rounded-xl border cursor-pointer ${darkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Interactive Workspace Tabs */}
            <div className={`flex border-b px-6 gap-6 text-xs font-bold ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              {[
                { id: 'CHAT', label: `Team Chat (${selectedLead.comments?.length || 0})`, icon: MessageSquare },
                { id: 'CALLS', label: `Call Logs (${selectedLead.notes?.length || 0})`, icon: PhoneCall },
                { id: 'TASKS', label: `Follow-up Tasks (${selectedLead.tasks?.length || 0})`, icon: CheckSquare },
                { id: 'EMAIL', label: `Direct Email (${selectedLead.emails?.length || 0})`, icon: Mail }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDrawerTab(tab.id)}
                    className={`py-3.5 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                      activeDrawerTab === tab.id
                        ? 'border-indigo-500 text-indigo-500'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Drawer Body (Split between Active Tool & Live Activity Feed) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: SLACK-STYLE TEAM CHAT */}
              {activeDrawerTab === 'CHAT' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Discuss deal strategy with your team..."
                      className={`flex-1 border px-3.5 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                      Post Comment
                    </button>
                  </form>

                  <div className="space-y-2.5">
                    {selectedLead.comments?.slice().reverse().map((comm, i) => (
                      <div key={i} className={`p-3.5 rounded-xl border text-xs ${darkMode ? 'bg-slate-800/70 border-slate-800' : 'bg-slate-50 border-slate-200/70'}`}>
                        <div className="flex justify-between font-bold text-indigo-500 mb-1">
                          <span>{comm.authorName}</span>
                          <span className="text-[10px] text-slate-400">{new Date(comm.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="leading-relaxed">{comm.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: CALL LOGGING & OUTCOMES */}
              {activeDrawerTab === 'CALLS' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddCallNote} className="space-y-2.5 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-500 uppercase">Log New Call Interaction</span>
                      <select
                        value={callOutcome}
                        onChange={(e) => setCallOutcome(e.target.value)}
                        className={`text-xs border rounded-lg px-2.5 py-1 font-bold outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                      >
                        <option value="CONNECTED">✅ Connected</option>
                        <option value="MEETING_BOOKED">📅 Meeting Booked</option>
                        <option value="VOICEMAIL">📩 Left Voicemail</option>
                        <option value="NO_ANSWER">❌ No Answer</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Summarize client conversation, objections, or budget details..."
                        className={`flex-1 border px-3.5 py-2 rounded-xl text-xs outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                      />
                      <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
                        Save Call
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2.5">
                    {selectedLead.notes?.slice().reverse().map((note, i) => (
                      <div key={i} className={`p-3.5 rounded-xl border text-xs ${darkMode ? 'bg-slate-800/70 border-slate-800' : 'bg-slate-50 border-slate-200/70'}`}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold text-[10px]">
                            {note.callOutcome}
                          </span>
                          <span className="text-[10px] text-slate-400">By {note.authorName} • {new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <p>{note.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: TASKS & FOLLOW-UP REMINDERS */}
              {activeDrawerTab === 'TASKS' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddTask} className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="Add follow-up action item (e.g. Send security compliance doc)..."
                      className={`flex-1 border px-3.5 py-2 rounded-xl text-xs outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                    />
                    <input
                      type="date"
                      className={`border px-2.5 py-2 rounded-xl text-xs outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
                      Add Task
                    </button>
                  </form>

                  <div className="space-y-2">
                    {selectedLead.tasks?.map((t) => (
                      <div
                        key={t._id}
                        onClick={() => handleToggleTask(t._id)}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                          t.completed
                            ? 'opacity-50 line-through bg-slate-500/5'
                            : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input type="checkbox" checked={t.completed} readOnly className="rounded text-indigo-600" />
                          <span className="font-semibold">{t.title}</span>
                        </div>
                        {t.dueDate && (
                          <span className="text-[10px] text-amber-500 font-semibold">
                            Due: {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: IN-APP DIRECT EMAIL SENDER */}
              {activeDrawerTab === 'EMAIL' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">1-Click Templates:</span>
                    {EMAIL_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyEmailTemplate(tpl)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 font-semibold cursor-pointer"
                      >
                        ⚡ {tpl.name}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendEmail} className="space-y-3 p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
                    <div className="text-xs text-slate-400">
                      To: <strong className="text-indigo-400">{selectedLead.name} &lt;{selectedLead.email}&gt;</strong>
                    </div>
                    <input
                      type="text"
                      placeholder="Email Subject Line..."
                      required
                      className={`w-full border px-3.5 py-2 rounded-xl text-xs outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                    <textarea
                      rows="4"
                      placeholder="Write your personalized B2B outreach email..."
                      required
                      className={`w-full border p-3.5 rounded-xl text-xs outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Send className="w-3.5 h-3.5" /> Dispatch Email & Log Activity
                    </button>
                  </form>

                  <div className="space-y-2">
                    {selectedLead.emails?.slice().reverse().map((em, i) => (
                      <div key={i} className={`p-3.5 rounded-xl border text-xs ${darkMode ? 'bg-slate-800/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between font-bold text-indigo-400 mb-1">
                          <span>✉️ {em.subject}</span>
                          <span className="text-[10px] text-slate-400">{new Date(em.sentAt).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-line text-slate-400 text-[11px]">{em.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Immutable Audit Trail Timeline */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-500" /> Immutable System Audit Log
                </h3>
                <div className="space-y-2.5 border-l-2 border-indigo-500/30 pl-3.5 max-h-52 overflow-y-auto">
                  {selectedLead.activities?.slice().reverse().map((act, i) => (
                    <div key={i} className="text-xs">
                      <p className="font-medium">{act.action}</p>
                      <span className="text-[10px] text-slate-400">{new Date(act.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE NEW ENTERPRISE DEAL                                     */}
      {/* ===================================================================== */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-slate-900 text-white border border-slate-800' : 'bg-white text-slate-800'} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
            <h2 className="text-lg font-extrabold mb-1">Create New Sales Deal</h2>
            <p className="text-xs text-slate-400 mb-4">Enter lead details, forecasting probability, and custom tags</p>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <input type="text" placeholder="Client Full Name *" required className={`border p-2.5 rounded-xl outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} />
                <input type="text" placeholder="Company (e.g. Stripe) *" required className={`border p-2.5 rounded-xl outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={leadForm.companyName} onChange={(e) => setLeadForm({ ...leadForm, companyName: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <input type="email" placeholder="Work Email *" required className={`border p-2.5 rounded-xl outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
                <input type="text" placeholder="Phone Number *" required className={`border p-2.5 rounded-xl outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} />
              </div>
              
              <div className="flex gap-2.5">
                <input type="number" placeholder="Deal Value (e.g. 250000) *" required className={`flex-1 border p-2.5 rounded-xl outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={leadForm.dealValue} onChange={(e) => setLeadForm({ ...leadForm, dealValue: e.target.value })} />
                <select className={`border p-2.5 rounded-xl font-bold outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={leadForm.currency} onChange={(e) => setLeadForm({ ...leadForm, currency: e.target.value })}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Win Probability ({leadForm.probability}%)</label>
                  <input type="range" min="5" max="95" step="5" className="w-full accent-indigo-600"
                    value={leadForm.probability} onChange={(e) => setLeadForm({ ...leadForm, probability: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Expected Close Date</label>
                  <input type="date" className={`w-full border p-2 rounded-xl outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    value={leadForm.expectedCloseDate} onChange={(e) => setLeadForm({ ...leadForm, expectedCloseDate: e.target.value })} />
                </div>
              </div>

              {/* Custom Tags Selector */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Select Deal Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map(tag => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleLeadFormTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        leadForm.tags.includes(tag)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowLeadModal(false)} className="px-4 py-2 border rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer">Launch Deal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK CSV IMPORT */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-slate-900 text-white border border-slate-800' : 'bg-white text-slate-800'} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" /> Bulk CSV Lead Import
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Upload CSV with columns: <code>name, companyName, email, phone, dealValue</code>. Duplicate emails are automatically deduplicated.
            </p>

            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className={`w-full mb-4 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <Download className="w-3.5 h-3.5" /> Download Sample CSV Template
            </button>

            <form onSubmit={handleCsvUpload} className="space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className={`w-full text-xs border border-dashed p-4 rounded-xl cursor-pointer ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-300 bg-slate-50 text-slate-700'}`}
              />

              {csvSummary && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Import Completed!
                  </div>
                  <p>Total Rows Processed: <strong>{csvSummary.totalRows}</strong></p>
                  <p className="text-emerald-500">New Leads Imported: <strong>{csvSummary.importedCount}</strong></p>
                  <p className="text-amber-500">Duplicates Skipped: <strong>{csvSummary.duplicateCount}</strong></p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCsvModal(false)} className="px-4 py-2 border rounded-xl text-xs cursor-pointer">
                  Close
                </button>
                <button
                  type="submit"
                  disabled={csvUploading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {csvUploading ? 'Importing...' : 'Upload & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVITE TEAM MEMBER */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-slate-900 text-white border border-slate-800' : 'bg-white text-slate-800'} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
            <h2 className="text-lg font-bold mb-1">Invite Team Member</h2>
            <p className="text-xs text-slate-400 mb-4">Add a Sales Manager or Sales Representative to your workspace</p>
            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <input type="text" placeholder="Full Name" required className={`w-full border p-2.5 rounded-xl outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} />
              <input type="email" placeholder="Work Email" required className={`w-full border p-2.5 rounded-xl outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} />
              <input type="password" placeholder="Temporary Password" required className={`w-full border p-2.5 rounded-xl outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                value={memberForm.password} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} />
              <select className={`w-full border p-2.5 rounded-xl outline-none font-semibold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                <option value="REP">Sales Representative (REP - Assigned deals only)</option>
                <option value="MANAGER">Sales Manager (MANAGER - Full workspace access)</option>
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowMemberModal(false)} className="px-4 py-2 border rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}