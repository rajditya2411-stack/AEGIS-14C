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
  Moon,
  DollarSign
} from 'lucide-react';
import type { Investigation, EntityType } from '../types';
import { useTheme } from '../context/ThemeContext';

export type NavView = 'workspace' | 'mule-ledger' | 'timeline' | 'snapshots';

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
  const isLight = theme === 'light';
  const [consoleSectionOpen, setConsoleSectionOpen] = useState(true);
  const [filterSectionOpen, setFilterSectionOpen] = useState(true);

  const defaultConsoleLogs = [
    "[16:10:00] TRACE Engine Ready: Knowledge Graph initialized.",
    "[16:10:01] Select or create a case to begin automated reconnaissance.",
    "[16:10:02] Click '+ Launch OSINT Scan' to start analysis."
  ];

  const logsToDisplay = scanLogs.length > 0 ? scanLogs : defaultConsoleLogs;

  return (
    <div className={`flex h-screen select-none shrink-0 border-r z-20 font-sans transition-colors duration-200 ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09090b] border-[#27272a] text-zinc-100'
    }`}>
      {/* Leftmost Slim Navigation Icon Strip */}
      <aside className={`w-14 border-r flex flex-col items-center justify-between py-3.5 transition-colors duration-200 ${
        isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#09090b] border-[#27272a]'
      }`}>
        <div className="space-y-6 flex flex-col items-center">
          {/* Logo Badge matching target design */}
          <div className={`w-9 h-9 rounded-sm border flex items-center justify-center shadow-sm cursor-pointer ${
            isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-stone-200 bg-white text-black'
          }`}>
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>

          {/* Navigation Icons (1st: Workspace, 2nd: Timeline, 3rd: Snapshots) */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => onSelectNav('workspace')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'workspace'
                  ? isLight ? 'bg-slate-900 text-white font-bold shadow-sm' : 'bg-white text-black font-bold shadow-sm'
                  : isLight ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-zinc-400 hover:bg-[#18181b] hover:text-white'
              }`}
              title="Workspace Graph"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectNav('mule-ledger')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'mule-ledger'
                  ? isLight ? 'bg-rose-600 text-white font-bold shadow-sm' : 'bg-rose-500 text-white font-bold shadow-sm'
                  : isLight ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-zinc-400 hover:bg-[#18181b] hover:text-rose-400'
              }`}
              title="Multi-Hop Mule Ledger (Financial Forensics)"
            >
              <DollarSign className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectNav('timeline')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'timeline'
                  ? isLight ? 'bg-slate-900 text-white font-bold shadow-sm' : 'bg-white text-black font-bold shadow-sm'
                  : isLight ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-zinc-400 hover:bg-[#18181b] hover:text-white'
              }`}
              title="Investigation Timeline"
            >
              <Clock className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectNav('snapshots')}
              className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                currentView === 'snapshots'
                  ? isLight ? 'bg-slate-900 text-white font-bold shadow-sm' : 'bg-white text-black font-bold shadow-sm'
                  : isLight ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-zinc-400 hover:bg-[#18181b] hover:text-white'
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
            className={`w-9 h-9 rounded-sm flex items-center justify-center transition cursor-pointer ${
              isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-[#18181b]'
            }`}
            title={`Toggle ${isLight ? 'Dark' : 'Light'} Mode`}
          >
            {isLight ? <Moon className="w-4 h-4 text-sky-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
          <button
            onClick={onOpenSettings}
            className={`w-9 h-9 rounded-sm flex items-center justify-center transition cursor-pointer ${
              isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-[#18181b]'
            }`}
            title="Settings & User Account"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenHelp}
            className={`w-9 h-9 rounded-sm flex items-center justify-center transition cursor-pointer ${
              isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-[#18181b]'
            }`}
            title="TRACE User Manual & Guide (?)"
          >
            <HelpCircle className="w-4 h-4 text-sky-500" />
          </button>
          <button
            onClick={onOpenSettings}
            className={`w-9 h-9 rounded-sm flex items-center justify-center transition cursor-pointer ${
              isLight ? 'text-slate-600 hover:text-rose-600 hover:bg-slate-200' : 'text-zinc-400 hover:text-rose-400 hover:bg-[#18181b]'
            }`}
            title="Account & Security"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Secondary Sidebar Panel matching target screenshot */}
      <aside className={`w-64 flex flex-col h-screen overflow-hidden border-r transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#09090b] border-[#27272a]'
      }`}>
        {/* Section Header: Case Management */}
        <div className={`p-3 border-b flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#0d0e14] border-[#27272a]'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Case Management
              </span>
              <span className={`text-[10px] font-mono ml-2 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                (256px)
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-500' : 'text-zinc-400'
              }`}>
                ACTIVE CASES ({investigations.length})
              </span>
            </div>
          </div>
          <button
            onClick={onNewCaseModal}
            className={`p-1 transition rounded-sm cursor-pointer shadow-sm border flex items-center gap-1 text-[10px] font-bold font-mono px-1.5 ${
              isLight
                ? 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                : 'bg-white text-black hover:bg-stone-100 border-stone-200'
            }`}
            title="Create target investigation"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>[+ Create Case]</span>
          </button>
        </div>

        {/* Active Cases Scrollable List */}
        <div className="p-2 space-y-2 flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {investigations.length === 0 ? (
            <div className={`text-center py-8 text-xs font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
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
                      ? isLight
                        ? 'bg-white border-slate-900 text-slate-900 shadow-md ring-1 ring-slate-900/30'
                        : 'bg-[#18181b] border-white text-white shadow-sm ring-1 ring-white/20'
                      : isLight
                        ? 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        : 'bg-[#121214] border-[#27272a] text-zinc-400 hover:bg-[#18181b]/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <h3 className={`text-xs font-bold truncate font-mono flex-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Case: {inv.title}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {hasAlert && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                  </div>

                  <p className={`text-[11px] truncate mt-1 font-mono ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                    Target: <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{inv.target}</span>
                  </p>

                  <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                      isLight ? 'bg-slate-200 text-slate-800' : 'bg-zinc-800 text-zinc-200'
                    }`}>
                      Node Count: {inv.entity_count}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      Type: {inv.type || 'FINANCIAL_FRAUD'}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between mt-2 pt-1.5 border-t text-[9px] font-mono ${
                    isLight ? 'border-slate-200 text-slate-500' : 'border-[#27272a] text-zinc-400'
                  }`}>
                    <span>{inv.relationship_count} edges</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete investigation "${inv.title}"?`)) {
                          onDeleteCase(inv.id);
                        }
                      }}
                      className={`opacity-70 group-hover:opacity-100 p-1 rounded-sm transition cursor-pointer ${
                        isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                      }`}
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
        <div className={`border-t ${isLight ? 'border-slate-200 bg-white' : 'border-[#27272a] bg-[#09090b]'}`}>
          <button
            onClick={() => setConsoleSectionOpen(!consoleSectionOpen)}
            className={`w-full p-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider font-mono transition cursor-pointer ${
              isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>Live Scraper Console</span>
              {isScanning ? (
                <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${consoleSectionOpen ? '' : '-rotate-90'}`} />
          </button>

          {consoleSectionOpen && (
            <div className="px-3 pb-3">
              <div className={`border rounded-sm p-2.5 h-28 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#07080f] border-[#27272a]'
              }`}>
                {logsToDisplay.map((log, index) => (
                  <div key={index} className="leading-relaxed flex items-start gap-1.5">
                    <span className={`shrink-0 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>&gt;</span>
                    <span className={log.includes('COMPLETE') || log.includes('SUCCESS') ? (isLight ? 'text-emerald-600 font-semibold' : 'text-emerald-400 font-semibold') : log.includes('Scanning') || log.includes('Collector') ? (isLight ? 'text-sky-600' : 'text-sky-400') : (isLight ? 'text-slate-800' : 'text-zinc-300')}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section Header: FILTERS */}
        <div className={`border-t ${isLight ? 'border-slate-200 bg-white' : 'border-[#27272a] bg-[#09090b]'}`}>
          <button
            onClick={() => setFilterSectionOpen(!filterSectionOpen)}
            className={`w-full p-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider font-mono transition cursor-pointer ${
              isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
            }`}
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
                    className={`flex items-center justify-between text-xs cursor-pointer py-1 px-1.5 rounded-sm transition ${
                      isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-zinc-300 hover:bg-[#18181b]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`} />
                      <span className={`text-xs font-medium ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{label}</span>
                    </span>

                    <div
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                        isSelected ? 'bg-sky-500' : isLight ? 'bg-slate-300' : 'bg-[#27272a]'
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
