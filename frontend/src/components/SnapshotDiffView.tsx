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

interface SnapshotDiffViewProps {
  activeCase: Investigation | null;
}

export const SnapshotDiffView: React.FC<SnapshotDiffViewProps> = ({ activeCase }) => {
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
      <div className="flex-1 h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <p className="text-sm">Select an active investigation case to view snapshots and diffing.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen bg-[#0b0f19] text-slate-100 flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-[#0d1322] border-b border-[#1f293d] p-4 px-8 flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Snapshot Comparison & Diff
              <span className="text-xs bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                Phase 3 Live
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Target: <span className="text-sky-300 font-semibold">{activeCase.target}</span> • {snapshots.length} snapshots recorded
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition"
          >
            <Camera className="w-4 h-4" /> Freeze / Capture Snapshot
          </button>
        </div>
      </div>

      {/* Snapshot Comparison Controls */}
      <div className="bg-[#0f172a]/70 border-b border-[#1f293d] p-4 px-8 flex flex-wrap items-center justify-between gap-4">
        {snapshots.length < 2 ? (
          <div className="text-xs text-amber-300/90 flex items-center gap-2 bg-amber-950/40 border border-amber-500/30 px-4 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You currently have {snapshots.length} snapshot(s). Capture at least <strong>2 snapshots</strong> (e.g. before & after scanning) to compare infrastructure deltas.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Snapshot A Selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Baseline (A):</span>
              <select
                value={snapAId}
                onChange={(e) => setSnapAId(e.target.value)}
                className="bg-[#121929] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.version} {s.title} ({new Date(s.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />

            {/* Snapshot B Selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Comparison (B):</span>
              <select
                value={snapBId}
                onChange={(e) => setSnapBId(e.target.value)}
                className="bg-[#121929] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
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
            <span className="bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5" /> +{diffResult.summary.added_entities_count} Added
            </span>
            <span className="bg-rose-950/70 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-lg flex items-center gap-1.5">
              <MinusCircle className="w-3.5 h-3.5" /> -{diffResult.summary.removed_entities_count} Removed
            </span>
            <span className="bg-amber-950/70 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-lg flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> ~{diffResult.summary.changed_entities_count} Changed
            </span>
          </div>
        )}
      </div>

      {/* Main Diff Content Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
        {loading || diffLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
            <p className="text-xs font-mono">Calculating delta between snapshots...</p>
          </div>
        ) : !diffResult ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center">
            <Layers className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-300">No Snapshot Comparison Available</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Capture your current graph as a baseline snapshot, run an OSINT scan or make changes, then capture a second snapshot to view side-by-side changes!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Added Infrastructure Section (+ Green) */}
            <div className="bg-[#0f172a]/90 border border-emerald-500/30 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-300">
                    Newly Discovered Infrastructure (+{diffResult.added_entities.length})
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-400/80">
                  Added in {diffResult.snapshot_b_title}
                </span>
              </div>

              {diffResult.added_entities.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono italic">No new entities added between these snapshots.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diffResult.added_entities.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#121c2e] border border-emerald-500/20 rounded-lg p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            {item.entity_type}
                          </span>
                          <span className="text-xs font-bold text-slate-100 font-mono">{item.value}</span>
                        </div>
                        {item.details && (
                          <p className="text-[11px] text-slate-400 font-sans">{item.details}</p>
                        )}
                      </div>
                      <span className="text-emerald-400 text-xs font-bold font-mono shrink-0">+ ADDED</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Removed Infrastructure Section (- Red) */}
            <div className="bg-[#0f172a]/90 border border-rose-500/30 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-500/30">
                    <MinusCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-rose-300">
                    Decommissioned / Removed Assets (-{diffResult.removed_entities.length})
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-rose-400/80">
                  Missing in {diffResult.snapshot_b_title}
                </span>
              </div>

              {diffResult.removed_entities.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono italic">No entities were removed between these snapshots.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diffResult.removed_entities.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1a1522] border border-rose-500/20 rounded-lg p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
                            {item.entity_type}
                          </span>
                          <span className="text-xs font-bold text-slate-200 font-mono line-through">{item.value}</span>
                        </div>
                        {item.details && (
                          <p className="text-[11px] text-slate-400 font-sans">{item.details}</p>
                        )}
                      </div>
                      <span className="text-rose-400 text-xs font-bold font-mono shrink-0">- REMOVED</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Added Relationships / Linkages */}
            {diffResult.added_relationships.length > 0 && (
              <div className="bg-[#0f172a]/90 border border-cyan-500/30 rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                    <GitCompare className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-cyan-300">
                    New Relationship Links (+{diffResult.added_relationships.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {diffResult.added_relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      className="bg-[#121c2e] border border-cyan-500/20 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-slate-200 truncate">{rel.source_value}</span>
                        <span className="text-cyan-400 text-[11px]">--({rel.relation_type})--&gt;</span>
                        <span className="text-slate-200 truncate">{rel.target_value}</span>
                      </div>
                      <span className="text-cyan-400 text-[10px] font-bold shrink-0 ml-2">+ LINK</span>
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
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Capture Graph Snapshot</h3>
                <p className="text-xs text-slate-400">Freeze current graph state for historical comparison</p>
              </div>
            </div>

            <form onSubmit={handleCaptureSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">Snapshot Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baseline Reconnaissance"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#121929] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">Notes / Context (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Captured before automated subdomain scan"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-[#121929] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-700 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md transition disabled:opacity-50"
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
