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
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import type { Investigation, EntityType } from '../types';
import { useTheme } from '../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();
  const [consoleSectionOpen, setConsoleSectionOpen] = useState(true);
  const [filterSectionOpen, setFilterSectionOpen] = useState(true);

  const defaultConsoleLogs = [
    "[16:10:00] TRACE Engine Ready: Knowledge Graph initialized.",
    "[16:10:01] Select or create a case to begin automated reconnaissance.",
    "[16:10:02] Click '+ Launch OSINT Scan' to start analysis."
  ];

  const logsToDisplay = scanLogs.length > 0 ? scanLogs : defaultConsoleLogs;

  return (
    <div className="flex h-screen select-none shrink-0 border-r border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] bg-[#09090b] dark:bg-[#09090b] light:bg-[#ffffff] z-20 font-sans transition-colors duration-200">
      {/* Leftmost Slim Navigation Icon Strip */}
      <aside className="w-14 bg-[#09090b] dark:bg-[#09090b] light:bg-[#ffffff] border-r border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] flex flex-col items-center justify-between py-3.5 transition-colors duration-200">
        <div className="space-y-6 flex flex-col items-center">
          {/* Logo Badge matching target design */}
          <div className="w-9 h-9 rounded-sm border border-stone-200 dark:border-stone-200 light:border-slate-300 bg-white dark:bg-white light:bg-slate-900 flex items-center justify-center text-black dark:text-black light:text-white shadow-sm cursor-pointer">
            <ShieldAlert className="w-5 h-5" />
          </div>

          {/* Navigation Icons (1st: Workspace, 2nd: Timeline, 3rd: Snapshots) */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => onSelectNav('workspace')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'workspace'
                  ? 'bg-white dark:bg-white light:bg-slate-900 text-black dark:text-black light:text-white font-bold shadow-sm'
                  : 'text-zinc-400 dark:text-zinc-400 light:text-slate-500 hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-100 hover:text-white dark:hover:text-white light:hover:text-slate-900'
              }`}
              title="Workspace Graph"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectNav('timeline')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'timeline'
                  ? 'bg-white dark:bg-white light:bg-slate-900 text-black dark:text-black light:text-white font-bold shadow-sm'
                  : 'text-zinc-400 dark:text-zinc-400 light:text-slate-500 hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-100 hover:text-white dark:hover:text-white light:hover:text-slate-900'
              }`}
              title="Investigation Timeline"
            >
              <Clock className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectNav('snapshots')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'snapshots'
                  ? 'bg-white dark:bg-white light:bg-slate-900 text-black dark:text-black light:text-white font-bold shadow-sm'
                  : 'text-zinc-400 dark:text-zinc-400 light:text-slate-500 hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-100 hover:text-white dark:hover:text-white light:hover:text-slate-900'
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
            onClick={toggleTheme}
            className="w-9 h-9 rounded-sm flex items-center justify-center text-zinc-400 dark:text-zinc-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-100 transition cursor-pointer"
            title={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-sm flex items-center justify-center text-zinc-400 dark:text-zinc-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-100 transition cursor-pointer"
            title="Settings & User Account"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenHelp}
            className="w-9 h-9 rounded-sm flex items-center justify-center text-zinc-400 dark:text-zinc-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-100 transition cursor-pointer"
            title="TRACE User Manual & Guide (?)"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-sm flex items-center justify-center text-zinc-400 dark:text-zinc-400 light:text-slate-600 hover:text-rose-400 hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-100 transition cursor-pointer"
            title="Account & Security"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Secondary Sidebar Panel matching target screenshot */}
      <aside className="w-64 bg-[#09090b] dark:bg-[#09090b] light:bg-[#ffffff] flex flex-col h-screen overflow-hidden border-r border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] transition-colors duration-200">
        {/* Section Header: Case Management */}
        <div className="p-3 border-b border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] flex items-center justify-between bg-[#0d0e14] dark:bg-[#0d0e14] light:bg-[#f8fafc]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white dark:text-white light:text-slate-900 font-sans">
                Case Management
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-500 light:text-slate-400 font-mono ml-2">
                (256px)
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400 light:text-slate-500 font-mono">
                ACTIVE CASES ({investigations.length})
              </span>
            </div>
          </div>
          <button
            onClick={onNewCaseModal}
            className="text-black dark:text-black light:text-slate-900 bg-white dark:bg-white light:bg-white hover:bg-stone-100 dark:hover:bg-stone-100 light:hover:bg-slate-100 p-1 transition rounded-sm cursor-pointer shadow-sm border border-stone-200 dark:border-stone-200 light:border-slate-300 flex items-center gap-1 text-[10px] font-bold font-mono px-1.5"
            title="Create target investigation"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>[+ Create Case]</span>
          </button>
        </div>

        {/* Active Cases Scrollable List */}
        <div className="p-2 space-y-2 flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {investigations.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-500 light:text-slate-400 text-xs font-mono">
              No active cases.<br />Click "[+ Create Case]" to add one.
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
                  className={`group p-3 rounded-sm cursor-pointer transition-all border relative ${
                    isActive && currentView === 'workspace'
                      ? 'bg-[#18181b] dark:bg-[#18181b] light:bg-white border-white dark:border-white light:border-slate-900 text-white dark:text-white light:text-slate-900 shadow-sm ring-1 ring-white/20 dark:ring-white/20 light:ring-slate-900/20'
                      : 'bg-[#121214] dark:bg-[#121214] light:bg-[#f8fafc] border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] text-zinc-400 dark:text-zinc-400 light:text-slate-700 hover:bg-[#18181b]/70 dark:hover:bg-[#18181b]/70 light:hover:bg-slate-100 hover:text-white dark:hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-xs font-bold truncate text-white dark:text-white light:text-slate-900 font-mono flex-1">
                      Case: {inv.title}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {hasAlert && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-300 dark:text-zinc-300 light:text-slate-600 truncate mt-1 font-mono">
                    Target: <span className="text-white dark:text-white light:text-slate-900 font-semibold">{inv.target}</span>
                  </p>

                  <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-zinc-800 dark:bg-zinc-800 light:bg-slate-200 text-zinc-200 dark:text-zinc-200 light:text-slate-800">
                      Node Count: {inv.entity_count}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-zinc-800 dark:bg-zinc-800 light:bg-slate-200 text-zinc-300 dark:text-zinc-300 light:text-slate-700">
                      Type: {inv.type || 'FINANCIAL_FRAUD'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#27272a] dark:border-[#27272a] light:border-slate-200 text-[9px] text-zinc-400 dark:text-zinc-400 light:text-slate-500 font-mono">
                    <span>{inv.relationship_count} edges</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete investigation "${inv.title}"?`)) {
                          onDeleteCase(inv.id);
                        }
                      }}
                      className="opacity-70 group-hover:opacity-100 text-zinc-400 dark:text-zinc-400 light:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded-sm transition cursor-pointer"
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
        <div className="border-t border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] bg-[#09090b] dark:bg-[#09090b] light:bg-[#ffffff]">
          <button
            onClick={() => setConsoleSectionOpen(!consoleSectionOpen)}
            className="w-full p-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400 light:text-slate-600 font-mono hover:text-white dark:hover:text-white light:hover:text-slate-900 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>Live Scraper Console</span>
              {isScanning ? (
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${consoleSectionOpen ? '' : '-rotate-90'}`} />
          </button>

          {consoleSectionOpen && (
            <div className="px-3 pb-3">
              <div className="bg-[#07080f] dark:bg-[#07080f] light:bg-[#f8fafc] border border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] rounded-sm p-2.5 h-28 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin">
                {logsToDisplay.map((log, index) => (
                  <div key={index} className="leading-relaxed flex items-start gap-1.5">
                    <span className="text-zinc-500 dark:text-zinc-500 light:text-slate-400 shrink-0">&gt;</span>
                    <span className={log.includes('COMPLETE') || log.includes('SUCCESS') ? 'text-emerald-400 dark:text-emerald-400 light:text-emerald-600 font-semibold' : log.includes('Scanning') || log.includes('Collector') ? 'text-sky-400 dark:text-sky-400 light:text-sky-600' : 'text-zinc-300 dark:text-zinc-300 light:text-slate-800'}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section Header: FILTERS */}
        <div className="border-t border-[#27272a] dark:border-[#27272a] light:border-[#e2e8f0] bg-[#09090b] dark:bg-[#09090b] light:bg-[#ffffff]">
          <button
            onClick={() => setFilterSectionOpen(!filterSectionOpen)}
            className="w-full p-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400 light:text-slate-600 font-mono hover:text-white dark:hover:text-white light:hover:text-slate-900 transition cursor-pointer"
          >
            <span>FILTERS</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filterSectionOpen ? '' : '-rotate-90'}`} />
          </button>

          {filterSectionOpen && (
            <div className="px-3 pb-3 space-y-2 max-h-44 overflow-y-auto scrollbar-thin">
              {ALL_ENTITY_TYPES.map(({ type, label, icon: Icon }) => {
                const isSelected = selectedEntityFilters.length === 0 || selectedEntityFilters.includes(type);
                return (
                  <div
                    key={type}
                    onClick={() => onToggleFilter(type)}
                    className="flex items-center justify-between text-xs text-zinc-300 dark:text-zinc-300 light:text-slate-700 cursor-pointer py-1 px-1.5 rounded-sm hover:bg-[#18181b] dark:hover:bg-[#18181b] light:hover:bg-slate-100 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400 light:text-slate-500" />
                      <span className="text-xs font-medium text-zinc-200 dark:text-zinc-200 light:text-slate-800">{label}</span>
                    </span>

                    <div
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                        isSelected ? 'bg-sky-500' : 'bg-[#27272a] dark:bg-[#27272a] light:bg-slate-300'
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
