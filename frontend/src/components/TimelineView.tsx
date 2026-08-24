import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  ShieldCheck,
  Radio,
  FileText,
  Camera,
  Globe,
  Server,
  RefreshCw,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import type { TimelineEvent, Investigation } from '../types';
import * as api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface TimelineViewProps {
  activeCase: Investigation | null;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ activeCase }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadTimeline = async () => {
    if (!activeCase) return;
    setLoading(true);
    try {
      const data = await api.fetchTimeline(activeCase.id);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [activeCase?.id]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Filter by type
      if (selectedFilter !== 'ALL' && ev.event_type !== selectedFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          ev.source.toLowerCase().includes(q) ||
          (ev.entity_value && ev.entity_value.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [events, selectedFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: events.length,
      discoveries: events.filter((e) => e.event_type === 'DISCOVERY').length,
      dns: events.filter((e) => e.event_type === 'DNS').length,
      certs: events.filter((e) => e.event_type === 'CERTIFICATE').length,
      snapshots: events.filter((e) => e.event_type === 'SNAPSHOT').length,
      notes: events.filter((e) => e.event_type === 'NOTE').length
    };
  }, [events]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CASE_START':
        return <Radio className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />;
      case 'DISCOVERY':
        return <Globe className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />;
      case 'DNS':
        return <Server className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />;
      case 'CERTIFICATE':
        return <ShieldCheck className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />;
      case 'IP_SHIFT':
        return <Server className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />;
      case 'SNAPSHOT':
        return <Camera className={`w-4 h-4 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />;
      case 'NOTE':
        return <FileText className={`w-4 h-4 ${isLight ? 'text-pink-600' : 'text-pink-400'}`} />;
      default:
        return <Clock className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`} />;
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'CASE_START':
        return isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30';
      case 'DISCOVERY':
        return isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-sky-950/40 text-sky-300 border-sky-500/30';
      case 'DNS':
        return isLight ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30';
      case 'CERTIFICATE':
        return isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950/40 text-amber-300 border-amber-500/30';
      case 'IP_SHIFT':
        return isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30';
      case 'SNAPSHOT':
        return isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-950/40 text-purple-300 border-purple-500/30';
      case 'NOTE':
        return isLight ? 'bg-pink-100 text-pink-800 border-pink-300' : 'bg-pink-950/40 text-pink-300 border-pink-500/30';
      default:
        return isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#18181b] text-zinc-300 border-[#27272a]';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    } catch {
      return dateStr;
    }
  };

  if (!activeCase) {
    return (
      <div className={`flex-1 h-screen flex items-center justify-center font-sans ${
        isLight ? 'bg-slate-50 text-slate-500' : 'bg-[#07080f] text-zinc-400'
      }`}>
        <p className="text-sm font-mono">Select an active investigation case to view its chronological timeline.</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 h-screen flex flex-col overflow-hidden font-sans ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#07080f] text-zinc-100'
    }`}>
      {/* Top Header Bar */}
      <div className={`p-4 px-8 flex items-center justify-between z-10 shadow-sm border-b ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#09090b] border-[#27272a]'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-sm border flex items-center justify-center ${
            isLight ? 'bg-[#f8fafc] border-slate-300 text-purple-600' : 'bg-[#121214] border-[#27272a] text-purple-400'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Investigation Timeline
              <span className={`text-[10px] px-2 py-0.5 rounded-sm font-mono border ${
                isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-950/50 text-purple-300 border-purple-500/30'
              }`}>
                Phase 3 Live
              </span>
            </h1>
            <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Target: <span className={`font-semibold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>{activeCase.target}</span> • {stats.total} total intelligence events
            </p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
          <div className={`px-3 py-1.5 rounded-sm flex items-center gap-2 border ${
            isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
          }`}>
            <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>Discoveries:</span>
            <span className={`font-bold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>{stats.discoveries}</span>
          </div>
          <div className={`px-3 py-1.5 rounded-sm flex items-center gap-2 border ${
            isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
          }`}>
            <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>DNS/Certs:</span>
            <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{stats.dns + stats.certs}</span>
          </div>
          <div className={`px-3 py-1.5 rounded-sm flex items-center gap-2 border ${
            isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
          }`}>
            <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>Snapshots:</span>
            <span className={`font-bold ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>{stats.snapshots}</span>
          </div>

          <button
            onClick={loadTimeline}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition shadow-sm cursor-pointer text-xs border ${
              isLight
                ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-[#121214] hover:bg-[#18181b] border-[#27272a] text-zinc-200'
            }`}
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''} ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-3 px-8 flex items-center justify-between gap-4 border-b ${
        isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#09090b] border-[#27272a]'
      }`}>
        {/* Event Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className={`text-[10px] font-bold uppercase tracking-wider mr-2 flex items-center gap-1 font-mono ${
            isLight ? 'text-slate-500' : 'text-zinc-400'
          }`}>
            <Filter className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} /> Filter:
          </span>

          {['ALL', 'CASE_START', 'DISCOVERY', 'DNS', 'CERTIFICATE', 'IP_SHIFT', 'SNAPSHOT', 'NOTE'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setSelectedFilter(filterType)}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold font-mono transition cursor-pointer border ${
                selectedFilter === filterType
                  ? isLight
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-black border-stone-200 shadow-sm'
                  : isLight
                    ? 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                    : 'bg-[#121214] text-zinc-400 hover:text-white border-[#27272a]'
              }`}
            >
              {filterType.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative shrink-0 w-64">
          <Search className={`w-4 h-4 absolute left-3 top-2.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
          <input
            type="text"
            placeholder="Search timeline events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs rounded-sm pl-9 pr-3 py-1.5 focus:outline-none border ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                : 'bg-[#121214] border-[#27272a] text-zinc-100 focus:border-white'
            }`}
          />
        </div>
      </div>

      {/* Chronological Event Stream */}
      <div className="flex-1 overflow-y-auto p-6 px-12 space-y-6 scrollbar-thin">
        {loading ? (
          <div className={`text-center py-16 text-xs font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
            Loading chronological event stream...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className={`text-center py-16 text-xs font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
            No intelligence events match the selected criteria.
          </div>
        ) : (
          <div className={`relative ml-4 pl-6 space-y-6 border-l ${isLight ? 'border-slate-300' : 'border-[#27272a]'}`}>
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="relative group">
                {/* Event Node Marker */}
                <div className={`absolute -left-[31px] top-2 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shadow-sm ${
                  isLight ? 'bg-white border-sky-600' : 'bg-[#09090b] border-sky-400'
                }`}>
                  <div className={`w-1 h-1 rounded-full ${isLight ? 'bg-sky-600' : 'bg-white'}`} />
                </div>

                {/* Event Card */}
                <div className={`p-4 rounded-sm space-y-2 transition-all border shadow-sm ${
                  isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                    : 'bg-[#121214] border-[#27272a] hover:border-[#3f3f46] text-zinc-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-sm border ${
                        isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
                      }`}>
                        {getEventIcon(ev.event_type)}
                      </div>
                      <h3 className={`font-semibold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{ev.title}</h3>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm border ${getEventBadgeColor(ev.event_type)}`}>
                        {ev.event_type}
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      <Calendar className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                      {formatDate(ev.created_at)}
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed font-sans ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>{ev.description}</p>

                  <div className={`flex items-center justify-between pt-2 border-t text-[10px] font-mono ${
                    isLight ? 'border-slate-200 text-slate-500' : 'border-[#27272a] text-zinc-500'
                  }`}>
                    <span>Source: <strong className={isLight ? 'text-slate-800' : 'text-zinc-300'}>{ev.source}</strong></span>
                    {ev.entity_value && (
                      <span>Associated Node: <strong className={isLight ? 'text-sky-700' : 'text-sky-400'}>{ev.entity_value}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
