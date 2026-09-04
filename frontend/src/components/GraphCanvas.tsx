import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { 
  Plus, 
  Radio, 
  Loader2, 
  Sparkles, 
  Info, 
  ShieldAlert, 
  Play, 
  CheckCircle2, 
  AlertOctagon, 
  Repeat, 
  GitFork,
  FileCode2,
  Scale,
  Download,
  Sun,
  Moon,
  Smartphone,
  Eye,
  Filter
} from 'lucide-react';
import { CustomEntityNode } from './CustomEntityNode';
import type { Investigation, EntityType } from '../types';
import { downloadLegalFreezeNoticePDF } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

export interface AgentStageState {
  stageIndex: number; // 0: Idle, 1: Parser, 2: OSINT, 3: Mule, 4: Legal, 5: Complete
  currentAgent: string;
  stageName: string;
  isStreaming: boolean;
  runtimeMs?: number;
  threatSeverity?: number;
  severityLevel?: string;
  cyclicCount?: number;
  splitCount?: number;
}

interface GraphCanvasProps {
  activeCase: Investigation | null;
  initialNodes: Node[];
  initialEdges: Edge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onOpenNewEntityModal: () => void;
  onOpenComplaintModal?: () => void;
  onOpenApkModal?: () => void;
  onOpenVisionModal?: () => void;
  onCleanCdn?: () => void;
  selectedEntityFilters: EntityType[];
  isScanning?: boolean;
  onTriggerScan: () => void;
  onToggleAIChat?: () => void;
  isAIChatOpen?: boolean;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
  agentState?: AgentStageState;
  onQuickTriageSample?: (sampleId: string) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  activeCase,
  initialNodes,
  initialEdges,
  selectedNodeId,
  onSelectNode,
  onOpenNewEntityModal,
  onOpenComplaintModal,
  onOpenApkModal,
  onOpenVisionModal,
  onCleanCdn,
  selectedEntityFilters,
  isScanning = false,
  onTriggerScan,
  onToggleAIChat,
  isAIChatOpen = false,
  onToggleInspector,
  isInspectorOpen = true,
  agentState = { stageIndex: 0, currentAgent: '', stageName: 'Ready', isStreaming: false },
  onQuickTriageSample
}) => {
  const nodeTypes = useMemo(() => ({ customEntityNode: CustomEntityNode }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state when props change
  React.useEffect(() => {
    setNodes(
      initialNodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId
      }))
    );
  }, [initialNodes, selectedNodeId, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Dynamic entity type counts for top bar
  const counts = useMemo(() => {
    const map: Record<string, number> = { 
      COMPLAINT_TICKET: 0, 
      UPI_VPA: 0, 
      MULE_ACCOUNT: 0, 
      BANK_ACCOUNT: 0, 
      PHISHING_URL: 0, 
      DOMAIN: 0, 
      'IP ADDRESS': 0, 
      PHONE: 0, 
      SMS_HEADER: 0,
      APK_HASH: 0
    };
    initialNodes.forEach((n) => {
      const t = n.data.entity_type as string;
      map[t] = (map[t] || 0) + 1;
    });
    return map;
  }, [initialNodes]);

  // Filter nodes based on selectedEntityFilters
  const filteredNodes = useMemo(() => {
    if (selectedEntityFilters.length === 0) return nodes;
    return nodes.filter((n) => selectedEntityFilters.includes(n.data.entity_type as EntityType));
  }, [nodes, selectedEntityFilters]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="flex-1 h-screen relative bg-[#050506] overflow-hidden select-none flex flex-col font-sans">
      {/* Top Header HUD Banner matching uploaded mockup */}
      <div className={`border-b p-2.5 px-6 flex flex-wrap items-center justify-between z-10 shadow-sm gap-3 transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09090b] border-[#27272a] text-white'
      }`}>
        {/* Left: App Title / Case Info & Anomaly Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Brand Name */}
          <span className={`text-xs font-bold tracking-wide font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
            AEGIS-14C (TRACE)
          </span>

          {/* Target Pill */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm shadow-inner border ${
            isLight ? 'bg-[#f1f5f9] border-slate-200' : 'bg-[#121214] border-[#27272a]'
          }`}>
            <ShieldAlert className={`w-4 h-4 ${isLight ? 'text-violet-600' : 'text-violet-400'}`} />
            <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>case:</span>
            <span className={`text-xs font-bold font-mono truncate max-w-[180px] ${isLight ? 'text-slate-900' : 'text-white'}`} title={activeCase?.target || 'AEGIS Target'}>
              {activeCase?.target || 'No Active Case'}
            </span>
          </div>

          {/* Threat Severity Badge */}
          {agentState.threatSeverity !== undefined && agentState.threatSeverity > 0 && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-bold border ${
              agentState.severityLevel === 'CRITICAL' || agentState.threatSeverity >= 80
                ? isLight ? 'bg-rose-100 border-rose-400 text-rose-800 animate-pulse' : 'bg-rose-950/60 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                : isLight ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
            }`}>
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>{agentState.severityLevel || 'HIGH'} ({agentState.threatSeverity}/100)</span>
            </div>
          )}

          {/* Cyclic Laundering Loop Badge */}
          {agentState.cyclicCount !== undefined && agentState.cyclicCount > 0 && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-bold border shadow ${
              isLight ? 'bg-purple-100 border-purple-400 text-purple-800' : 'bg-purple-950/60 border-purple-500/50 text-purple-300'
            }`}>
              <Repeat className={`w-3.5 h-3.5 ${isLight ? 'text-purple-700' : 'text-purple-400'}`} />
              <span>{agentState.cyclicCount} Cyclic</span>
            </div>
          )}

          {/* Rapid Split Anomaly Badge */}
          {agentState.splitCount !== undefined && agentState.splitCount > 0 && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-bold border shadow ${
              isLight ? 'bg-orange-100 border-orange-400 text-orange-800' : 'bg-orange-950/60 border-orange-500/50 text-orange-300'
            }`}>
              <GitFork className={`w-3.5 h-3.5 ${isLight ? 'text-orange-700' : 'text-orange-400'}`} />
              <span>{agentState.splitCount} Splits</span>
            </div>
          )}
        </div>

        {/* Center: Merged Completion Progress Bar & 4-Stage State Machine */}
        <div className={`hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-sm border ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#0d0e14] border-[#27272a]'
        }`}>
          {/* Progress Bar Container matching uploaded UI */}
          <div className={`flex items-center gap-2 pr-2.5 border-r ${isLight ? 'border-slate-200' : 'border-zinc-700'}`}>
            <span className={`text-[10px] uppercase font-bold tracking-wider font-mono whitespace-nowrap ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}>
              Agent Progress
            </span>
            <div className={`w-24 h-2 rounded-full overflow-hidden relative border ${
              isLight ? 'bg-slate-200 border-slate-300' : 'bg-zinc-800 border-zinc-700/50'
            }`}>
              <div
                className={`h-full transition-all duration-300 rounded-full ${isLight ? 'bg-slate-900' : 'bg-white'}`}
                style={{
                  width: `${agentState.stageIndex ? (agentState.stageIndex / 4) * 100 : 0}%`,
                }}
              />
            </div>
            <span className={`text-[10px] font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {agentState.stageIndex || 0}/4
            </span>
          </div>

          {/* 4 Pipeline Stages */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Agent 1: Ingestion */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition ${
              agentState.stageIndex === 1 ? (isLight ? 'bg-violet-100 text-violet-800 border border-violet-400 animate-pulse font-bold' : 'bg-violet-950 text-violet-300 border border-violet-500/40 animate-pulse') :
              agentState.stageIndex > 1 ? (isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-slate-400' : 'text-zinc-500')
            }`}>
              {agentState.stageIndex > 1 ? <CheckCircle2 className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} /> : <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>}
              <span>1. Ingestion</span>
            </div>

            <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>→</span>

            {/* Agent 2: OSINT */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition ${
              agentState.stageIndex === 2 ? (isLight ? 'bg-sky-100 text-sky-800 border border-sky-400 animate-pulse font-bold' : 'bg-sky-950 text-sky-300 border border-sky-500/40 animate-pulse') :
              agentState.stageIndex > 2 ? (isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-slate-400' : 'text-zinc-500')
            }`}>
              {agentState.stageIndex > 2 ? <CheckCircle2 className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} /> : <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>}
              <span>2. OSINT</span>
            </div>

            <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>→</span>

            {/* Agent 3: Mule */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition ${
              agentState.stageIndex === 3 ? (isLight ? 'bg-rose-100 text-rose-800 border border-rose-400 animate-pulse font-bold' : 'bg-rose-950 text-rose-300 border border-rose-500/40 animate-pulse') :
              agentState.stageIndex > 3 ? (isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-slate-400' : 'text-zinc-500')
            }`}>
              {agentState.stageIndex > 3 ? <CheckCircle2 className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} /> : <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>}
              <span>3. Mule Tracer</span>
            </div>

            <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>→</span>

            {/* Agent 4: Legal */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition ${
              agentState.stageIndex === 4 ? (isLight ? 'bg-indigo-100 text-indigo-800 border border-indigo-400 animate-pulse font-bold' : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40 animate-pulse') :
              agentState.stageIndex >= 4 ? (isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-slate-400' : 'text-zinc-500')
            }`}>
              {agentState.stageIndex >= 4 && !agentState.isStreaming ? <CheckCircle2 className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} /> : <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>}
              <span>4. Legal</span>
            </div>

            {agentState.runtimeMs !== undefined && agentState.runtimeMs > 0 && (
              <span className={`text-[10px] pl-2 border-l ${isLight ? 'text-slate-500 border-slate-300' : 'text-zinc-400 border-zinc-700'}`}>
                {(agentState.runtimeMs / 1000).toFixed(2)}s
              </span>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Intake / Triage Modal Trigger */}
          {onOpenComplaintModal && (
            <button
              onClick={onOpenComplaintModal}
              disabled={agentState.isStreaming}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-sm transition shadow-sm border cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                  : 'bg-white text-black hover:bg-stone-100 border-stone-200'
              }`}
            >
              {agentState.isStreaming ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                  <span>Streaming Triage...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>+ Ingest Complaint</span>
                </>
              )}
            </button>
          )}

          {/* Quick OSINT Scan Trigger */}
          <button
            onClick={onTriggerScan}
            disabled={isScanning || !activeCase}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-sm transition border cursor-pointer ${
              isScanning
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : isLight
                  ? 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300 shadow-sm'
                  : 'bg-white text-black hover:bg-stone-100 border-stone-200 shadow-sm'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>OSINT Scanning...</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span>Probe OSINT</span>
              </>
            )}
          </button>

          {/* 1-Click Section 94 BNSS Freeze Notice Download */}
          {activeCase && (
            <button
              onClick={() => downloadLegalFreezeNoticePDF(activeCase.id)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-sm transition shadow-sm cursor-pointer border ${
                isLight
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300'
                  : 'bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-200 border-indigo-500/40'
              }`}
              title="Download Statutory Section 94 BNSS Bank Freeze Notice (PDF)"
            >
              <Scale className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`} />
              <span>Sec 94 Notice</span>
            </button>
          )}

          {/* Phase 3: Static APK Decompiler */}
          {onOpenApkModal && (
            <button
              onClick={onOpenApkModal}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-sm transition shadow-sm cursor-pointer border ${
                isLight
                  ? 'bg-pink-50 hover:bg-pink-100 text-pink-900 border-pink-300'
                  : 'bg-pink-950/80 hover:bg-pink-900/90 text-pink-200 border-pink-500/40'
              }`}
              title="Decompile Android Banking Trojan or Electricity Update APK"
            >
              <Smartphone className={`w-3.5 h-3.5 ${isLight ? 'text-pink-600' : 'text-pink-300'}`} />
              <span>APK Decompiler</span>
            </button>
          )}

          {/* Phase 4: Multi-Modal Vision OCR */}
          {onOpenVisionModal && (
            <button
              onClick={onOpenVisionModal}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-sm transition shadow-sm cursor-pointer border ${
                isLight
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300'
                  : 'bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-200 border-indigo-500/40'
              }`}
              title="Extract Financial Evidence from Handwritten FIR, WhatsApp Chat, or Bank Slip"
            >
              <Eye className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`} />
              <span>Vision OCR</span>
            </button>
          )}

          {/* Phase 3: Clean CDN Proxy Clutter */}
          {onCleanCdn && activeCase && (
            <button
              onClick={onCleanCdn}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-sm transition shadow-sm cursor-pointer border ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-200 border-emerald-500/40'
              }`}
              title="Prune Cloudflare / Akamai CDN Proxy Hairball Nodes"
            >
              <Filter className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`} />
              <span>Clean CDN</span>
            </button>
          )}

          <button
            onClick={onOpenNewEntityModal}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-sm transition cursor-pointer shadow-sm border ${
              isLight
                ? 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                : 'bg-white text-black hover:bg-stone-100 border-stone-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> + Add Node
          </button>

          {onToggleAIChat && (
            <button
              onClick={onToggleAIChat}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-sm transition border cursor-pointer shadow-sm ${
                isAIChatOpen
                  ? isLight ? 'bg-slate-900 text-white border-slate-900 font-bold' : 'bg-white text-black border-stone-200 font-bold'
                  : isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-[#121214] hover:bg-[#18181b] text-zinc-200 border-[#27272a]'
              }`}
              title="Toggle AI Analyst Panel"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>AI Analyst</span>
            </button>
          )}

          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-sm transition border cursor-pointer shadow-sm ${
                isInspectorOpen
                  ? isLight ? 'bg-slate-900 text-white border-slate-900 font-bold' : 'bg-white text-black border-stone-200 font-bold'
                  : isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-[#121214] hover:bg-[#18181b] text-zinc-200 border-[#27272a]'
              }`}
              title="Toggle Inspector Drawer"
            >
              <Info className={`w-3.5 h-3.5 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`} />
              <span>Inspector</span>
            </button>
          )}

          {/* Quick Light/Dark Mode Switcher */}
          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center p-2 rounded-sm border transition cursor-pointer shadow-sm ml-1 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                : 'bg-[#121214] border-[#27272a] text-zinc-200 hover:bg-[#18181b]'
            }`}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
          >
            {isLight ? (
              <Moon className="w-3.5 h-3.5 text-sky-600" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* React Flow Graph Engine */}
      <div className="flex-1 relative bg-[#050506]">
        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2.5}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#3f3f46', strokeWidth: 1.5 }
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
          <Controls showZoom={true} showFitView={true} showInteractive={true} className="!bg-[#121214] !border-[#27272a] !text-zinc-300" />
          <MiniMap
            nodeColor={(n) => {
              switch (n.data?.entity_type) {
                case 'COMPLAINT_TICKET': return '#8b5cf6';
                case 'UPI_VPA': return '#06b6d4';
                case 'MULE_ACCOUNT': return '#ef4444';
                case 'BANK_ACCOUNT': return '#10b981';
                case 'PHISHING_URL': return '#f97316';
                case 'DOMAIN': return '#38bdf8';
                case 'IP ADDRESS': return '#34d399';
                default: return '#71717a';
              }
            }}
            maskColor="rgba(7, 8, 15, 0.8)"
            className="!bg-[#121214] !border-[#27272a] !rounded-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

