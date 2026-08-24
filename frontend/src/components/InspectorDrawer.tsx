import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Info, 
  Share2, 
  FileText, 
  ShieldAlert,
  Trash2, 
  Plus, 
  Tag, 
  Copy,
  Check,
  Edit2,
  Unlink,
  Loader2,
  Save,
  ArrowRight,
  Search,
  Scale,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileCheck,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import type { 
  Entity, 
  Relationship, 
  Note, 
  EntityType, 
  ConfidenceLevel, 
  Investigation,
  LegalDirective,
  AuditLedgerEntry,
  LedgerVerificationResponse
} from '../types';
import * as api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface InspectorDrawerProps {
  selectedEntity: Entity | null;
  allEntities: Entity[];
  relationships: Relationship[];
  activeCase: Investigation | null;
  onClose: () => void;
  onDeleteEntity: (id: string) => void;
  onCreateRelationship: (targetId: string, relationType: string, confidence: ConfidenceLevel) => void;
  onDeleteRelationship: (relId: string) => void;
  notes: Note[];
  onCreateNote: (title: string, content: string) => void;
  onUpdateNote: (id: string, title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
}

const CopyButton: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`p-1 text-zinc-500 hover:text-white rounded transition shrink-0 ${className}`}
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  selectedEntity,
  allEntities,
  relationships,
  activeCase,
  onClose,
  onDeleteEntity,
  onCreateRelationship,
  onDeleteRelationship,
  notes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'details' | 'relationship' | 'legal' | 'ledger' | 'notes'>('details');

  // PDF Export States
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingNotice, setIsExportingNotice] = useState(false);

  // Phase 4 Legal Directives & Ledger States
  const [legalDirectives, setLegalDirectives] = useState<LegalDirective[]>([]);
  const [auditLedger, setAuditLedger] = useState<AuditLedgerEntry[]>([]);
  const [verificationResult, setVerificationResult] = useState<LedgerVerificationResponse | null>(null);
  const [isVerifyingLedger, setIsVerifyingLedger] = useState(false);

  // Relationship creation state
  const [targetEntityId, setTargetEntityId] = useState<string>('');
  const [relationType, setRelationType] = useState<string>('resolves_to');
  const [confidence, setConfidence] = useState<ConfidenceLevel>('OBSERVED');

  // Notes state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Editing Note state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteContent, setEditNoteContent] = useState('');

  // Load Legal Directives & Ledger for active case
  const loadCaseLegalData = useCallback(async (invId: string) => {
    try {
      const [directives, ledger] = await Promise.all([
        api.fetchLegalDirectives(invId).catch(() => []),
        api.fetchAuditLedger(invId).catch(() => [])
      ]);
      setLegalDirectives(directives);
      setAuditLedger(ledger);
      setVerificationResult(null);
    } catch (err) {
      console.error('Failed to load legal/ledger data:', err);
    }
  }, []);

  useEffect(() => {
    if (activeCase) {
      loadCaseLegalData(activeCase.id);
    }
  }, [activeCase, loadCaseLegalData]);

  const handleExportPDF = async () => {
    if (!activeCase) return;
    setIsExportingPDF(true);
    try {
      await api.downloadInvestigationPDF(activeCase.id, activeCase.title);
    } catch (err) {
      console.error('Failed to download PDF report:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportLegalNotice = async (directiveId?: string) => {
    if (!activeCase) return;
    setIsExportingNotice(true);
    try {
      await api.downloadLegalFreezeNoticePDF(activeCase.id, directiveId);
    } catch (err) {
      console.error('Failed to download legal freeze notice:', err);
    } finally {
      setIsExportingNotice(false);
    }
  };

  const handleVerifyLedger = async () => {
    if (!activeCase) return;
    setIsVerifyingLedger(true);
    try {
      const res = await api.verifyAuditLedger(activeCase.id);
      setVerificationResult(res);
    } catch (err) {
      console.error('Ledger verification failed:', err);
    } finally {
      setIsVerifyingLedger(false);
    }
  };

  const handleAddRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEntityId || !relationType) return;
    onCreateRelationship(targetEntityId, relationType, confidence);
    setTargetEntityId('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    onCreateNote(newNoteTitle, newNoteContent);
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  const handleStartEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditNoteTitle(note.title);
    setEditNoteContent(note.content);
  };

  const handleSaveEditNote = (noteId: string) => {
    if (!editNoteTitle.trim()) return;
    onUpdateNote(noteId, editNoteTitle, editNoteContent);
    setEditingNoteId(null);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    } catch {
      return dateStr;
    }
  };

  // Filter connections relevant to selected entity
  const connectedRelationships = selectedEntity
    ? relationships.filter((r) => r.source_id === selectedEntity.id || r.target_id === selectedEntity.id)
    : [];

  return (
    <aside className={`w-88 border-l flex flex-col h-screen select-none shrink-0 z-20 font-sans shadow-2xl transition-colors duration-200 ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09090b] border-[#27272a] text-white'
    }`}>
      {/* Drawer Header matching target mockup */}
      <div className={`p-3.5 border-b flex items-center justify-between ${
        isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
      }`}>
        <div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Inspector
            </span>
            <span className={`text-[10px] font-mono ml-2 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
              (352px)
            </span>
          </div>
          <div className="flex items-center gap-2 truncate pr-2 mt-0.5">
            <h2 className={`font-bold text-xs tracking-wide truncate font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {selectedEntity ? selectedEntity.value : (activeCase?.title || 'AEGIS Triage Desk')}
            </h2>
            {selectedEntity && <CopyButton text={selectedEntity.value} />}
          </div>
        </div>
        <button onClick={onClose} className={`p-1 shrink-0 transition cursor-pointer ${
          isLight ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
        }`}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className={`flex border-b text-[11px] overflow-x-auto scrollbar-none font-mono ${
        isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#09090b] border-[#27272a]'
      }`}>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-3 py-2.5 font-bold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'details'
              ? isLight ? 'border-slate-900 text-slate-900 bg-white' : 'border-stone-200 text-white bg-[#121214]'
              : isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Tag className={`w-3 h-3 ${isLight ? 'text-slate-700' : 'text-stone-300'}`} /> Node Details
        </button>
        <button
          onClick={() => setActiveTab('relationship')}
          className={`px-3 py-2.5 font-bold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'relationship'
              ? isLight ? 'border-slate-900 text-slate-900 bg-white' : 'border-stone-200 text-white bg-[#121214]'
              : isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Share2 className={`w-3 h-3 ${isLight ? 'text-slate-700' : 'text-stone-300'}`} /> Graph
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`px-3 py-2.5 font-bold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'legal'
              ? isLight ? 'border-slate-900 text-slate-900 bg-white' : 'border-stone-200 text-white bg-[#121214]'
              : isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Scale className={`w-3 h-3 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} /> Sec 106 ({legalDirectives.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-2.5 font-bold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'ledger'
              ? isLight ? 'border-slate-900 text-slate-900 bg-white' : 'border-stone-200 text-white bg-[#121214]'
              : isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Lock className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} /> Ledger ({auditLedger.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-3 py-2.5 font-bold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'notes'
              ? isLight ? 'border-slate-900 text-slate-900 bg-white' : 'border-stone-200 text-white bg-[#121214]'
              : isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileText className={`w-3 h-3 ${isLight ? 'text-slate-700' : 'text-stone-300'}`} /> Notes
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: NODE DETAILS */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            {selectedEntity ? (
              <>
                <div className={`border rounded-sm p-3.5 space-y-2.5 ${
                  isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono uppercase font-bold ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Node Details</span>
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold border ${
                      isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-sky-950 text-sky-400 border-sky-500/30'
                    }`}>
                      {selectedEntity.entity_type}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Name / Type</span>
                    <p className={`text-xs font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedEntity.entity_type}</p>
                  </div>
                  <div>
                    <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Target / Value</span>
                    <p className={`text-xs font-mono font-semibold break-all ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedEntity.value}</p>
                  </div>
                  <div>
                    <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Observed Timestamp</span>
                    <p className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>{formatDate(selectedEntity.created_at)}</p>
                  </div>
                </div>

                {/* Metadata JSON Viewer */}
                {selectedEntity.metadata_json && Object.keys(selectedEntity.metadata_json).length > 0 && (
                  <div className={`border rounded-sm p-3 space-y-2 ${
                    isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
                  }`}>
                    <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>Threat Metadata & Intel</span>
                    <div className="space-y-1.5 text-xs font-mono">
                      {Object.entries(selectedEntity.metadata_json).map(([k, v]) => (
                        <div key={k} className={`flex flex-col border-b pb-1 last:border-0 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>{k}:</span>
                          <span className={`text-[11px] break-all ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Associated Assets Quick-Copy List for Target Node */}
                {selectedEntity.metadata_json?.is_target && (
                  <div className={`border rounded-sm p-3 space-y-3 ${
                    isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
                  }`}>
                    <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                      Target Case Connected Assets ({allEntities.length})
                    </span>
                    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                      {allEntities.map((ent) => (
                        <div key={ent.id} className={`flex items-center justify-between p-1.5 rounded-sm border gap-2 ${
                          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#18181b] border-[#27272a] text-zinc-200'
                        }`}>
                          <div className="min-w-0 flex-1">
                            <span className={`text-[9px] font-mono px-1 rounded-sm mr-1.5 border ${
                              isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-sky-950 text-sky-400 border-sky-500/20'
                            }`}>
                              {ent.entity_type}
                            </span>
                            <span className="text-[11px] font-mono truncate inline-block max-w-[120px] align-middle">
                              {ent.value}
                            </span>
                          </div>
                          <CopyButton text={ent.value} className={isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200' : 'bg-[#121214] hover:bg-zinc-800 border-zinc-800'} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onDeleteEntity(selectedEntity.id)}
                  className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-sm border transition cursor-pointer ${
                    isLight ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300' : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/40'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Node from Graph
                </button>
              </>
            ) : (
              // When no node is selected, show Case Metadata + Associated Assets list for the entire investigation
              <div className="space-y-4">
                <div className={`border rounded-sm p-3 space-y-2 ${
                  isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
                }`}>
                  <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Case Information</span>
                  <div className="space-y-1 text-xs font-mono">
                    <div className={`flex justify-between border-b pb-1 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                      <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>Title:</span>
                      <span className={`font-semibold truncate max-w-[140px] ${isLight ? 'text-slate-900' : 'text-zinc-200'}`}>{activeCase?.title || 'N/A'}</span>
                    </div>
                    <div className={`flex justify-between border-b pb-1 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                      <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>Target Target:</span>
                      <span className={`truncate max-w-[140px] ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{activeCase?.target || 'N/A'}</span>
                    </div>
                    <div className={`flex justify-between border-b pb-1 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                      <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>Case Type:</span>
                      <span className={`truncate max-w-[140px] ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{activeCase?.type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>Status:</span>
                      <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{activeCase?.status || 'Active'}</span>
                    </div>
                  </div>
                </div>

                <div className={`border rounded-sm p-3 space-y-3 ${
                  isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
                }`}>
                  <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                    Associated Assets List ({allEntities.length})
                  </span>
                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                    {allEntities.length === 0 ? (
                      <p className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>No nodes available in this case.</p>
                    ) : (
                      allEntities.map((ent) => (
                        <div key={ent.id} className={`flex items-center justify-between p-1.5 rounded-sm border gap-2 ${
                          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#18181b] border-[#27272a] text-zinc-200'
                        }`}>
                          <div className="min-w-0 flex-1">
                            <span className={`text-[9px] font-mono px-1 rounded-sm mr-1.5 border ${
                              isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-sky-950 text-sky-400 border-sky-500/20'
                            }`}>
                              {ent.entity_type}
                            </span>
                            <span className="text-[11px] font-mono truncate inline-block max-w-[120px] align-middle">
                              {ent.value}
                            </span>
                          </div>
                          <CopyButton text={ent.value} className={isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200' : 'bg-[#121214] hover:bg-zinc-800 border-zinc-800'} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RELATIONSHIPS */}
        {activeTab === 'relationship' && (
          <div className="space-y-4">
            {selectedEntity ? (
              <>
                <div className="space-y-2">
                  <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Connected Edges ({connectedRelationships.length})
                  </span>
                  {connectedRelationships.length === 0 ? (
                    <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>No connections established yet.</p>
                  ) : (
                    connectedRelationships.map((rel) => {
                      const otherEntityId = rel.source_id === selectedEntity.id ? rel.target_id : rel.source_id;
                      const otherEntity = allEntities.find((e) => e.id === otherEntityId);
                      const isSource = rel.source_id === selectedEntity.id;

                      return (
                        <div key={rel.id} className={`p-2.5 rounded-sm border flex items-center justify-between text-xs ${
                          isLight ? 'bg-[#f8fafc] border-slate-200 text-slate-800' : 'bg-[#121214] border-[#27272a] text-zinc-200'
                        }`}>
                          <div>
                            <span className={`text-[10px] font-mono block font-semibold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                              {isSource ? `→ ${rel.relation_type}` : `← ${rel.relation_type}`}
                            </span>
                            <p className="truncate font-mono max-w-[180px]">{otherEntity?.value || otherEntityId}</p>
                          </div>
                          <button
                            onClick={() => onDeleteRelationship(rel.id)}
                            className={`p-1 transition cursor-pointer ${isLight ? 'text-slate-400 hover:text-rose-600' : 'text-zinc-500 hover:text-rose-400'}`}
                            title="Delete connection"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add New Edge Form */}
                <form onSubmit={handleAddRelationship} className={`border rounded-sm p-3 space-y-3 ${
                  isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
                }`}>
                  <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>+ Link to Another Node</span>
                  <div>
                    <label className={`text-[10px] font-mono block mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Target Entity:</label>
                    <select
                      value={targetEntityId}
                      onChange={(e) => setTargetEntityId(e.target.value)}
                      className={`w-full border rounded-sm p-1.5 text-xs focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900' : 'bg-[#18181b] border-[#27272a] text-zinc-200 focus:border-white'
                      }`}
                    >
                      <option value="">Select target node...</option>
                      {allEntities.filter((e) => e.id !== selectedEntity.id).map((e) => (
                        <option key={e.id} value={e.id}>{e.entity_type}: {e.value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[10px] font-mono block mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Relation Type:</label>
                    <input
                      type="text"
                      value={relationType}
                      onChange={(e) => setRelationType(e.target.value)}
                      placeholder="e.g. transfers_funds_to"
                      className={`w-full border rounded-sm p-1.5 text-xs focus:outline-none font-mono ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900' : 'bg-[#18181b] border-[#27272a] text-white focus:border-white'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!targetEntityId}
                    className={`w-full py-2 disabled:opacity-50 font-bold rounded-sm text-xs transition border shadow-sm cursor-pointer ${
                      isLight ? 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900' : 'bg-white text-black hover:bg-stone-100 border-stone-200'
                    }`}
                  >
                    Create Connection
                  </button>
                </form>
              </>
            ) : (
              <div className={`text-center py-10 text-xs ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                <Share2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>Select a node to inspect and create connections.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SECTION 106 BNSS LEGAL FREEZE NOTICES */}
        {activeTab === 'legal' && (
          <div className="space-y-4">
            <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-[#27272a]'}`}>
              <div>
                <h3 className={`text-xs font-bold flex items-center gap-1.5 font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Scale className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                  Statutory Freeze Orders
                </h3>
                <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Section 106 BNSS / Section 66D IT Act Directives</p>
              </div>
              <button
                onClick={() => handleExportLegalNotice()}
                disabled={isExportingNotice}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-sm border text-[11px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50 ${
                  isLight ? 'bg-white text-slate-900 hover:bg-slate-50 border-slate-300' : 'bg-white text-black hover:bg-stone-100 border-stone-200'
                }`}
              >
                {isExportingNotice ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                <span>Export PDF</span>
              </button>
            </div>

            {legalDirectives.length === 0 ? (
              <div className={`text-center py-8 text-xs ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                <FileCheck className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No Section 106 BNSS directives drafted yet.<br/>Run autonomous triage to draft freeze notices.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {legalDirectives.map((d) => (
                  <div key={d.id} className={`border rounded-sm p-3 space-y-2 ${
                    isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${
                        isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {d.directive_number}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border font-bold ${
                        isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {d.status}
                      </span>
                    </div>

                    <div>
                      <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Target Mule Account / VPA:</span>
                      <p className={`text-xs font-mono font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>{d.target_entity_value}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className={`block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Recipient Bank:</span>
                        <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{d.psp_or_bank}</span>
                      </div>
                      <div>
                        <span className={`block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Action Ordered:</span>
                        <span className={`font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{d.action_required}</span>
                      </div>
                    </div>

                    <div className={`pt-2 border-t flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-[#27272a]'}`}>
                      <span className={`text-[9px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>SHA-256: {d.sha256_hash ? d.sha256_hash.substring(0, 16) + '...' : 'Verified'}</span>
                      <button
                        onClick={() => handleExportLegalNotice(d.id)}
                        className={`text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                          isLight ? 'text-indigo-600 hover:text-indigo-800' : 'text-indigo-400 hover:text-indigo-300'
                        }`}
                      >
                        <Download className="w-3 h-3" /> Download Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CRYPTOGRAPHIC SHA-256 AUDIT LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-[#27272a]'}`}>
              <div>
                <h3 className={`text-xs font-bold flex items-center gap-1.5 font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Lock className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  Immutable Audit Ledger
                </h3>
                <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>DPDP Act 2023 & Section 63 BSA Compliance</p>
              </div>
              <button
                onClick={handleVerifyLedger}
                disabled={isVerifyingLedger}
                className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isVerifyingLedger ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                <span>Verify Chain</span>
              </button>
            </div>

            {/* Verification Result Banner */}
            {verificationResult && (
              <div className={`p-3 rounded-sm border text-xs font-mono space-y-1.5 ${
                verificationResult.is_valid
                  ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : isLight ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                  <span>{verificationResult.chain_status} (100% Intact)</span>
                </div>
                <p className={`text-[10px] ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Verified {verificationResult.total_entries} cryptographic blocks in {verificationResult.verification_time_ms}ms under BSA 2023.
                </p>
                <p className={`text-[9px] break-all ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  <b>Merkle Root:</b> {verificationResult.latest_merkle_root}
                </p>
              </div>
            )}

            {/* Ledger Blocks List */}
            {auditLedger.length === 0 ? (
              <div className={`text-center py-8 text-xs ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                <Lock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No ledger entries recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditLedger.map((entry) => (
                  <div key={entry.id} className={`p-2.5 rounded-sm border space-y-1.5 text-xs font-mono ${
                    isLight ? 'bg-[#f8fafc] border-slate-200 text-slate-800' : 'bg-[#121214] border-[#27272a] text-zinc-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Block #{entry.entry_index}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-sm border ${
                        isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                      }`}>
                        DPDP COMPLIANT
                      </span>
                    </div>

                    <div className={`text-[11px] font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{entry.action_type}</div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Actor: <span className={isLight ? 'text-slate-900 font-semibold' : 'text-zinc-200'}>{entry.actor}</span></div>

                    <div className={`pt-1 border-t text-[9px] space-y-0.5 ${isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800 text-zinc-500'}`}>
                      <div className="truncate">Prev: {entry.prev_hash.substring(0, 24)}...</div>
                      <div className={`truncate font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>Merkle: {entry.merkle_hash.substring(0, 24)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <form onSubmit={handleAddNote} className={`border rounded-sm p-3 space-y-2 ${
              isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
            }`}>
              <span className={`text-[10px] font-mono uppercase font-bold block ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>+ Add Case Note</span>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Note title..."
                className={`w-full border rounded-sm p-1.5 text-xs focus:outline-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900' : 'bg-[#18181b] border-[#27272a] text-zinc-200 focus:border-sky-500'
                }`}
              />
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Forensic notes, officer observations, next steps..."
                rows={3}
                className={`w-full border rounded-sm p-1.5 text-xs focus:outline-none resize-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900' : 'bg-[#18181b] border-[#27272a] text-zinc-200 focus:border-sky-500'
                }`}
              />
              <button
                type="submit"
                disabled={!newNoteTitle.trim()}
                className={`w-full py-1.5 disabled:opacity-50 text-white rounded-sm text-xs font-semibold transition ${
                  isLight ? 'bg-slate-900 hover:bg-slate-800' : 'bg-sky-600 hover:bg-sky-500'
                }`}
              >
                Save Note
              </button>
            </form>

            <div className="space-y-2.5">
              {notes.map((note) => (
                <div key={note.id} className={`p-2.5 rounded-sm border space-y-1 text-xs ${
                  isLight ? 'bg-[#f8fafc] border-slate-200 text-slate-800' : 'bg-[#121214] border-[#27272a] text-zinc-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{note.title}</h4>
                    <button onClick={() => onDeleteNote(note.id)} className={`p-0.5 ${isLight ? 'text-slate-400 hover:text-rose-600' : 'text-zinc-500 hover:text-rose-400'}`}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className={`text-xs whitespace-pre-wrap ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>{note.content}</p>
                  <span className={`text-[9px] font-mono block ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{formatDate(note.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer Actions */}
      {activeCase && (
        <div className={`p-3 border-t grid grid-cols-2 gap-2 ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className={`flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-sm transition disabled:opacity-50 cursor-pointer border shadow-sm ${
              isLight ? 'bg-white text-slate-900 hover:bg-slate-50 border-slate-300' : 'bg-[#121214] hover:bg-[#18181b] text-zinc-200 border-[#27272a]'
            }`}
          >
            {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-sky-500" />}
            <span>Court Dossier (PDF)</span>
          </button>

          <button
            onClick={() => handleExportLegalNotice()}
            disabled={isExportingNotice}
            className={`flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-sm transition disabled:opacity-50 cursor-pointer border shadow-sm ${
              isLight ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 border-indigo-500/40'
            }`}
          >
            {isExportingNotice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5 text-indigo-500" />}
            <span>Sec 106 Notice (PDF)</span>
          </button>
        </div>
      )}
    </aside>
  );
};
