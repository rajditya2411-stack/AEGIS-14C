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
  Moon
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

  return (
    <div className="flex-1 h-screen relative bg-[#050506] dark:bg-[#050506] light:bg-[#ffffff] overflow-hidden select-none flex flex-col font-sans transition-colors duration-200">
      {/* Top Header HUD Banner matching uploaded mockup */}
      <div className="bg-[#09090b] dark:bg-[#09090b] light:bg-[#ffffff] border-b border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] p-2.5 px-6 flex flex-wrap items-center justify-between z-10 shadow-sm gap-3 transition-colors duration-200">
        {/* Left: App Title / Case Info & Anomaly Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Target Pill */}
          <div className="flex items-center gap-2 bg-[#121214] dark:bg-[#121214] light:bg-[#f1f5f9] border border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] px-3.5 py-1.5 rounded-sm shadow-inner">
            <ShieldAlert className="w-4 h-4 text-violet-400 dark:text-violet-400 light:text-violet-600" />
            <span className="text-zinc-400 dark:text-zinc-500 light:text-slate-500 text-xs font-mono">case:</span>
            <span className="text-white dark:text-white light:text-slate-900 text-xs font-bold font-mono truncate max-w-[180px]" title={activeCase?.target || 'AEGIS Target'}>
              {activeCase?.target || 'No Active Case'}
            </span>
          </div>

          {/* Threat Severity Badge */}
          {agentState.threatSeverity !== undefined && agentState.threatSeverity > 0 && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-bold border ${
              agentState.severityLevel === 'CRITICAL' || agentState.threatSeverity >= 80
                ? 'bg-rose-950/60 dark:bg-rose-950/60 light:bg-rose-50 border-rose-500/50 text-rose-400 dark:text-rose-400 light:text-rose-700 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                : 'bg-amber-950/60 dark:bg-amber-950/60 light:bg-amber-50 border-amber-500/50 text-amber-300 dark:text-amber-300 light:text-amber-800'
            }`}>
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>{agentState.severityLevel || 'HIGH'} ({agentState.threatSeverity}/100)</span>
            </div>
          )}

          {/* Cyclic Laundering Loop Badge */}
          {agentState.cyclicCount !== undefined && agentState.cyclicCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-bold bg-purple-950/60 dark:bg-purple-950/60 light:bg-purple-50 border border-purple-500/50 text-purple-300 dark:text-purple-300 light:text-purple-800 shadow">
              <Repeat className="w-3.5 h-3.5 text-purple-400 dark:text-purple-400 light:text-purple-600" />
              <span>{agentState.cyclicCount} Cyclic</span>
            </div>
          )}

          {/* Rapid Split Anomaly Badge */}
          {agentState.splitCount !== undefined && agentState.splitCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-bold bg-orange-950/60 dark:bg-orange-950/60 light:bg-orange-50 border border-orange-500/50 text-orange-300 dark:text-orange-300 light:text-orange-800 shadow">
              <GitFork className="w-3.5 h-3.5 text-orange-400 dark:text-orange-400 light:text-orange-600" />
              <span>{agentState.splitCount} Splits</span>
            </div>
          )}
        </div>

        {/* Center: Merged Completion Progress Bar & 4-Stage State Machine */}
        <div className="hidden lg:flex items-center gap-3 bg-[#0d0e14] dark:bg-[#0d0e14] light:bg-[#f8fafc] border border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] px-3.5 py-1.5 rounded-sm">
          {/* Progress Bar Container matching uploaded UI */}
          <div className="flex items-center gap-2 pr-2.5 border-r border-zinc-700 dark:border-zinc-700 light:border-slate-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-400 light:text-slate-500 font-mono whitespace-nowrap">
              Agent Progress
            </span>
            <div className="w-24 h-2 rounded-full bg-zinc-800 dark:bg-zinc-800 light:bg-slate-200 overflow-hidden relative border border-zinc-700/50 dark:border-zinc-700/50 light:border-slate-300">
              <div
                className="h-full bg-white dark:bg-white light:bg-slate-900 transition-all duration-300 rounded-full"
                style={{
                  width: `${agentState.stageIndex ? (agentState.stageIndex / 4) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-white dark:text-white light:text-slate-900">
              {agentState.stageIndex || 0}/4
            </span>
          </div>

          {/* 4 Pipeline Stages */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Agent 1: Ingestion */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition ${
              agentState.stageIndex === 1 ? 'bg-violet-950 text-violet-300 border border-violet-500/40 animate-pulse' :
              agentState.stageIndex > 1 ? 'text-emerald-400 dark:text-emerald-400 light:text-emerald-600 font-bold' : 'text-zinc-500 dark:text-zinc-500 light:text-slate-400'
            }`}>
              {agentState.stageIndex > 1 ? <CheckCircle2 className="w-3 h-3 text-emerald-400 dark:text-emerald-400 light:text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>}
              <span>1. Ingestion</span>
            </div>

            <span className="text-zinc-600 dark:text-zinc-600 light:text-slate-300">→</span>

            {/* Agent 2: OSINT */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition ${
              agentState.stageIndex === 2 ? 'bg-sky-950 text-sky-300 border border-sky-500/40 animate-pulse' :
              agentState.stageIndex > 2 ? 'text-emerald-400 dark:text-emerald-400 light:text-emerald-600 font-bold' : 'text-zinc-500 dark:text-zinc-500 light:text-slate-400'
            }`}>
              {agentState.stageIndex > 2 ? <CheckCircle2 className="w-3 h-3 text-emerald-400 dark:text-emerald-400 light:text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>}
              <span>2. OSINT</span>
            </div>

            <span className="text-zinc-600 dark:text-zinc-600 light:text-slate-300">→</span>

            {/* Agent 3: Mule */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition ${
              agentState.stageIndex === 3 ? 'bg-rose-950 text-rose-300 border border-rose-500/40 animate-pulse' :
              agentState.stageIndex > 3 ? 'text-emerald-400 dark:text-emerald-400 light:text-emerald-600 font-bold' : 'text-zinc-500 dark:text-zinc-500 light:text-slate-400'
            }`}>
              {agentState.stageIndex > 3 ? <CheckCircle2 className="w-3 h-3 text-emerald-400 dark:text-emerald-400 light:text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>}
              <span>3. Mule Tracer</span>
            </div>

            <span className="text-zinc-600 dark:text-zinc-600 light:text-slate-300">→</span>

            {/* Agent 4: Legal */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition ${
              agentState.stageIndex === 4 ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40 animate-pulse' :
              agentState.stageIndex >= 4 ? 'text-emerald-400 dark:text-emerald-400 light:text-emerald-600 font-bold' : 'text-zinc-500 dark:text-zinc-500 light:text-slate-400'
            }`}>
              {agentState.stageIndex >= 4 && !agentState.isStreaming ? <CheckCircle2 className="w-3 h-3 text-emerald-400 dark:text-emerald-400 light:text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>}
              <span>4. Legal</span>
            </div>

            {agentState.runtimeMs !== undefined && agentState.runtimeMs > 0 && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-400 light:text-slate-500 pl-2 border-l border-zinc-700 dark:border-zinc-700 light:border-slate-300">
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
              className="flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-white light:bg-slate-900 text-black dark:text-black light:text-white hover:bg-stone-100 dark:hover:bg-stone-100 light:hover:bg-slate-800 px-3.5 py-2 rounded-sm transition shadow-sm border border-stone-200 dark:border-stone-200 light:border-slate-800 cursor-pointer disabled:opacity-50"
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
                : 'bg-white dark:bg-white light:bg-white text-black dark:text-black light:text-slate-900 hover:bg-stone-100 dark:hover:bg-stone-100 light:hover:bg-slate-50 border-stone-200 dark:border-stone-200 light:border-slate-300 shadow-sm'
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

          {/* 1-Click Section 106 BNSS Freeze Notice Download */}
          {activeCase && (
            <button
              onClick={() => downloadLegalFreezeNoticePDF(activeCase.id)}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-950/80 dark:bg-indigo-950/80 light:bg-indigo-50 hover:bg-indigo-900/90 dark:hover:bg-indigo-900/90 light:hover:bg-indigo-100 text-indigo-200 dark:text-indigo-200 light:text-indigo-900 border border-indigo-500/40 dark:border-indigo-500/40 light:border-indigo-200 px-3 py-2 rounded-sm transition shadow-sm cursor-pointer"
              title="Download Statutory Section 106 BNSS Bank Freeze Notice (PDF)"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-300 dark:text-indigo-300 light:text-indigo-700" />
              <span>Sec 106 Notice</span>
            </button>
          )}

          <button
            onClick={onOpenNewEntityModal}
            className="flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-white light:bg-white hover:bg-stone-100 dark:hover:bg-stone-100 light:hover:bg-slate-50 text-black dark:text-black light:text-slate-900 border border-stone-200 dark:border-stone-200 light:border-slate-300 px-3 py-2 rounded-sm transition cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> + Add Node
          </button>

          {onToggleAIChat && (
            <button
              onClick={onToggleAIChat}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-sm transition border cursor-pointer ${
                isAIChatOpen
                  ? 'bg-white dark:bg-white light:bg-slate-900 text-black dark:text-black light:text-white border-stone-200 dark:border-stone-200 light:border-slate-900 font-bold shadow-sm'
                  : 'bg-[#121214] dark:bg-[#121214] light:bg-white hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-50 text-zinc-200 dark:text-zinc-200 light:text-slate-700 border-[#27272a] dark:border-[#27272a] light:border-slate-300 shadow-sm'
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
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-sm transition border cursor-pointer ${
                isInspectorOpen
                  ? 'bg-white dark:bg-white light:bg-slate-900 text-black dark:text-black light:text-white border-stone-200 dark:border-stone-200 light:border-slate-900 font-bold shadow-sm'
                  : 'bg-[#121214] dark:bg-[#121214] light:bg-white hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-50 text-zinc-200 dark:text-zinc-200 light:text-slate-700 border-[#27272a] dark:border-[#27272a] light:border-slate-300 shadow-sm'
              }`}
              title="Toggle Inspector Drawer"
            >
              <Info className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-300 light:text-slate-600" />
              <span>Inspector</span>
            </button>
          )}

          {/* Quick Light/Dark Mode Switcher */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center p-2 rounded-sm border border-[#27272a] dark:border-[#27272a] light:border-slate-300 bg-[#121214] dark:bg-[#121214] light:bg-white text-zinc-200 dark:text-zinc-200 light:text-slate-800 hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-100 transition cursor-pointer shadow-sm ml-1"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-sky-600" />
            )}
          </button>
        </div>
      </div>

      {/* React Flow Graph Engine */}
      <div className="flex-1 relative">
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

