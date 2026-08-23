import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Globe, 
  Server, 
  Mail, 
  User, 
  Building2, 
  ShieldCheck, 
  LayoutGrid,
  Clock,
  GitCompare,
  Settings,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  LogOut
} from 'lucide-react';
import type { Investigation, EntityType } from '../types';

export type NavView = 'workspace' | 'timeline' | 'snapshots';

interface SidebarProps {
  currentView: NavView;
  onSelectNav: (view: NavView) => void;
  investigations: Investigation[];
  activeId: string | null;
  onSelectCase: (id: string) => void;
  onNewCaseModal: () => void;
  onDeleteCase: (id: string) => void;
  selectedEntityFilters: EntityType[];
  onToggleFilter: (type: EntityType) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  isScanning?: boolean;
  scanLogs?: string[];
}

const ALL_ENTITY_TYPES: { type: EntityType; label: string; icon: any }[] = [
  { type: 'DOMAIN', label: 'Domains', icon: Globe },
  { type: 'IP ADDRESS', label: 'IPs', icon: Server },
  { type: 'ORGANIZATION', label: 'Organizations', icon: Building2 },
  { type: 'PERSON', label: 'Persons', icon: User },
  { type: 'CERTIFICATE', label: 'Certificates', icon: ShieldCheck },
  { type: 'EMAIL', label: 'Emails', icon: Mail },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectNav,
  investigations,
  activeId,
  onSelectCase,
  onNewCaseModal,
  onDeleteCase,
  selectedEntityFilters,
  onToggleFilter,
  onOpenSettings,
  onOpenHelp,
  isScanning = false,
  scanLogs = []
}) => {
  const [consoleSectionOpen, setConsoleSectionOpen] = useState(true);
  const [filterSectionOpen, setFilterSectionOpen] = useState(true);

  const defaultConsoleLogs = [
    "[16:10:00] TRACE Engine Ready: Knowledge Graph initialized.",
    "[16:10:01] Select or create a case to begin automated reconnaissance.",
    "[16:10:02] Click '+ Launch OSINT Scan' to start analysis."
  ];

  const logsToDisplay = scanLogs.length > 0 ? scanLogs : defaultConsoleLogs;

  return (
    <div className="flex h-screen select-none shrink-0 border-r border-[#27272a] bg-[#09090b] z-20 font-sans">
      {/* Leftmost Slim Navigation Icon Strip (Obsidian Dark) */}
      <aside className="w-14 bg-[#09090b] border-r border-[#27272a] flex flex-col items-center justify-between py-3.5">
        <div className="space-y-6 flex flex-col items-center">
          {/* Logo Badge matching target design */}
          <div className="w-9 h-9 rounded-md border border-[#27272a] bg-[#121214] flex items-center justify-center text-zinc-100 shadow-sm cursor-pointer">
            <ShieldAlert className="w-5 h-5" />
          </div>

          {/* Navigation Icons (1st: Workspace, 2nd: Timeline, 3rd: Snapshots) */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => onSelectNav('workspace')}
              className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'workspace'
                  ? 'bg-[#27272a] text-white border border-[#3f3f46] shadow-sm'
                  : 'text-zinc-400 hover:bg-[#18181b] hover:text-zinc-200'
              }`}
              title="Workspace Graph"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectNav('timeline')}
              className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'timeline'
                  ? 'bg-[#27272a] text-white border border-[#3f3f46] shadow-sm'
                  : 'text-zinc-400 hover:bg-[#18181b] hover:text-zinc-200'
              }`}
              title="Investigation Timeline"
            >
              <Clock className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectNav('snapshots')}
              className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'snapshots'
                  ? 'bg-[#27272a] text-white border border-[#3f3f46] shadow-sm'
                  : 'text-zinc-400 hover:bg-[#18181b] hover:text-zinc-200'
              }`}
              title="Snapshots & Diff"
            >
              <GitCompare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Utility Icons */}
        <div className="space-y-2">
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            title="Settings & User Account"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenHelp}
            className="w-9 h-9 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            title="TRACE User Manual & Guide (?)"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-md flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-[#18181b] transition cursor-pointer"
            title="Account & Security"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Secondary Sidebar Panel matching target screenshot */}
      <aside className="w-64 bg-[#09090b] flex flex-col h-screen overflow-hidden">
        {/* Section Header: ACTIVE CASES */}
        <div className="p-3.5 border-b border-[#27272a] flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
            ACTIVE CASES
          </span>
          <button
            onClick={onNewCaseModal}
            className="text-zinc-400 hover:text-white p-1 transition rounded-md hover:bg-[#18181b] cursor-pointer"
            title="Create new case"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Cases Scrollable List */}
        <div className="p-3 space-y-2.5 flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {investigations.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs font-mono">
              No active cases.<br />Click "+" to add one.
            </div>
          ) : (
            investigations.map((inv, idx) => {
              const isActive = inv.id === activeId;
              const hasAlert = idx % 2 === 0;

              return (
                <div
                  key={inv.id}
                  onClick={() => {
                    onSelectCase(inv.id);
                    onSelectNav('workspace');
                  }}
                  className={`group p-3 rounded-lg cursor-pointer transition-all border relative ${
                    isActive && currentView === 'workspace'
                      ? 'bg-[#18181b] border-[#3f3f46] text-white shadow-sm'
                      : 'bg-[#121214] border-[#27272a] text-zinc-400 hover:bg-[#18181b]/70 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold truncate pr-2 text-white font-mono">{inv.title}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasAlert && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 truncate mt-1 font-mono">
                    Target: <span className="text-zinc-200">{inv.target}</span>
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#27272a] text-[9px] text-zinc-500 font-mono">
                    <span>{inv.entity_count} nodes • {inv.relationship_count} edges</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCase(inv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-400 p-0.5 transition cursor-pointer"
                      title="Delete case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Section Header: LIVE SCRAPER CONSOLE */}
        <div className="border-t border-[#27272a] bg-[#09090b]">
          <button
            onClick={() => setConsoleSectionOpen(!consoleSectionOpen)}
            className="w-full p-3 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono hover:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>LIVE SCRAPER CONSOLE</span>
              {isScanning ? (
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${consoleSectionOpen ? '' : '-rotate-90'}`} />
          </button>

          {consoleSectionOpen && (
            <div className="px-3 pb-3">
              <div className="bg-[#07080f] border border-[#27272a] rounded-md p-2.5 h-28 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin">
                {logsToDisplay.map((log, index) => (
                  <div key={index} className="leading-relaxed flex items-start gap-1.5">
                    <span className="text-zinc-500 shrink-0">&gt;</span>
                    <span className={log.includes('COMPLETE') || log.includes('SUCCESS') ? 'text-emerald-400' : log.includes('Scanning') || log.includes('Collector') ? 'text-sky-400' : 'text-zinc-300'}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section Header: FILTERS */}
        <div className="border-t border-[#27272a] bg-[#09090b]">
          <button
            onClick={() => setFilterSectionOpen(!filterSectionOpen)}
            className="w-full p-3 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono hover:text-white transition cursor-pointer"
          >
            <span>FILTERS</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filterSectionOpen ? '' : '-rotate-90'}`} />
          </button>

          {filterSectionOpen && (
            <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {ALL_ENTITY_TYPES.map(({ type, label, icon: Icon }) => {
                const isSelected = selectedEntityFilters.length === 0 || selectedEntityFilters.includes(type);
                return (
                  <div
                    key={type}
                    onClick={() => onToggleFilter(type)}
                    className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer py-0.5 px-1 rounded-md hover:bg-[#18181b] transition"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-200">{label}</span>
                    </span>

                    <div
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                        isSelected ? 'bg-sky-500' : 'bg-[#27272a]'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white transition-transform ${
                          isSelected ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
