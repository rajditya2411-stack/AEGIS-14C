import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  ShieldAlert,
  Download,
  Radio,
  Share2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileCode,
  Building,
  Smartphone,
  Globe,
  Lock,
  Loader2,
  ExternalLink,
  ChevronRight,
  Send,
  RefreshCw,
  Hash,
  Clock,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { Investigation, LegalDirective, AuditLedgerEntry, LedgerVerificationResponse } from '../types';
import * as api from '../lib/api';
import type { IntelFeedItem } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface DirectivesViewProps {
  activeCase: Investigation | null;
  onRefreshCase?: () => void;
}

type TabType = 'directives' | 'intel-exchange' | 'ledger' | 'syndicate';

export const DirectivesView: React.FC<DirectivesViewProps> = ({ activeCase, onRefreshCase }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<TabType>('directives');

  // Directives State
  const [directives, setDirectives] = useState<LegalDirective[]>([]);
  const [loadingDirectives, setLoadingDirectives] = useState(false);
  const [selectedDirectiveType, setSelectedDirectiveType] = useState<'BANK_FREEZE' | 'SIM_SUSPEND' | 'DOMAIN_TAKEDOWN' | 'DOSSIER'>('BANK_FREEZE');
  const [recipientBank, setRecipientBank] = useState('HDFC Bank Ltd. Nodal Cyber Cell');
  const [targetAccount, setTargetAccount] = useState('');
  const [officerName, setOfficerName] = useState('Inspector AEGIS Cyber Command');
  const [caseReference, setCaseReference] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Intel Exchange State
  const [intelFeeds, setIntelFeeds] = useState<IntelFeedItem[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([
    'i4c-central', 'npci-frauds', 'cert-in', 'dot-sanchar'
  ]);
  const [broadcastNote, setBroadcastNote] = useState('Critical mule routing and scam APK infrastructure identified during live triage.');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any | null>(null);

  // Ledger State
  const [ledgerEntries, setLedgerEntries] = useState<AuditLedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [verificationResult, setVerificationResult] = useState<LedgerVerificationResponse | null>(null);
  const [isVerifyingLedger, setIsVerifyingLedger] = useState(false);

  // Syndicate State
  const [syndicateProfile, setSyndicateProfile] = useState<any | null>(null);
  const [loadingSyndicate, setLoadingSyndicate] = useState(false);

  // Initial Load Data
  const loadData = useCallback(async () => {
    if (!activeCase) return;

    setCaseReference(activeCase.id ? `FIR/CYB/2026/${activeCase.id.substring(0, 6).toUpperCase()}` : 'FIR/CYB/2026/001');

    // Load Directives
    setLoadingDirectives(true);
    try {
      const dirs = await api.fetchLegalDirectives(activeCase.id);
      setDirectives(dirs);
      if (dirs.length > 0 && dirs[0].target_account) {
        setTargetAccount(dirs[0].target_account);
      }
    } catch (err) {
      console.error('Error loading directives:', err);
    } finally {
      setLoadingDirectives(false);
    }

    // Load Intel Feeds
    setLoadingFeeds(true);
    try {
      const feeds = await api.fetchIntelBroadcastFeeds();
      setIntelFeeds(feeds);
    } catch (err) {
      console.error('Error loading intel feeds:', err);
    } finally {
      setLoadingFeeds(false);
    }

    // Load Ledger
    setLoadingLedger(true);
    try {
      const entries = await api.fetchAuditLedger(activeCase.id);
      setLedgerEntries(entries);
    } catch (err) {
      console.error('Error loading audit ledger:', err);
    } finally {
      setLoadingLedger(false);
    }

    // Load Syndicate Profile
    setLoadingSyndicate(true);
    try {
      const syn = await api.fetchSyndicateProfile(activeCase.id);
      setSyndicateProfile(syn);
    } catch (err) {
      console.error('Error loading syndicate profile:', err);
    } finally {
      setLoadingSyndicate(false);
    }
  }, [activeCase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle PDF Generation
  const handleDownloadNotice = async () => {
    if (!activeCase) return;
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);
    try {
      if (selectedDirectiveType === 'DOSSIER') {
        await api.downloadInvestigationDossierPDF(activeCase.id);
        setPdfSuccessMessage('Comprehensive Forensic Incident Dossier PDF downloaded successfully!');
      } else {
        await api.downloadLegalFreezeNoticePDF(activeCase.id);
        setPdfSuccessMessage('Statutory Section 94 BNSS Bank Freeze Notice PDF downloaded successfully!');
      }
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Threat Intel Broadcast
  const handleBroadcastIntel = async () => {
    if (!activeCase) return;
    if (selectedAgencies.length === 0) {
      alert('Please select at least one partner agency to broadcast threat intelligence.');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await api.broadcastThreatIntel({
        investigation_id: activeCase.id,
        target_agencies: selectedAgencies,
        broadcaster_officer: officerName,
        custom_notes: broadcastNote
      });
      setBroadcastResult(res);
      // Reload ledger
      const entries = await api.fetchAuditLedger(activeCase.id);
      setLedgerEntries(entries);
    } catch (err: any) {
      alert(`Broadcast failed: ${err.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Handle STIX 2.1 Export
  const handleExportStix = async () => {
    if (!activeCase) return;
    try {
      const stixBundle = await api.fetchStixPackage(activeCase.id);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(stixBundle, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `STIX_2.1_AEGIS_${activeCase.id.substring(0, 8)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert(`STIX Export failed: ${err.message}`);
    }
  };

  // Handle Cryptographic Ledger Verification
  const handleVerifyLedger = async () => {
    if (!activeCase) return;
    setIsVerifyingLedger(true);
    try {
      const res = await api.verifyAuditLedger(activeCase.id);
      setVerificationResult(res);
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifyingLedger(false);
    }
  };

  if (!activeCase) {
    return (
      <div className={`flex-1 h-screen flex flex-col items-center justify-center space-y-3 font-mono ${
        isLight ? 'bg-slate-50 text-slate-500' : 'bg-[#07080f] text-zinc-500'
      }`}>
        <Scale className="w-8 h-8 opacity-40" />
        <span className="text-sm">Select or create an investigation case to access Directives & Intel Hub.</span>
      </div>
    );
  }

  return (
    <div className={`flex-1 h-screen flex flex-col overflow-hidden font-sans transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#07080f] text-zinc-100'
    }`}>
      {/* Top Banner Header */}
      <header className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight">Inter-Agency Directives & Threat Intel Hub</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Phase 5 Central
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Statutory Section 94 BNSS Freezes, I4C Threat Broadcasts & Section 63 BSA Digital Ledger
            </p>
          </div>
        </div>

        {/* Case Info Pill */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-mono ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#12141f] border-[#27272a] text-zinc-300'
          }`}>
            <span className="text-zinc-500">Case:</span>
            <span className="font-bold text-white max-w-[200px] truncate">{activeCase.title}</span>
            <span className="text-zinc-500">|</span>
            <span className="text-indigo-400">{activeCase.type}</span>
          </div>

          <button
            onClick={loadData}
            className={`p-2 rounded-sm border transition cursor-pointer ${
              isLight ? 'bg-white hover:bg-slate-100 border-slate-200' : 'bg-[#12141f] hover:bg-[#181a28] border-[#27272a]'
            }`}
            title="Refresh Directives & Intel"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <div className={`px-6 py-2 border-b flex items-center gap-2 shrink-0 ${
        isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-[#090a12] border-[#1f2130]'
      }`}>
        <button
          onClick={() => setActiveTab('directives')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-semibold transition cursor-pointer border ${
            activeTab === 'directives'
              ? isLight ? 'bg-white text-indigo-600 border-indigo-200 shadow-sm' : 'bg-[#161826] text-indigo-400 border-indigo-500/40 shadow-sm'
              : isLight ? 'text-slate-600 hover:text-slate-900 border-transparent' : 'text-zinc-400 hover:text-white border-transparent'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Section 94 BNSS Directives</span>
          {directives.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
              {directives.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('intel-exchange')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-semibold transition cursor-pointer border ${
            activeTab === 'intel-exchange'
              ? isLight ? 'bg-white text-sky-600 border-sky-200 shadow-sm' : 'bg-[#161826] text-sky-400 border-sky-500/40 shadow-sm'
              : isLight ? 'text-slate-600 hover:text-slate-900 border-transparent' : 'text-zinc-400 hover:text-white border-transparent'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>I4C Threat Intel Broadcast</span>
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-semibold transition cursor-pointer border ${
            activeTab === 'ledger'
              ? isLight ? 'bg-white text-emerald-600 border-emerald-200 shadow-sm' : 'bg-[#161826] text-emerald-400 border-emerald-500/40 shadow-sm'
              : isLight ? 'text-slate-600 hover:text-slate-900 border-transparent' : 'text-zinc-400 hover:text-white border-transparent'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Section 63 BSA Ledger</span>
          {ledgerEntries.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
              {ledgerEntries.length} blocks
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('syndicate')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-semibold transition cursor-pointer border ${
            activeTab === 'syndicate'
              ? isLight ? 'bg-white text-purple-600 border-purple-200 shadow-sm' : 'bg-[#161826] text-purple-400 border-purple-500/40 shadow-sm'
              : isLight ? 'text-slate-600 hover:text-slate-900 border-transparent' : 'text-zinc-400 hover:text-white border-transparent'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Syndicate MO Profile</span>
          {syndicateProfile && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/20 text-purple-300">
              {syndicateProfile.confidence_score}%
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: Section 94 BNSS Directives */}
        {activeTab === 'directives' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Top Cards: Notice Type Selector */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                onClick={() => setSelectedDirectiveType('BANK_FREEZE')}
                className={`p-4 rounded-sm border cursor-pointer transition-all ${
                  selectedDirectiveType === 'BANK_FREEZE'
                    ? isLight ? 'bg-indigo-50 border-indigo-400 shadow-sm' : 'bg-indigo-950/40 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-[#0d0e17] border-[#27272a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Building className="w-5 h-5 text-indigo-400" />
                  <span className="text-[10px] font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10">
                    Sec 94 BNSS
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Bank Nodal Freeze</h3>
                <p className="text-xs text-zinc-400">Debit freeze & statutory lien on mule account / UPI VPA.</p>
              </div>

              <div
                onClick={() => setSelectedDirectiveType('SIM_SUSPEND')}
                className={`p-4 rounded-sm border cursor-pointer transition-all ${
                  selectedDirectiveType === 'SIM_SUSPEND'
                    ? isLight ? 'bg-pink-50 border-pink-400 shadow-sm' : 'bg-pink-950/40 border-pink-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                    : isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-[#0d0e17] border-[#27272a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Smartphone className="w-5 h-5 text-pink-400" />
                  <span className="text-[10px] font-mono font-bold text-pink-400 px-2 py-0.5 rounded bg-pink-500/10">
                    TAFCOP / DoT
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">SIM & IMEI Suspension</h3>
                <p className="text-xs text-zinc-400">Immediate telecom suspension & IMEI blacklist via DoT.</p>
              </div>

              <div
                onClick={() => setSelectedDirectiveType('DOMAIN_TAKEDOWN')}
                className={`p-4 rounded-sm border cursor-pointer transition-all ${
                  selectedDirectiveType === 'DOMAIN_TAKEDOWN'
                    ? isLight ? 'bg-cyan-50 border-cyan-400 shadow-sm' : 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-[#0d0e17] border-[#27272a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <span className="text-[10px] font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10">
                    Sec 69A IT Act
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">ISP Domain Takedown</h3>
                <p className="text-xs text-zinc-400">DNS poisoning & hosting takedown directive to registrars.</p>
              </div>

              <div
                onClick={() => setSelectedDirectiveType('DOSSIER')}
                className={`p-4 rounded-sm border cursor-pointer transition-all ${
                  selectedDirectiveType === 'DOSSIER'
                    ? isLight ? 'bg-emerald-50 border-emerald-400 shadow-sm' : 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-[#0d0e17] border-[#27272a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                    Sec 63 BSA
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Forensic Case Dossier</h3>
                <p className="text-xs text-zinc-400">Full evidence dossier with Merkle root hash for judicial filing.</p>
              </div>
            </div>

            {/* Directive Generation Form */}
            <div className={`p-6 rounded-sm border space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'
            }`}>
              <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">
                    {selectedDirectiveType === 'BANK_FREEZE' && 'Statutory Section 94 BNSS Bank Freeze Notice Generator'}
                    {selectedDirectiveType === 'SIM_SUSPEND' && 'Statutory Telecom SIM & IMEI Suspension Requisition'}
                    {selectedDirectiveType === 'DOMAIN_TAKEDOWN' && 'Section 69A IT Act Malicious Domain / C2 Takedown Order'}
                    {selectedDirectiveType === 'DOSSIER' && 'Comprehensive Digital Forensics Incident Dossier & Chain of Custody'}
                  </h2>
                </div>
                <span className="text-xs font-mono text-zinc-400">MHA / I4C Standard Form Format</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400">Target Entity / Bank Nodal Officer:</label>
                  <input
                    type="text"
                    value={recipientBank}
                    onChange={(e) => setRecipientBank(e.target.value)}
                    className={`w-full px-3 py-2 rounded-sm text-xs border font-mono ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#12141f] border-[#27272a] text-white'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400">Suspect Account / Identifier to Freeze:</label>
                  <input
                    type="text"
                    value={targetAccount || activeCase.target}
                    onChange={(e) => setTargetAccount(e.target.value)}
                    placeholder="e.g. 9198765432101 or mule.vpa@oksbi"
                    className={`w-full px-3 py-2 rounded-sm text-xs border font-mono ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#12141f] border-[#27272a] text-white'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400">FIR / Police Case Reference Number:</label>
                  <input
                    type="text"
                    value={caseReference}
                    onChange={(e) => setCaseReference(e.target.value)}
                    className={`w-full px-3 py-2 rounded-sm text-xs border font-mono ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#12141f] border-[#27272a] text-white'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400">Authorized Investigating Officer:</label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-sm text-xs border font-mono ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#12141f] border-[#27272a] text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Includes Section 63 BSA SHA-256 Digital Certificate & Watermark</span>
                </div>

                <button
                  onClick={handleDownloadNotice}
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-sm bg-white text-black font-bold text-xs hover:bg-stone-200 transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-current" />
                      <span>Compiling Statutory PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Generate & Download Statutory PDF</span>
                    </>
                  )}
                </button>
              </div>

              {pdfSuccessMessage && (
                <div className="p-3 rounded-sm bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{pdfSuccessMessage}</span>
                </div>
              )}
            </div>

            {/* Issued Directives History Table */}
            <div className={`p-6 rounded-sm border space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Active Case Statutory Directives Log</h3>
                <span className="text-xs font-mono text-zinc-400">{directives.length} Issued</span>
              </div>

              {directives.length === 0 ? (
                <p className="text-xs font-mono text-zinc-500 py-4 text-center">
                  No explicit directives logged yet. Click "Generate & Download Statutory PDF" above to register a directive.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="py-2">Directive ID</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Recipient Agency</th>
                        <th className="py-2">Target Account</th>
                        <th className="py-2">Status</th>
                        <th className="py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {directives.map((d) => (
                        <tr key={d.id} className="hover:bg-zinc-800/20">
                          <td className="py-2.5 font-bold text-white">{d.id.substring(0, 8)}</td>
                          <td className="py-2.5 text-indigo-400">{d.directive_type}</td>
                          <td className="py-2.5 text-zinc-300">{d.recipient_agency}</td>
                          <td className="py-2.5 text-rose-400">{d.target_account || 'N/A'}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              {d.compliance_status || 'PENDING_COMPLIANCE'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => api.downloadLegalFreezeNoticePDF(activeCase.id, d.id)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                            >
                              Download PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Inter-Agency Threat Intel Broadcasting */}
        {activeTab === 'intel-exchange' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Broadcast Controller */}
              <div className={`lg:col-span-2 p-6 rounded-sm border space-y-5 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'
              }`}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
                    <h2 className="text-sm font-bold text-white">Broadcast Verified Case Indicators to Law Enforcement Mesh</h2>
                  </div>
                  <button
                    onClick={handleExportStix}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#12141f] border border-[#27272a] text-xs text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>Export STIX 2.1 JSON</span>
                  </button>
                </div>

                {/* Target Agencies Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-400">Select Recipient Partner Agencies:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'i4c-central', name: 'I4C National Cybercrime Portal', type: 'Federal Hub' },
                      { id: 'npci-frauds', name: 'NPCI Fin-Crime Prevention Switch', type: 'Payment Gateways' },
                      { id: 'cert-in', name: 'CERT-In Incident Response Unit', type: 'National Threat Intel' },
                      { id: 'dot-sanchar', name: 'DoT Sanchar Saathi / TAFCOP', type: 'Telecom Registry' },
                      { id: 'state-cctns', name: 'State Police CCTNS Inter-Op Grid', type: 'Law Enforcement Mesh' }
                    ].map((agency) => (
                      <label
                        key={agency.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-sm border cursor-pointer transition ${
                          selectedAgencies.includes(agency.id)
                            ? 'bg-sky-950/40 border-sky-500/50 text-white'
                            : 'bg-[#12141f] border-[#27272a] text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAgencies.includes(agency.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedAgencies([...selectedAgencies, agency.id]);
                            else setSelectedAgencies(selectedAgencies.filter((a) => a !== agency.id));
                          }}
                          className="rounded text-sky-500"
                        />
                        <div>
                          <div className="font-bold">{agency.name}</div>
                          <div className="text-[10px] text-zinc-500">{agency.type}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Broadcast Officer Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400">Investigator Advisory Notes:</label>
                  <textarea
                    rows={3}
                    value={broadcastNote}
                    onChange={(e) => setBroadcastNote(e.target.value)}
                    className={`w-full p-3 rounded-sm text-xs font-mono border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#12141f] border-[#27272a] text-white'
                    }`}
                  />
                </div>

                {/* Broadcast Action Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs font-mono text-zinc-400">
                    Transmitting: <span className="font-bold text-white">{activeCase.target}</span> IOCs
                  </div>

                  <button
                    onClick={handleBroadcastIntel}
                    disabled={isBroadcasting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-sm bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isBroadcasting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-current" />
                        <span>Broadcasting to {selectedAgencies.length} Nodes...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 stroke-[2.5]" />
                        <span>Broadcast Threat Indicators</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Broadcast Acknowledgment Banner */}
                {broadcastResult && (
                  <div className="p-4 rounded-sm bg-sky-950/50 border border-sky-500/50 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-sky-300 font-bold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400" />
                        <span>Broadcast Transmitted Successfully</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-200">
                        {broadcastResult.broadcast_id}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-zinc-300 pt-2 border-t border-sky-800/40">
                      <div>Total IOCs Transmitted: <span className="font-bold text-white">{broadcastResult.total_iocs_broadcast}</span></div>
                      <div>Delivered Nodes: <span className="font-bold text-white">{broadcastResult.agency_deliveries?.length}</span></div>
                    </div>
                    <p className="text-[11px] text-zinc-400 pt-1">
                      Action Required: {broadcastResult.action_required}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Col: Live Inter-Agency Bulletin Feed */}
              <div className={`p-6 rounded-sm border space-y-4 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'
              }`}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Live Inter-Agency Feed</h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">National Mesh</span>
                </div>

                <div className="space-y-3">
                  {intelFeeds.map((feed) => (
                    <div
                      key={feed.feed_id}
                      className={`p-3 rounded-sm border space-y-1.5 text-xs ${
                        feed.severity === 'CRITICAL'
                          ? 'bg-rose-950/30 border-rose-500/40'
                          : 'bg-[#12141f] border-[#27272a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">{feed.origin_agency}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          feed.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {feed.severity}
                        </span>
                      </div>
                      <h4 className="font-bold text-white">{feed.alert_title}</h4>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {feed.iocs.map((ioc, idx) => (
                          <span key={idx} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-300 border border-zinc-800">
                            {ioc}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/40">
                        {feed.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Cryptographic Merkle Audit Ledger */}
        {activeTab === 'ledger' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header / Verification Bar */}
            <div className={`p-6 rounded-sm border flex flex-wrap items-center justify-between gap-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Cryptographic SHA-256 Merkle Ledger Explorer</h2>
                  <p className="text-xs text-zinc-400 font-mono">
                    DPDP Act 2023 & Section 63 BSA Tamper-Evident Evidence Blockchain
                  </p>
                </div>
              </div>

              <button
                onClick={handleVerifyLedger}
                disabled={isVerifyingLedger}
                className="flex items-center gap-2 px-4 py-2 rounded-sm bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {isVerifyingLedger ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                    <span>Auditing Chain Math...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Verify Cryptographic Chain</span>
                  </>
                )}
              </button>
            </div>

            {/* Verification Proof Badge */}
            {verificationResult && (
              <div className="p-4 rounded-sm bg-emerald-950/40 border border-emerald-500/50 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-emerald-300 font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>JUDICIAL PROOF OF NON-TAMPERING: {verificationResult.integrity_status}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Verified in {verificationResult.verification_latency_ms}ms</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-zinc-300 pt-2 border-t border-emerald-800/40">
                  <div>Verified Blocks: <span className="font-bold text-white">{verificationResult.total_blocks_verified}</span></div>
                  <div className="truncate">Merkle Root: <span className="font-bold text-emerald-400">{verificationResult.latest_merkle_root}</span></div>
                  <div>DPDP & BSA 63 Compliant: <span className="font-bold text-white">{String(verificationResult.dpdp_compliant)}</span></div>
                </div>
              </div>
            )}

            {/* Ledger Blocks List */}
            <div className={`p-6 rounded-sm border space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Chained Forensic Audit Blocks</h3>
                <span className="text-xs font-mono text-zinc-400">{ledgerEntries.length} Recorded Blocks</span>
              </div>

              {ledgerEntries.length === 0 ? (
                <p className="text-xs font-mono text-zinc-500 py-6 text-center">
                  No ledger entries recorded yet. Intake complaints or run OSINT probes to generate evidence blocks.
                </p>
              ) : (
                <div className="space-y-3">
                  {ledgerEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-sm border font-mono text-xs space-y-2 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12141f] border-[#27272a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Block #{index + 1}
                          </span>
                          <span className="font-bold text-white">{entry.action_type}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1">
                        <div className="truncate">
                          SHA-256 Hash: <span className="text-emerald-400">{entry.entry_hash}</span>
                        </div>
                        <div className="truncate">
                          Prev Hash: <span className="text-zinc-500">{entry.previous_hash || '00000000000000000000000000000000'}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-zinc-300 pt-1 border-t border-zinc-800/40">
                        Actor: <span className="text-white">{entry.actor_id}</span> | Payload: <span className="text-zinc-400">{JSON.stringify(entry.data_payload)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Threat Syndicate MO Profile */}
        {activeTab === 'syndicate' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {syndicateProfile ? (
              <div className="space-y-6">
                {/* Syndicate Summary Card */}
                <div className={`p-6 rounded-sm border space-y-4 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'
                }`}>
                  <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-400" />
                      <div>
                        <h2 className="text-base font-bold text-white">{syndicateProfile.syndicate_name}</h2>
                        <span className="text-xs font-mono text-zinc-400">Attributed Cybercrime Cartel</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-purple-400">{syndicateProfile.confidence_score}%</div>
                      <span className="text-[10px] font-mono text-zinc-500">Confidence Score</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-zinc-500">Geographic Epicenter:</span>
                      <p className="text-white font-bold">{syndicateProfile.epicenter}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-500">Primary Modus Operandi (MO):</span>
                      <p className="text-zinc-300">{syndicateProfile.primary_mo}</p>
                    </div>
                  </div>

                  {/* Statutory Offenses */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <span className="text-xs font-mono text-zinc-400">Statutory Bharatiya Nyaya Sanhita (BNS) & IT Act Violations:</span>
                    <div className="flex flex-wrap gap-2">
                      {syndicateProfile.statutory_violations?.map((sec: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Countermeasures */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <span className="text-xs font-mono text-zinc-400">Recommended Law Enforcement Action Plan:</span>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      {syndicateProfile.recommended_countermeasures?.map((cm: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <span>{cm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-zinc-500 font-mono text-xs">
                Loading syndicate profile analytics...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
