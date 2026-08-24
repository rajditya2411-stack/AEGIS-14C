import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera,
  GitCompare,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';
import type { Snapshot, SnapshotDiffResponse, Investigation } from '../types';
import * as api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface SnapshotDiffViewProps {
  activeCase: Investigation | null;
}

export const SnapshotDiffView: React.FC<SnapshotDiffViewProps> = ({ activeCase }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapAId, setSnapAId] = useState<string>('');
  const [snapBId, setSnapBId] = useState<string>('');
  const [diffResult, setDiffResult] = useState<SnapshotDiffResponse | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // New Snapshot Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const loadSnapshots = async () => {
    if (!activeCase) return;
    setLoading(true);
    try {
      const data = await api.fetchSnapshots(activeCase.id);
      setSnapshots(data);
      if (data.length >= 2) {
        // Default: compare the oldest (A) with newest (B)
        setSnapAId(data[data.length - 1].id);
        setSnapBId(data[0].id);
      } else if (data.length === 1) {
        setSnapAId(data[0].id);
        setSnapBId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, [activeCase?.id]);

  // Compute diff when snapAId or snapBId changes
  useEffect(() => {
    if (!activeCase || !snapAId || !snapBId) {
      setDiffResult(null);
      return;
    }
    const runDiff = async () => {
      setDiffLoading(true);
      try {
        const result = await api.compareSnapshots(activeCase.id, snapAId, snapBId);
        setDiffResult(result);
      } catch (err) {
        console.error('Failed to compare snapshots:', err);
      } finally {
        setDiffLoading(false);
      }
    };
    runDiff();
  }, [activeCase?.id, snapAId, snapBId]);

  const handleCaptureSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !newTitle.trim()) return;
    setCreating(true);
    try {
      await api.createSnapshot(activeCase.id, {
        title: newTitle.trim(),
        notes: newNotes.trim() || undefined
      });
      setNewTitle('');
      setNewNotes('');
      setIsModalOpen(false);
      await loadSnapshots();
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    try {
      await api.deleteSnapshot(id);
      await loadSnapshots();
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    }
  };

  if (!activeCase) {
    return (
      <div className={`flex-1 h-screen flex items-center justify-center font-sans ${
        isLight ? 'bg-slate-50 text-slate-500' : 'bg-[#0b0f19] text-slate-400'
      }`}>
        <p className="text-sm font-mono">Select an active investigation case to view snapshots and diffing.</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 h-screen flex flex-col overflow-hidden font-sans ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0b0f19] text-slate-100'
    }`}>
      {/* Top Header Bar */}
      <div className={`p-4 px-8 flex items-center justify-between z-10 shadow-sm border-b ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0d1322] border-[#1f293d]'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-sm border flex items-center justify-center ${
            isLight ? 'bg-[#f8fafc] border-slate-300 text-cyan-600' : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300 shadow-inner'
          }`}>
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              Snapshot Comparison & Diff
              <span className={`text-xs px-2 py-0.5 rounded-sm font-mono border ${
                isLight ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30'
              }`}>
                Phase 3 Live
              </span>
            </h1>
            <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Target: <span className={`font-semibold ${isLight ? 'text-sky-700' : 'text-sky-300'}`}>{activeCase.target}</span> • {snapshots.length} snapshots recorded
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-bold shadow-sm transition border cursor-pointer ${
              isLight
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                : 'bg-white text-black hover:bg-stone-100 border-stone-200'
            }`}
          >
            <Camera className="w-4 h-4" /> Freeze / Capture Snapshot
          </button>
        </div>
      </div>

      {/* Snapshot Comparison Controls */}
      <div className={`p-4 px-8 flex flex-wrap items-center justify-between gap-4 border-b ${
        isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#0f172a]/70 border-[#1f293d]'
      }`}>
        {snapshots.length < 2 ? (
          <div className={`text-xs flex items-center gap-2 px-4 py-2 rounded-sm border ${
            isLight ? 'bg-amber-50 text-amber-900 border-amber-300' : 'text-amber-300/90 bg-amber-950/40 border-amber-500/30'
          }`}>
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              You currently have {snapshots.length} snapshot(s). Capture at least <strong>2 snapshots</strong> (e.g. before & after scanning) to compare infrastructure deltas.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Snapshot A Selection */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Baseline (A):</span>
              <select
                value={snapAId}
                onChange={(e) => setSnapAId(e.target.value)}
                className={`rounded-sm px-3 py-1.5 text-xs font-mono focus:outline-none border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                    : 'bg-[#121929] border-slate-700/80 text-slate-200 focus:border-cyan-500'
                }`}
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.version} {s.title} ({new Date(s.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className={`w-4 h-4 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />

            {/* Snapshot B Selection */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Comparison (B):</span>
              <select
                value={snapBId}
                onChange={(e) => setSnapBId(e.target.value)}
                className={`rounded-sm px-3 py-1.5 text-xs font-mono focus:outline-none border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                    : 'bg-[#121929] border-slate-700/80 text-slate-200 focus:border-cyan-500'
                }`}
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.version} {s.title} ({new Date(s.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Delta Quick Counters */}
        {diffResult && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className={`px-3 py-1 rounded-sm flex items-center gap-1.5 border font-bold ${
              isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30'
            }`}>
              <PlusCircle className="w-3.5 h-3.5" /> +{diffResult.summary.added_entities_count} Added
            </span>
            <span className={`px-3 py-1 rounded-sm flex items-center gap-1.5 border font-bold ${
              isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950/70 text-rose-300 border-rose-500/30'
            }`}>
              <MinusCircle className="w-3.5 h-3.5" /> -{diffResult.summary.removed_entities_count} Removed
            </span>
            <span className={`px-3 py-1 rounded-sm flex items-center gap-1.5 border font-bold ${
              isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950/70 text-amber-300 border-amber-500/30'
            }`}>
              <RefreshCw className="w-3.5 h-3.5" /> ~{diffResult.summary.changed_entities_count} Changed
            </span>
          </div>
        )}
      </div>

      {/* Main Diff Content Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
        {loading || diffLoading ? (
          <div className={`flex flex-col items-center justify-center h-64 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            <RefreshCw className={`w-6 h-6 animate-spin mb-2 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <p className="text-xs font-mono">Calculating delta between snapshots...</p>
          </div>
        ) : !diffResult ? (
          <div className={`flex flex-col items-center justify-center h-64 text-center ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            <Layers className={`w-12 h-12 mb-3 ${isLight ? 'text-slate-300' : 'text-slate-600'}`} />
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>No Snapshot Comparison Available</h3>
            <p className={`text-xs max-w-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              Capture your current graph as a baseline snapshot, run an OSINT scan or make changes, then capture a second snapshot to view side-by-side changes!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Added Infrastructure Section (+ Green) */}
            <div className={`rounded-sm p-5 shadow-sm border ${
              isLight ? 'bg-white border-emerald-300' : 'bg-[#0f172a]/90 border-emerald-500/30 shadow-lg'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-sm border ${
                    isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                  }`}>
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                    Newly Discovered Infrastructure (+{diffResult.added_entities.length})
                  </h3>
                </div>
                <span className={`text-[11px] font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400/80'}`}>
                  Added in {diffResult.snapshot_b_title}
                </span>
              </div>

              {diffResult.added_entities.length === 0 ? (
                <p className={`text-xs font-mono italic ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>No new entities added between these snapshots.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diffResult.added_entities.map((item, idx) => (
                    <div
                      key={idx}
                      className={`rounded-sm p-3 flex items-start justify-between gap-3 border ${
                        isLight ? 'bg-[#f8fafc] border-emerald-200' : 'bg-[#121c2e] border-emerald-500/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${
                            isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {item.entity_type}
                          </span>
                          <span className={`text-xs font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{item.value}</span>
                        </div>
                        {item.details && (
                          <p className={`text-[11px] font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{item.details}</p>
                        )}
                      </div>
                      <span className={`text-xs font-bold font-mono shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>+ ADDED</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Removed Infrastructure Section (- Red) */}
            <div className={`rounded-sm p-5 shadow-sm border ${
              isLight ? 'bg-white border-rose-300' : 'bg-[#0f172a]/90 border-rose-500/30 shadow-lg'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-sm border ${
                    isLight ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-rose-950/80 text-rose-400 border-rose-500/30'
                  }`}>
                    <MinusCircle className="w-4 h-4" />
                  </div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-rose-900' : 'text-rose-300'}`}>
                    Decommissioned / Removed Assets (-{diffResult.removed_entities.length})
                  </h3>
                </div>
                <span className={`text-[11px] font-mono ${isLight ? 'text-rose-700' : 'text-rose-400/80'}`}>
                  Missing in {diffResult.snapshot_b_title}
                </span>
              </div>

              {diffResult.removed_entities.length === 0 ? (
                <p className={`text-xs font-mono italic ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>No entities were removed between these snapshots.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diffResult.removed_entities.map((item, idx) => (
                    <div
                      key={idx}
                      className={`rounded-sm p-3 flex items-start justify-between gap-3 border ${
                        isLight ? 'bg-[#f8fafc] border-rose-200' : 'bg-[#1a1522] border-rose-500/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${
                            isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950 text-rose-300 border-rose-500/30'
                          }`}>
                            {item.entity_type}
                          </span>
                          <span className={`text-xs font-bold font-mono line-through ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{item.value}</span>
                        </div>
                        {item.details && (
                          <p className={`text-[11px] font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{item.details}</p>
                        )}
                      </div>
                      <span className={`text-xs font-bold font-mono shrink-0 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>- REMOVED</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Added Relationships / Linkages */}
            {diffResult.added_relationships.length > 0 && (
              <div className={`rounded-sm p-5 shadow-sm border ${
                isLight ? 'bg-white border-cyan-300' : 'bg-[#0f172a]/90 border-cyan-500/30 shadow-lg'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-1.5 rounded-sm border ${
                    isLight ? 'bg-cyan-100 text-cyan-700 border-cyan-300' : 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30'
                  }`}>
                    <GitCompare className="w-4 h-4" />
                  </div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-cyan-900' : 'text-cyan-300'}`}>
                    New Relationship Links (+{diffResult.added_relationships.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {diffResult.added_relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      className={`rounded-sm p-2.5 flex items-center justify-between text-xs font-mono border ${
                        isLight ? 'bg-[#f8fafc] border-cyan-200' : 'bg-[#121c2e] border-cyan-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{rel.source_value}</span>
                        <span className={`text-[11px] ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>--({rel.relation_type})--&gt;</span>
                        <span className={`truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{rel.target_value}</span>
                      </div>
                      <span className={`text-[10px] font-bold shrink-0 ml-2 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>+ LINK</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Capture Snapshot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`border rounded-sm w-full max-w-md p-6 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0f172a] border-slate-700 text-white'
          }`}>
            <div className={`flex items-center gap-3 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className={`p-2 rounded-sm border ${
                isLight ? 'bg-cyan-100 text-cyan-700 border-cyan-300' : 'bg-cyan-950 text-cyan-400 border-cyan-500/30'
              }`}>
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Capture Graph Snapshot</h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Freeze current graph state for historical comparison</p>
              </div>
            </div>

            <form onSubmit={handleCaptureSnapshot} className="space-y-4">
              <div>
                <label className={`block text-xs font-mono mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Snapshot Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baseline Reconnaissance"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full rounded-sm px-3 py-2 text-xs font-mono focus:outline-none border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                      : 'bg-[#121929] border-slate-700 text-slate-100 focus:border-cyan-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-mono mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Notes / Context (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Captured before automated subdomain scan"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className={`w-full rounded-sm px-3 py-2 text-xs font-mono focus:outline-none resize-none border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                      : 'bg-[#121929] border-slate-700 text-slate-100 focus:border-cyan-500'
                  }`}
                />
              </div>

              <div className={`flex items-center justify-end gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-sm text-xs font-semibold border transition cursor-pointer ${
                    isLight ? 'text-slate-600 hover:text-slate-900 border-slate-300 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className={`px-4 py-2 rounded-sm text-xs font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer ${
                    isLight ? 'bg-slate-900 hover:bg-slate-800' : 'bg-cyan-600 hover:bg-cyan-500'
                  }`}
                >
                  {creating ? 'Freezing Graph...' : 'Capture Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
