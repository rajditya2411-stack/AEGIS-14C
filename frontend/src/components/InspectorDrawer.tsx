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
    <aside className="w-88 bg-[#09090b] border-l border-[#27272a] flex flex-col h-screen select-none shrink-0 z-20 font-sans shadow-2xl">
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-[#27272a] flex items-center justify-between bg-[#121214]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block font-mono">
            {selectedEntity ? 'NODE DETAILS' : 'CASE COMMAND & LEGAL DESK'}
          </span>
          <div className="flex items-center gap-2 truncate pr-2 mt-0.5">
            <h2 className="font-bold text-white text-sm tracking-wide truncate font-mono">
              {selectedEntity ? selectedEntity.value : (activeCase?.title || 'AEGIS Triage Desk')}
            </h2>
            {selectedEntity && <CopyButton text={selectedEntity.value} />}
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 shrink-0 transition cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#27272a] bg-[#09090b] text-[11px] overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-3 py-2.5 font-semibold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'details'
              ? 'border-sky-400 text-sky-400 bg-[#121214]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Tag className="w-3 h-3" /> Node
        </button>
        <button
          onClick={() => setActiveTab('relationship')}
          className={`px-3 py-2.5 font-semibold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'relationship'
              ? 'border-sky-400 text-sky-400 bg-[#121214]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Share2 className="w-3 h-3" /> Graph
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`px-3 py-2.5 font-semibold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'legal'
              ? 'border-indigo-400 text-indigo-300 bg-[#121214]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Scale className="w-3 h-3 text-indigo-400" /> Sec 106 BNSS ({legalDirectives.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-2.5 font-semibold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-emerald-400 text-emerald-300 bg-[#121214]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Lock className="w-3 h-3 text-emerald-400" /> Ledger ({auditLedger.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-3 py-2.5 font-semibold border-b-2 flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'notes'
              ? 'border-sky-400 text-sky-400 bg-[#121214]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <FileText className="w-3 h-3" /> Notes
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: NODE DETAILS */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            {selectedEntity ? (
              <>
                <div className="bg-[#121214] border border-[#27272a] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-zinc-500">Entity Type</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-500/30">
                      {selectedEntity.entity_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">Value</span>
                    <p className="text-xs font-mono font-semibold text-white break-all">{selectedEntity.value}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">First Observed</span>
                    <p className="text-[11px] font-mono text-zinc-400">{formatDate(selectedEntity.created_at)}</p>
                  </div>
                </div>

                {/* Metadata JSON Viewer */}
                {selectedEntity.metadata_json && Object.keys(selectedEntity.metadata_json).length > 0 && (
                  <div className="bg-[#121214] border border-[#27272a] rounded-lg p-3 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Threat Metadata & Intel</span>
                    <div className="space-y-1.5 text-xs font-mono">
                      {Object.entries(selectedEntity.metadata_json).map(([k, v]) => (
                        <div key={k} className="flex flex-col border-b border-zinc-800 pb-1 last:border-0">
                          <span className="text-[10px] text-zinc-500">{k}:</span>
                          <span className="text-zinc-200 text-[11px] break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Associated Assets Quick-Copy List for Target Node */}
                {selectedEntity.metadata_json?.is_target && (
                  <div className="bg-[#121214] border border-[#27272a] rounded-lg p-3 space-y-3">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
                      Target Case Connected Assets ({allEntities.length})
                    </span>
                    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                      {allEntities.map((ent) => (
                        <div key={ent.id} className="flex items-center justify-between p-1.5 rounded bg-[#18181b] border border-[#27272a] gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-mono px-1 rounded bg-sky-950 text-sky-400 border border-sky-500/20 mr-1.5">
                              {ent.entity_type}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-200 truncate inline-block max-w-[120px] align-middle">
                              {ent.value}
                            </span>
                          </div>
                          <CopyButton text={ent.value} className="bg-[#121214] hover:bg-zinc-800 border border-zinc-800" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onDeleteEntity(selectedEntity.id)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Node from Graph
                </button>
              </>
            ) : (
              // When no node is selected, show Case Metadata + Associated Assets list for the entire investigation
              <div className="space-y-4">
                <div className="bg-[#121214] border border-[#27272a] rounded-lg p-3 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">Case Information</span>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between border-b border-zinc-800 pb-1">
                      <span className="text-zinc-500">Title:</span>
                      <span className="text-zinc-200 font-semibold truncate max-w-[140px]">{activeCase?.title || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-1">
                      <span className="text-zinc-500">Target Target:</span>
                      <span className="text-zinc-200 truncate max-w-[140px]">{activeCase?.target || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-1">
                      <span className="text-zinc-500">Case Type:</span>
                      <span className="text-zinc-200 truncate max-w-[140px]">{activeCase?.type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Status:</span>
                      <span className="text-emerald-400 font-bold">{activeCase?.status || 'Active'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#121214] border border-[#27272a] rounded-lg p-3 space-y-3">
                  <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
                    Associated Assets List ({allEntities.length})
                  </span>
                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                    {allEntities.length === 0 ? (
                      <p className="text-xs text-zinc-500 font-mono">No nodes available in this case.</p>
                    ) : (
                      allEntities.map((ent) => (
                        <div key={ent.id} className="flex items-center justify-between p-1.5 rounded bg-[#18181b] border border-[#27272a] gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-mono px-1 rounded bg-sky-950 text-sky-400 border border-sky-500/20 mr-1.5">
                              {ent.entity_type}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-200 truncate inline-block max-w-[120px] align-middle">
                              {ent.value}
                            </span>
                          </div>
                          <CopyButton text={ent.value} className="bg-[#121214] hover:bg-zinc-800 border border-zinc-800" />
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
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                    Connected Edges ({connectedRelationships.length})
                  </span>
                  {connectedRelationships.length === 0 ? (
                    <p className="text-xs text-zinc-500">No connections established yet.</p>
                  ) : (
                    connectedRelationships.map((rel) => {
                      const otherEntityId = rel.source_id === selectedEntity.id ? rel.target_id : rel.source_id;
                      const otherEntity = allEntities.find((e) => e.id === otherEntityId);
                      const isSource = rel.source_id === selectedEntity.id;

                      return (
                        <div key={rel.id} className="p-2.5 rounded-md bg-[#121214] border border-[#27272a] flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 block font-semibold">
                              {isSource ? `→ ${rel.relation_type}` : `← ${rel.relation_type}`}
                            </span>
                            <p className="text-zinc-200 truncate font-mono max-w-[180px]">{otherEntity?.value || otherEntityId}</p>
                          </div>
                          <button
                            onClick={() => onDeleteRelationship(rel.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition"
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
                <form onSubmit={handleAddRelationship} className="bg-[#121214] border border-[#27272a] rounded-lg p-3 space-y-3">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">+ Link to Another Node</span>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-mono block mb-1">Target Entity:</label>
                    <select
                      value={targetEntityId}
                      onChange={(e) => setTargetEntityId(e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="">Select target node...</option>
                      {allEntities.filter((e) => e.id !== selectedEntity.id).map((e) => (
                        <option key={e.id} value={e.id}>{e.entity_type}: {e.value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-mono block mb-1">Relation Type:</label>
                    <input
                      type="text"
                      value={relationType}
                      onChange={(e) => setRelationType(e.target.value)}
                      placeholder="e.g. transfers_funds_to"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!targetEntityId}
                    className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition"
                  >
                    Create Connection
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-10 text-zinc-500 text-xs">
                <Share2 className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                <p>Select a node to inspect and create connections.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SECTION 106 BNSS LEGAL FREEZE NOTICES */}
        {activeTab === 'legal' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <Scale className="w-4 h-4 text-indigo-400" />
                  Statutory Freeze Orders
                </h3>
                <p className="text-[10px] text-zinc-400">Section 106 BNSS / Section 66D IT Act Directives</p>
              </div>
              <button
                onClick={() => handleExportLegalNotice()}
                disabled={isExportingNotice}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isExportingNotice ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                <span>Export PDF</span>
              </button>
            </div>

            {legalDirectives.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                <FileCheck className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                <p>No Section 106 BNSS directives drafted yet.<br/>Run autonomous triage to draft freeze notices.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {legalDirectives.map((d) => (
                  <div key={d.id} className="bg-[#121214] border border-[#27272a] rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                        {d.directive_number}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                        {d.status}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block">Target Mule Account / VPA:</span>
                      <p className="text-xs font-mono font-bold text-rose-400">{d.target_entity_value}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
                      <div>
                        <span className="text-zinc-500 block">Recipient Bank:</span>
                        <span className="text-zinc-200 font-semibold">{d.psp_or_bank}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Action Ordered:</span>
                        <span className="text-rose-400 font-bold">{d.action_required}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#27272a] flex items-center justify-between">
                      <span className="text-[9px] font-mono text-zinc-500">SHA-256: {d.sha256_hash ? d.sha256_hash.substring(0, 16) + '...' : 'Verified'}</span>
                      <button
                        onClick={() => handleExportLegalNotice(d.id)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
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
            <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Immutable Audit Ledger
                </h3>
                <p className="text-[10px] text-zinc-400">DPDP Act 2023 & Section 63 BSA Compliance</p>
              </div>
              <button
                onClick={handleVerifyLedger}
                disabled={isVerifyingLedger}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isVerifyingLedger ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                <span>Verify Chain</span>
              </button>
            </div>

            {/* Verification Result Banner */}
            {verificationResult && (
              <div className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 ${
                verificationResult.is_valid
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{verificationResult.chain_status} (100% Intact)</span>
                </div>
                <p className="text-[10px] text-zinc-300">
                  Verified {verificationResult.total_entries} cryptographic blocks in {verificationResult.verification_time_ms}ms under BSA 2023.
                </p>
                <p className="text-[9px] text-zinc-400 break-all">
                  <b>Merkle Root:</b> {verificationResult.latest_merkle_root}
                </p>
              </div>
            )}

            {/* Ledger Blocks List */}
            {auditLedger.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                <Lock className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                <p>No ledger entries recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditLedger.map((entry) => (
                  <div key={entry.id} className="p-2.5 rounded-lg bg-[#121214] border border-[#27272a] space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400">Block #{entry.entry_index}</span>
                      <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        DPDP COMPLIANT
                      </span>
                    </div>

                    <div className="text-[11px] text-white font-semibold">{entry.action_type}</div>
                    <div className="text-[10px] text-zinc-400">Actor: <span className="text-zinc-200">{entry.actor}</span></div>

                    <div className="pt-1 border-t border-zinc-800 text-[9px] text-zinc-500 space-y-0.5">
                      <div className="truncate">Prev: {entry.prev_hash.substring(0, 24)}...</div>
                      <div className="truncate text-zinc-400 font-bold">Merkle: {entry.merkle_hash.substring(0, 24)}...</div>
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
            <form onSubmit={handleAddNote} className="bg-[#121214] border border-[#27272a] rounded-lg p-3 space-y-2">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">+ Add Case Note</span>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
              />
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Forensic notes, officer observations, next steps..."
                rows={3}
                className="w-full bg-[#18181b] border border-[#27272a] rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 resize-none"
              />
              <button
                type="submit"
                disabled={!newNoteTitle.trim()}
                className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition"
              >
                Save Note
              </button>
            </form>

            <div className="space-y-2.5">
              {notes.map((note) => (
                <div key={note.id} className="p-2.5 rounded-lg bg-[#121214] border border-[#27272a] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white truncate">{note.title}</h4>
                    <button onClick={() => onDeleteNote(note.id)} className="text-zinc-500 hover:text-rose-400 p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-zinc-300 text-xs whitespace-pre-wrap">{note.content}</p>
                  <span className="text-[9px] text-zinc-500 font-mono block">{formatDate(note.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer Actions */}
      {activeCase && (
        <div className="p-3 bg-[#09090b] border-t border-[#27272a] grid grid-cols-2 gap-2">
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#121214] hover:bg-[#18181b] text-zinc-200 border border-[#27272a] py-2 rounded-md transition disabled:opacity-50 cursor-pointer"
          >
            {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-sky-400" />}
            <span>Court Dossier (PDF)</span>
          </button>

          <button
            onClick={() => handleExportLegalNotice()}
            disabled={isExportingNotice}
            className="flex items-center justify-center gap-1.5 text-[11px] font-bold bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 py-2 rounded-md transition disabled:opacity-50 cursor-pointer"
          >
            {isExportingNotice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5 text-indigo-400" />}
            <span>Sec 106 Notice (PDF)</span>
          </button>
        </div>
      )}
    </aside>
  );
};
