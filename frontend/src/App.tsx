import React, { useEffect, useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { Sidebar } from './components/Sidebar';
import type { NavView } from './components/Sidebar';
import { GraphCanvas } from './components/GraphCanvas';
import { InspectorDrawer } from './components/InspectorDrawer';
import { TimelineView } from './components/TimelineView';
import { SnapshotDiffView } from './components/SnapshotDiffView';
import { NewCaseModal, NewEntityModal } from './components/Modals';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { AuthScreen } from './components/AuthScreen';
import { AIChatPanel } from './components/AIChatPanel';
import { ComplaintIntakeModal } from './components/ComplaintIntakeModal';
import type { AgentStageState } from './components/GraphCanvas';
import type { Investigation, Entity, Relationship, Note, EntityType, ConfidenceLevel, User } from './types';
import * as api from './lib/api';
import { Loader2, ShieldAlert } from 'lucide-react';

export function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Navigation & Workspace State
  const [currentNav, setCurrentNav] = useState<NavView>('workspace');
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  // Active case state
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [graphNodes, setGraphNodes] = useState<Node[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);

  // AEGIS-I4C Agent State Machine
  const [agentState, setAgentState] = useState<AgentStageState>({
    stageIndex: 0,
    currentAgent: '',
    stageName: 'Ready',
    isStreaming: false
  });
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  // Selection & UI State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEntityFilters, setSelectedEntityFilters] = useState<EntityType[]>([]);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isNewEntityModalOpen, setIsNewEntityModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Check Auth State on App Launch
  const checkAuth = useCallback(async () => {
    try {
      if (api.getAuthToken()) {
        const user = await api.fetchCurrentUser();
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load cases list
  const loadInvestigations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.fetchInvestigations();
      setInvestigations(data);
      if (data.length > 0 && !activeCaseId) {
        setActiveCaseId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching investigations:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId, currentUser]);

  // Load active case details & graph
  const loadActiveCaseData = useCallback(async (id: string) => {
    try {
      const [ents, rels, nts, graphData] = await Promise.all([
        api.fetchEntities(id),
        api.fetchRelationships(id),
        api.fetchNotes(id),
        api.fetchGraph(id)
      ]);

      setEntities(ents);
      setRelationships(rels);
      setNotes(nts);
      setGraphNodes(graphData.nodes);
      setGraphEdges(graphData.edges);
    } catch (err) {
      console.error('Error loading case data:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadInvestigations();
    }
  }, [currentUser, loadInvestigations]);

  useEffect(() => {
    if (activeCaseId && currentUser) {
      loadActiveCaseData(activeCaseId);
      setSelectedNodeId(null);
      setAgentState({
        stageIndex: 0,
        currentAgent: '',
        stageName: 'Ready',
        isStreaming: false,
        threatSeverity: undefined,
        severityLevel: undefined,
        cyclicCount: undefined,
        splitCount: undefined,
        runtimeMs: undefined
      });
    }
  }, [activeCaseId, currentUser, loadActiveCaseData]);

  // Case Actions
  const handleCreateCase = async (title: string, target: string, type: string) => {
    try {
      const newCase = await api.createInvestigation({ title, target, type });
      setInvestigations((prev) => [newCase, ...prev]);
      setActiveCaseId(newCase.id);
      setCurrentNav('workspace');
    } catch (err) {
      console.error('Error creating case:', err);
    }
  };

  const handleDeleteCase = async (id: string) => {
    try {
      await api.deleteInvestigation(id);
      setInvestigations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (activeCaseId === id) {
          if (remaining.length > 0) {
            setActiveCaseId(remaining[0].id);
          } else {
            setActiveCaseId(null);
            setEntities([]);
            setRelationships([]);
            setNotes([]);
            setGraphNodes([]);
            setGraphEdges([]);
          }
        }
        return remaining;
      });
    } catch (err) {
      console.error('Error deleting case:', err);
    }
  };

  // Node & Relationship Actions
  const handleCreateEntity = async (value: string, type: EntityType) => {
    if (!activeCaseId) return;
    try {
      await api.createEntity(activeCaseId, { entity_type: type, value });
      await loadActiveCaseData(activeCaseId);
    } catch (err) {
      console.error('Error creating entity:', err);
    }
  };

  const handleDeleteEntity = async (id: string) => {
    if (!activeCaseId) return;
    try {
      await api.deleteEntity(id);
      if (selectedNodeId === id) setSelectedNodeId(null);
      await loadActiveCaseData(activeCaseId);
    } catch (err) {
      console.error('Error deleting entity:', err);
    }
  };

  const handleCreateRelationship = async (targetId: string, relType: string, confidence: ConfidenceLevel) => {
    if (!selectedNodeId) return;
    try {
      await api.createRelationship({
        source_id: selectedNodeId,
        target_id: targetId,
        relation_type: relType,
        confidence
      });
      if (activeCaseId) await loadActiveCaseData(activeCaseId);
    } catch (err) {
      console.error('Error creating relationship:', err);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    try {
      await api.deleteRelationship(relId);
      if (activeCaseId) await loadActiveCaseData(activeCaseId);
    } catch (err) {
      console.error('Error deleting relationship:', err);
    }
  };

  // Note Actions
  const handleCreateNote = async (title: string, content: string) => {
    if (!activeCaseId) return;
    try {
      await api.createNote(activeCaseId, { title, content });
      await loadActiveCaseData(activeCaseId);
    } catch (err) {
      console.error('Error creating note:', err);
    }
  };

  const handleUpdateNote = async (id: string, title: string, content: string) => {
    try {
      await api.updateNote(id, { title, content });
      if (activeCaseId) await loadActiveCaseData(activeCaseId);
    } catch (err) {
      console.error('Error updating note:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await api.deleteNote(id);
      if (activeCaseId) await loadActiveCaseData(activeCaseId);
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // Filter Actions
  const handleToggleFilter = (type: EntityType) => {
    setSelectedEntityFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Trigger AEGIS-I4C Autonomous Multi-Agent Triage Stream
  const handleRunAutonomousTriage = async (payload: {
    raw_text: string;
    source_channel: string;
    complainant_name?: string;
    complainant_contact?: string;
  }) => {
    setAgentState({
      stageIndex: 0,
      currentAgent: 'Initializing',
      stageName: 'Intake Payload',
      isStreaming: true,
      runtimeMs: 0
    });
    setScanLogs([`[${new Date().toLocaleTimeString()}] AEGIS-I4C: Ingesting citizen complaint payload...`]);

    try {
      await api.streamAutonomousTriage(
        payload,
        (eventType, eventData) => {
          if (eventType === 'stage_init') {
            setAgentState((prev) => ({
              ...prev,
              stageIndex: 0,
              currentAgent: 'Engine Initialized',
              stageName: 'Triage Loop Started'
            }));
          } else if (eventType === 'agent_status') {
            setAgentState((prev) => ({
              ...prev,
              stageIndex: eventData.stage_index,
              currentAgent: eventData.agent,
              stageName: eventData.message,
              runtimeMs: eventData.runtime_ms
            }));
            setScanLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ${eventData.agent}: ${eventData.message}`
            ]);
          } else if (eventType === 'stage_ingestion') {
            if (eventData.investigation_id) {
              setActiveCaseId(eventData.investigation_id);
            }
            if (eventData.graph) {
              setGraphNodes(eventData.graph.nodes);
              setGraphEdges(eventData.graph.edges);
            }
            setAgentState((prev) => ({
              ...prev,
              stageIndex: 1,
              threatSeverity: eventData.threat_severity,
              severityLevel: eventData.severity_level,
              runtimeMs: eventData.runtime_ms
            }));
          } else if (eventType === 'stage_osint') {
            if (eventData.graph) {
              setGraphNodes(eventData.graph.nodes);
              setGraphEdges(eventData.graph.edges);
            }
            setAgentState((prev) => ({
              ...prev,
              stageIndex: 2,
              runtimeMs: eventData.runtime_ms
            }));
          } else if (eventType === 'stage_mule_tracer') {
            if (eventData.graph) {
              setGraphNodes(eventData.graph.nodes);
              setGraphEdges(eventData.graph.edges);
            }
            const anomalies = eventData.anomalies || {};
            setAgentState((prev) => ({
              ...prev,
              stageIndex: 3,
              cyclicCount: (anomalies.cyclic_loops || []).length,
              splitCount: (anomalies.rapid_splits || []).length,
              runtimeMs: eventData.runtime_ms
            }));
          } else if (eventType === 'stage_legal_arbiter') {
            setAgentState((prev) => ({
              ...prev,
              stageIndex: 4,
              runtimeMs: eventData.runtime_ms
            }));
          } else if (eventType === 'triage_complete') {
            if (eventData.graph) {
              setGraphNodes(eventData.graph.nodes);
              setGraphEdges(eventData.graph.edges);
            }
            setAgentState((prev) => ({
              ...prev,
              stageIndex: 4,
              isStreaming: false,
              runtimeMs: eventData.total_runtime_ms
            }));
            setScanLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] COMPLETE: Autonomous Triage finished in ${(eventData.total_runtime_ms / 1000).toFixed(2)}s.`
            ]);
            loadInvestigations();
            if (eventData.investigation_id) {
              loadActiveCaseData(eventData.investigation_id);
            }
          }
        },
        (err) => {
          console.error('Triage stream error:', err);
          setAgentState((prev) => ({ ...prev, isStreaming: false }));
        },
        () => {
          setAgentState((prev) => ({ ...prev, isStreaming: false }));
        }
      );
    } catch (err) {
      console.error('Failed to trigger autonomous triage:', err);
      setAgentState((prev) => ({ ...prev, isStreaming: false }));
    }
  };

  // Trigger OSINT Recon Scan
  const handleTriggerScan = async () => {
    if (!activeCaseId || isScanning) return;
    setIsScanning(true);
    const activeInv = investigations.find((i) => i.id === activeCaseId);
    const targetName = activeInv ? activeInv.target : 'Target';

    setScanLogs([
      `[${new Date().toLocaleTimeString()}] Initiating OSINT Scan for ${targetName}...`,
      `[${new Date().toLocaleTimeString()}] Layer 1 Collector: Querying DNS A, MX, NS records...`
    ]);

    setTimeout(() => {
      setScanLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Layer 2 Collector: Scraping SSL certificates & WHOIS registrar...`,
        `[${new Date().toLocaleTimeString()}] Layer 3 Collector: Querying IP Geolocation & ASN infrastructure...`
      ]);
    }, 1200);

    setTimeout(() => {
      setScanLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Layer 4 Collector: Checking HaveIBeenPwned breach threat intelligence...`,
        `[${new Date().toLocaleTimeString()}] Smart Fallback Social Cascade: Verifying social footprints...`
      ]);
    }, 2500);

    try {
      await api.runScan(activeCaseId);
      if (activeCaseId) await loadActiveCaseData(activeCaseId);
      setScanLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] COMPLETE: OSINT Scan finished successfully. Graph updated!`
      ]);
    } catch (err) {
      console.error('Scan execution error:', err);
      setScanLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: Scan execution encountered an issue.`
      ]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogout = () => {
    api.logoutUser();
    setCurrentUser(null);
    setActiveCaseId(null);
    setInvestigations([]);
    setEntities([]);
    setRelationships([]);
    setNotes([]);
    setGraphNodes([]);
    setGraphEdges([]);
  };

  // Loading Splash Screen
  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen bg-[#07080f] flex flex-col items-center justify-center space-y-3 font-mono text-zinc-400">
        <div className="w-10 h-10 rounded-md bg-[#121214] border border-[#27272a] flex items-center justify-center text-sky-400 shadow-lg">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          <span>Verifying AEGIS-I4C Session Security...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated: Render Obsidian Dark AuthScreen
  if (!currentUser) {
    return <AuthScreen onAuthenticated={(user) => setCurrentUser(user)} />;
  }

  const activeCase = investigations.find((i) => i.id === activeCaseId) || null;
  const selectedEntity = entities.find((e) => e.id === selectedNodeId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07080f] select-none font-sans text-zinc-100">
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentNav}
        onSelectNav={setCurrentNav}
        investigations={investigations}
        activeId={activeCaseId}
        onSelectCase={setActiveCaseId}
        onNewCaseModal={() => setIsNewCaseModalOpen(true)}
        onDeleteCase={handleDeleteCase}
        selectedEntityFilters={selectedEntityFilters}
        onToggleFilter={handleToggleFilter}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        isScanning={isScanning || agentState.isStreaming}
        scanLogs={scanLogs}
      />

      {/* Main View Area */}
      {currentNav === 'workspace' && (
        <GraphCanvas
          activeCase={activeCase}
          initialNodes={graphNodes}
          initialEdges={graphEdges}
          selectedNodeId={selectedNodeId}
          onSelectNode={(id) => {
            setSelectedNodeId(id);
            if (id) setIsInspectorOpen(true);
          }}
          onOpenNewEntityModal={() => setIsNewEntityModalOpen(true)}
          onOpenComplaintModal={() => setIsComplaintModalOpen(true)}
          selectedEntityFilters={selectedEntityFilters}
          isScanning={isScanning}
          onTriggerScan={handleTriggerScan}
          onToggleAIChat={() => setIsAIChatOpen(!isAIChatOpen)}
          isAIChatOpen={isAIChatOpen}
          onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
          isInspectorOpen={isInspectorOpen}
          agentState={agentState}
        />
      )}

      {currentNav === 'timeline' && <TimelineView activeCase={activeCase} />}

      {currentNav === 'snapshots' && <SnapshotDiffView activeCase={activeCase} />}

      {/* Right Drawer 1: Collapsible AI Assistant Chat Panel */}
      {currentNav === 'workspace' && activeCaseId && (
        <AIChatPanel
          activeCase={activeCase}
          isOpen={isAIChatOpen}
          onToggleCollapse={() => setIsAIChatOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Right Drawer 2: Inspector, Relationship Creator & Notes */}
      {currentNav === 'workspace' && activeCaseId && isInspectorOpen && (
        <InspectorDrawer
          selectedEntity={selectedEntity}
          allEntities={entities}
          relationships={relationships}
          activeCase={activeCase}
          onClose={() => {
            setSelectedNodeId(null);
            setIsInspectorOpen(false);
          }}
          onDeleteEntity={handleDeleteEntity}
          onCreateRelationship={handleCreateRelationship}
          onDeleteRelationship={handleDeleteRelationship}
          notes={notes}
          onCreateNote={handleCreateNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
        />
      )}

      {/* Modals */}
      <ComplaintIntakeModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        onRunTriage={handleRunAutonomousTriage}
        isStreaming={agentState.isStreaming}
      />
      <NewCaseModal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        onSubmit={handleCreateCase}
      />
      <NewEntityModal
        isOpen={isNewEntityModalOpen}
        onClose={() => setIsNewEntityModalOpen(false)}
        onSubmit={handleCreateEntity}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
        onLogout={handleLogout}
      />
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}

export default App;
