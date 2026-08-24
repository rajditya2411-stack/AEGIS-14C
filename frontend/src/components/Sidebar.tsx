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
          <div className="w-9 h-9 rounded-sm border border-stone-200 bg-white flex items-center justify-center text-black shadow-sm cursor-pointer">
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>

          {/* Navigation Icons (1st: Workspace, 2nd: Timeline, 3rd: Snapshots) */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => onSelectNav('workspace')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'workspace'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:bg-[#18181b] hover:text-white'
              }`}
              title="Workspace Graph"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectNav('timeline')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'timeline'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:bg-[#18181b] hover:text-white'
              }`}
              title="Investigation Timeline"
            >
              <Clock className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectNav('snapshots')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'snapshots'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:bg-[#18181b] hover:text-white'
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
            className="w-9 h-9 rounded-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            title="Settings & User Account"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenHelp}
            className="w-9 h-9 rounded-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            title="TRACE User Manual & Guide (?)"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-sm flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-[#18181b] transition cursor-pointer"
            title="Account & Security"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Secondary Sidebar Panel matching target screenshot */}
      <aside className="w-64 bg-[#09090b] flex flex-col h-screen overflow-hidden">
        {/* Section Header: ACTIVE CASES */}
        <div className="p-3 border-b border-[#27272a] flex items-center justify-between bg-[#0d0e14]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-white font-mono">
              ACTIVE CASES
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-sm bg-white text-black font-bold">
              {investigations.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewCaseModal}
              className="text-black bg-white hover:bg-stone-100 p-1 transition rounded-sm cursor-pointer shadow-sm"
              title="Create target investigation"
            >
              <Plus className="w-3.5 h-3.5 font-bold stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Active Cases Scrollable List */}
        <div className="p-2 space-y-1.5 flex-1 overflow-y-auto min-h-0 scrollbar-thin">
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
                  className={`group p-2.5 rounded-sm cursor-pointer transition-all border relative ${
                    isActive && currentView === 'workspace'
                      ? 'bg-[#18181b] border-white/60 text-white shadow-sm ring-1 ring-white/20'
                      : 'bg-[#121214] border-[#27272a] text-zinc-400 hover:bg-[#18181b]/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-xs font-bold truncate text-white font-mono flex-1">{inv.title}</h3>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {hasAlert && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-300 truncate mt-1 font-mono">
                    Target: <span className="text-white font-semibold">{inv.target}</span>
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#27272a] text-[9px] text-zinc-400 font-mono">
                    <span>{inv.entity_count} nodes • {inv.relationship_count} edges</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete investigation "${inv.title}"?`)) {
                          onDeleteCase(inv.id);
                        }
                      }}
                      className="opacity-70 group-hover:opacity-100 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded-sm transition cursor-pointer"
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
