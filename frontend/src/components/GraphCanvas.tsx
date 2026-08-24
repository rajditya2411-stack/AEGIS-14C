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
  Download
} from 'lucide-react';
import { CustomEntityNode } from './CustomEntityNode';
import type { Investigation, EntityType } from '../types';
import { downloadLegalFreezeNoticePDF } from '../lib/api';

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

  return (
    <div className="flex-1 h-screen relative bg-[#07080f] overflow-hidden select-none flex flex-col font-sans">
      {/* Top Header HUD Banner */}
      <div className="bg-[#09090b] border-b border-[#27272a] p-2.5 px-6 flex flex-wrap items-center justify-between z-10 shadow-sm gap-3">
        {/* Left: Case Info & Anomaly Badges */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Target Pill */}
          <div className="flex items-center gap-2 bg-[#121214] border border-[#27272a] px-3.5 py-1.5 rounded-md shadow-inner">
            <ShieldAlert className="w-4 h-4 text-violet-400" />
            <span className="text-zinc-500 text-xs font-mono">case:</span>
            <span className="text-white text-xs font-bold font-mono truncate max-w-[200px]" title={activeCase?.target || 'AEGIS Target'}>
              {activeCase?.target || 'No Active Case'}
            </span>
          </div>

          {/* Threat Severity Badge */}
          {agentState.threatSeverity !== undefined && agentState.threatSeverity > 0 && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
              agentState.severityLevel === 'CRITICAL' || agentState.threatSeverity >= 80
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
            }`}>
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>{agentState.severityLevel || 'HIGH'} ({agentState.threatSeverity}/100)</span>
            </div>
          )}

          {/* Cyclic Laundering Loop Badge */}
          {agentState.cyclicCount !== undefined && agentState.cyclicCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-purple-950/60 border border-purple-500/50 text-purple-300 shadow">
              <Repeat className="w-3.5 h-3.5 text-purple-400" />
              <span>{agentState.cyclicCount} Cyclic Loop(s)</span>
            </div>
          )}

          {/* Rapid Split Anomaly Badge */}
          {agentState.splitCount !== undefined && agentState.splitCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-orange-950/60 border border-orange-500/50 text-orange-300 shadow">
              <GitFork className="w-3.5 h-3.5 text-orange-400" />
              <span>{agentState.splitCount} Rapid Split(s)</span>
            </div>
          )}
        </div>

        {/* Center: Live Agent State Machine Indicators (4 Stage Pills) */}
        <div className="hidden xl:flex items-center gap-2 text-xs font-mono bg-[#0d0e14] border border-[#27272a] px-3 py-1.5 rounded-lg">
          {/* Agent 1: Ingestion */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition ${
            agentState.stageIndex === 1 ? 'bg-violet-950 text-violet-300 border border-violet-500/40 animate-pulse' :
            agentState.stageIndex > 1 ? 'text-emerald-400' : 'text-zinc-500'
          }`}>
            {agentState.stageIndex > 1 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="w-2 h-2 rounded-full bg-violet-400"></span>}
            <span>1. Ingestion</span>
          </div>

          <span className="text-zinc-600">→</span>

          {/* Agent 2: OSINT */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition ${
            agentState.stageIndex === 2 ? 'bg-sky-950 text-sky-300 border border-sky-500/40 animate-pulse' :
            agentState.stageIndex > 2 ? 'text-emerald-400' : 'text-zinc-500'
          }`}>
            {agentState.stageIndex > 2 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="w-2 h-2 rounded-full bg-sky-400"></span>}
            <span>2. OSINT Sentinel</span>
          </div>

          <span className="text-zinc-600">→</span>

          {/* Agent 3: Mule Tracer */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition ${
            agentState.stageIndex === 3 ? 'bg-rose-950 text-rose-300 border border-rose-500/40 animate-pulse' :
            agentState.stageIndex > 3 ? 'text-emerald-400' : 'text-zinc-500'
          }`}>
            {agentState.stageIndex > 3 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="w-2 h-2 rounded-full bg-rose-400"></span>}
            <span>3. Mule Tracer</span>
          </div>

          <span className="text-zinc-600">→</span>

          {/* Agent 4: Legal Arbiter */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition ${
            agentState.stageIndex === 4 ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40 animate-pulse' :
            agentState.stageIndex >= 4 ? 'text-emerald-400' : 'text-zinc-500'
          }`}>
            {agentState.stageIndex >= 4 && !agentState.isStreaming ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="w-2 h-2 rounded-full bg-indigo-400"></span>}
            <span>4. Legal Arbiter</span>
          </div>

          {agentState.runtimeMs !== undefined && agentState.runtimeMs > 0 && (
            <span className="text-[10px] text-zinc-400 pl-2 border-l border-zinc-700">
              {(agentState.runtimeMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Intake / Triage Modal Trigger */}
          {onOpenComplaintModal && (
            <button
              onClick={onOpenComplaintModal}
              disabled={agentState.isStreaming}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#f5f5f4] hover:bg-white text-zinc-950 px-3.5 py-2 rounded-md transition shadow-sm border border-stone-200 cursor-pointer disabled:opacity-50"
            >
              {agentState.isStreaming ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                  <span>Streaming Triage...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-zinc-950" />
                  <span>+ Ingest Complaint</span>
                </>
              )}
            </button>
          )}

          {/* Quick OSINT Scan Trigger */}
          <button
            onClick={onTriggerScan}
            disabled={isScanning || !activeCase}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition border cursor-pointer ${
              isScanning
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : 'bg-[#121214] hover:bg-[#18181b] text-zinc-200 border-[#27272a]'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>OSINT Scanning...</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>Probe OSINT</span>
              </>
            )}
          </button>

          {/* 1-Click Section 106 BNSS Freeze Notice Download */}
          {activeCase && (
            <button
              onClick={() => downloadLegalFreezeNoticePDF(activeCase.id)}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-500/40 px-3 py-2 rounded-md transition shadow-sm cursor-pointer"
              title="Download Statutory Section 106 BNSS Bank Freeze Notice (PDF)"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sec 106 Notice</span>
            </button>
          )}

          <button
            onClick={onOpenNewEntityModal}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[#121214] hover:bg-[#18181b] text-white border border-[#27272a] px-3 py-2 rounded-md transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400" /> + Add Node
          </button>

          {onToggleAIChat && (
            <button
              onClick={onToggleAIChat}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition border cursor-pointer ${
                isAIChatOpen
                  ? 'bg-[#27272a] border-[#3f3f46] text-white'
                  : 'bg-[#121214] hover:bg-[#18181b] text-zinc-300 border-[#27272a]'
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
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition border cursor-pointer ${
                isInspectorOpen
                  ? 'bg-[#27272a] border-[#3f3f46] text-white'
                  : 'bg-[#121214] hover:bg-[#18181b] text-zinc-300 border-[#27272a]'
              }`}
              title="Toggle Inspector Drawer"
            >
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Inspector</span>
            </button>
          )}
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

