import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Upload, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  ShieldAlert, 
  FileText, 
  ChevronRight,
  TrendingUp,
  Activity,
  Download,
  Search
} from 'lucide-react';
import type { Investigation } from '../types';
import * as api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface MuleLedgerViewProps {
  activeCase: Investigation | null;
  onRefreshCase?: () => void;
}

const SAMPLE_CSV = `Date,Counterparty,Debit,UTR,Bank
2026-03-01,sbi.mule1@oksbi,150000,UTR98112001,State Bank of India
2026-03-01,icici.mule2@icici,75000,UTR98112002,ICICI Bank
2026-03-01,axis.mule3@axis,75000,UTR98112003,Axis Bank
2026-03-01,atm.cashout.hub@axis,50000,UTR98112004,Axis Bank
2026-03-01,sbi.mule1@oksbi,25000,UTR98112005,State Bank of India`;

export const MuleLedgerView: React.FC<MuleLedgerViewProps> = ({ activeCase, onRefreshCase }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [csvInput, setCsvInput] = useState(SAMPLE_CSV);
  const [sourceAccount, setSourceAccount] = useState('victim.hdfc@bank');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // Analytics state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [custodyEnvelope, setCustodyEnvelope] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLayer, setFilterLayer] = useState<number | 'ALL'>('ALL');

  const loadTransactions = async () => {
    if (!activeCase) return;
    try {
      const txs = await api.fetchMuleTransactions(activeCase.id);
      setTransactions(txs);
    } catch (err) {
      console.error('Error fetching mule transactions:', err);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [activeCase?.id]);

  const handleIngestCSV = async () => {
    if (!activeCase || !csvInput.trim()) return;
    setIsIngesting(true);
    setIngestError(null);
    setIngestSuccess(null);

    try {
      const res = await api.ingestBankStatementCSV(activeCase.id, csvInput, sourceAccount);
      setCustodyEnvelope(res.custody_envelope);
      setAnalysis(res.analysis);
      setIngestSuccess(`Successfully ingested ${res.analysis.total_transactions} transactions across ${res.analysis.node_count} mule accounts.`);
      await loadTransactions();
      if (onRefreshCase) onRefreshCase();
    } catch (err: any) {
      setIngestError(err.message || 'Failed to ingest bank statement CSV');
    } finally {
      setIsIngesting(false);
    }
  };

  const filteredNodes = (analysis?.nodes || []).filter((n: any) => {
    const matchesSearch = !searchTerm || n.vpa_or_account.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLayer = filterLayer === 'ALL' || n.layer === filterLayer;
    return matchesSearch && matchesLayer;
  });

  return (
    <div className={`flex-1 h-screen overflow-y-auto font-sans p-6 space-y-6 transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#07080f] text-zinc-100'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 border-[#27272a]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold font-mono">Multi-Hop Mule Ledger & Financial Forensics</h1>
              <p className="text-xs text-zinc-400 font-mono">
                NetworkX BFS Layering (L1 → L5), Cyclic Laundering Detection & Automated CSV Ingestion
              </p>
            </div>
          </div>
        </div>

        {activeCase && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500">Active Case:</span>
            <span className="px-2 py-1 rounded-sm bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold">
              {activeCase.title}
            </span>
          </div>
        )}
      </div>

      {/* Top Action Grid: Ingestion & Forensic Envelope */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CSV Ingest Box */}
        <div className={`lg:col-span-2 border rounded-sm p-4 space-y-3 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0d0e17] border-[#27272a]'
        }`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-rose-400" />
              Bank Statement CSV Ingestion (Golden Hour Triage)
            </h2>
            <span className="text-[10px] font-mono text-zinc-400">Formats: HDFC, SBI, ICICI, Axis, Paytm</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Victim / Source Remitter Account:</label>
              <input
                type="text"
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                placeholder="e.g. victim.hdfc@bank"
                className={`w-full px-2.5 py-1.5 rounded-sm border text-xs font-mono outline-none ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121214] border-[#27272a] text-zinc-100'
                }`}
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Load Sample Preset:</label>
              <button
                onClick={() => setCsvInput(SAMPLE_CSV)}
                className="px-3 py-1.5 rounded-sm border text-xs font-mono text-zinc-300 border-[#27272a] hover:bg-[#18181b] transition cursor-pointer w-full text-left"
              >
                ⚡ 5-Layer Mule Fan-Out Preset (₹3,75,000)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1">Raw CSV Statement Data:</label>
            <textarea
              rows={5}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              className={`w-full p-2.5 rounded-sm border text-xs font-mono outline-none resize-none ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#07080f] border-[#27272a] text-emerald-400'
              }`}
            />
          </div>

          {ingestSuccess && (
            <div className="p-2.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{ingestSuccess}</span>
            </div>
          )}

          {ingestError && (
            <div className="p-2.5 rounded-sm bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{ingestError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleIngestCSV}
              disabled={isIngesting || !activeCase}
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-white text-black font-bold text-xs hover:bg-stone-200 transition cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {isIngesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              <span>Execute Multi-Hop Graph Analysis</span>
            </button>
          </div>
        </div>

        {/* Section 63 BSA Forensic Chain-of-Custody Box */}
        <div className={`border rounded-sm p-4 space-y-3 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0d0e17] border-[#27272a]'
        }`}>
          <h2 className="text-xs font-bold font-mono flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Section 63 BSA Custody Envelope
          </h2>

          {custodyEnvelope ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded-sm bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                <span className="block text-[9px] text-zinc-400 uppercase">Custody ID:</span>
                <span className="font-bold text-[11px]">{custodyEnvelope.custody_id}</span>
              </div>

              <div>
                <span className="block text-[9px] text-zinc-400 uppercase">SHA-256 Checksum:</span>
                <span className="font-bold text-[10px] text-emerald-400 break-all">{custodyEnvelope.sha256}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-zinc-500 block">Artifact Size:</span>
                  <span className="text-zinc-200">{custodyEnvelope.byte_size} bytes</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Timestamp:</span>
                  <span className="text-zinc-200">{new Date(custodyEnvelope.captured_at_utc).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="p-2 rounded-sm bg-[#121214] border border-[#27272a] text-[10px] text-zinc-400">
                <span className="text-emerald-400 font-bold">✓ Court Admissible</span> u/s 63(4) Bharatiya Sakshya Adhiniyam, 2023.
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs font-mono text-zinc-500 space-y-2">
              <ShieldAlert className="w-6 h-6 mx-auto opacity-40" />
              <p>Upload a statement CSV to generate cryptographic chain-of-custody proof.</p>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Metrics Cards */}
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className={`p-3 border rounded-sm space-y-1 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'}`}>
            <span className="text-[10px] text-zinc-400 uppercase block">Total Defrauded Flow</span>
            <span className="text-base font-bold text-rose-400">₹{analysis.total_flow_amount.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-500 block">Across {analysis.total_transactions} Transfers</span>
          </div>

          <div className={`p-3 border rounded-sm space-y-1 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'}`}>
            <span className="text-[10px] text-zinc-400 uppercase block">Mule Accounts Identified</span>
            <span className="text-base font-bold text-amber-400">{analysis.node_count} Nodes</span>
            <span className="text-[10px] text-zinc-500 block">Max Layer: 5 (Fan-Out)</span>
          </div>

          <div className={`p-3 border rounded-sm space-y-1 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'}`}>
            <span className="text-[10px] text-zinc-400 uppercase block">Laundering Hubs Flagged</span>
            <span className="text-base font-bold text-rose-500">{analysis.hubs.length} Hubs</span>
            <span className="text-[10px] text-zinc-500 block">Velocity Ratio &gt; 0.85</span>
          </div>

          <div className={`p-3 border rounded-sm space-y-1 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e17] border-[#27272a]'}`}>
            <span className="text-[10px] text-zinc-400 uppercase block">Cyclic Laundering Loops</span>
            <span className="text-base font-bold text-emerald-400">{analysis.cycles.length} Cycles</span>
            <span className="text-[10px] text-zinc-500 block">Johnson's Algorithm</span>
          </div>
        </div>
      )}

      {/* Mule Account Network Breakdown */}
      {analysis && (
        <div className={`border rounded-sm p-4 space-y-3 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0d0e17] border-[#27272a]'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-bold font-mono">Multi-Tier Account Topology & Risk Scoring</h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search account/VPA..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 rounded-sm bg-[#121214] border border-[#27272a] text-xs text-zinc-200 outline-none w-48"
                />
              </div>

              <select
                value={filterLayer}
                onChange={(e) => setFilterLayer(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-2 py-1 rounded-sm bg-[#121214] border border-[#27272a] text-xs text-zinc-200 outline-none cursor-pointer"
              >
                <option value="ALL">All Layers (0-5)</option>
                <option value="0">Layer 0 (Victim)</option>
                <option value="1">Layer 1 (Ingress Mule)</option>
                <option value="2">Layer 2 (Intermediary)</option>
                <option value="3">Layer 3+ (Cashout/Exit)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="border-b border-[#27272a] text-zinc-500 text-[10px] uppercase">
                  <th className="pb-2">Tier / Layer</th>
                  <th className="pb-2">Account / UPI VPA</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Inflow</th>
                  <th className="pb-2">Outflow</th>
                  <th className="pb-2">Velocity Ratio</th>
                  <th className="pb-2">Risk Score</th>
                  <th className="pb-2 text-right">Statutory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {filteredNodes.map((n: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/5 transition">
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-sm border text-[10px] font-bold ${
                        n.layer === 0 ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' :
                        n.layer === 1 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                        n.layer === 2 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      }`}>
                        L{n.layer}
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-zinc-200">{n.vpa_or_account}</td>
                    <td className="py-2.5 text-zinc-400">{n.role}</td>
                    <td className="py-2.5 text-emerald-400">₹{n.in_amount.toLocaleString()}</td>
                    <td className="py-2.5 text-rose-400">₹{n.out_amount.toLocaleString()}</td>
                    <td className="py-2.5 text-zinc-300">{n.velocity_ratio}x</td>
                    <td className="py-2.5">
                      <span className={`font-bold ${
                        n.risk_score >= 85 ? 'text-rose-500' :
                        n.risk_score >= 60 ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {n.risk_score}/100
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {n.layer > 0 ? (
                        <span className="px-2 py-0.5 rounded-sm bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
                          SEC 94 BNSS FREEZE
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-[10px]">COMPLAINANT</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
