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

interface TimelineViewProps {
  activeCase: Investigation | null;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ activeCase }) => {
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
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case 'DISCOVERY':
        return <Globe className="w-4 h-4 text-sky-400" />;
      case 'DNS':
        return <Server className="w-4 h-4 text-cyan-400" />;
      case 'CERTIFICATE':
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case 'IP_SHIFT':
        return <Server className="w-4 h-4 text-emerald-400" />;
      case 'SNAPSHOT':
        return <Camera className="w-4 h-4 text-purple-400" />;
      case 'NOTE':
        return <FileText className="w-4 h-4 text-pink-400" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'CASE_START':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30';
      case 'DISCOVERY':
        return 'bg-sky-950/40 text-sky-300 border-sky-500/30';
      case 'DNS':
        return 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30';
      case 'CERTIFICATE':
        return 'bg-amber-950/40 text-amber-300 border-amber-500/30';
      case 'IP_SHIFT':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30';
      case 'SNAPSHOT':
        return 'bg-purple-950/40 text-purple-300 border-purple-500/30';
      case 'NOTE':
        return 'bg-pink-950/40 text-pink-300 border-pink-500/30';
      default:
        return 'bg-[#18181b] text-zinc-300 border-[#27272a]';
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
      <div className="flex-1 h-screen bg-[#07080f] flex items-center justify-center text-zinc-400 font-sans">
        <p className="text-sm font-mono">Select an active investigation case to view its chronological timeline.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen bg-[#07080f] text-zinc-100 flex flex-col overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="bg-[#09090b] border-b border-[#27272a] p-4 px-8 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-[#121214] border border-[#27272a] flex items-center justify-center text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Investigation Timeline
              <span className="text-[10px] bg-purple-950/50 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                Phase 3 Live
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Target: <span className="text-sky-400 font-semibold">{activeCase.target}</span> • {stats.total} total intelligence events
            </p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
          <div className="bg-[#121214] border border-[#27272a] px-3 py-1.5 rounded-md flex items-center gap-2">
            <span className="text-zinc-500">Discoveries:</span>
            <span className="text-sky-400 font-bold">{stats.discoveries}</span>
          </div>
          <div className="bg-[#121214] border border-[#27272a] px-3 py-1.5 rounded-md flex items-center gap-2">
            <span className="text-zinc-500">DNS/Certs:</span>
            <span className="text-emerald-400 font-bold">{stats.dns + stats.certs}</span>
          </div>
          <div className="bg-[#121214] border border-[#27272a] px-3 py-1.5 rounded-md flex items-center gap-2">
            <span className="text-zinc-500">Snapshots:</span>
            <span className="text-purple-400 font-bold">{stats.snapshots}</span>
          </div>

          <button
            onClick={loadTimeline}
            className="flex items-center gap-1.5 bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-zinc-200 px-3 py-1.5 rounded-md transition shadow-sm cursor-pointer text-xs"
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#09090b] border-b border-[#27272a] p-3 px-8 flex items-center justify-between gap-4">
        {/* Event Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mr-2 flex items-center gap-1 font-mono">
            <Filter className="w-3 h-3 text-zinc-500" /> Filter:
          </span>

          {['ALL', 'CASE_START', 'DISCOVERY', 'DNS', 'CERTIFICATE', 'IP_SHIFT', 'SNAPSHOT', 'NOTE'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setSelectedFilter(filterType)}
              className={`px-2.5 py-1 rounded text-xs font-semibold font-mono transition cursor-pointer ${
                selectedFilter === filterType
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-[#121214] text-zinc-400 hover:text-white border border-[#27272a]'
              }`}
            >
              {filterType.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative shrink-0 w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search timeline events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121214] border border-[#27272a] text-zinc-100 text-xs rounded-md pl-9 pr-3 py-1.5 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Chronological Event Stream */}
      <div className="flex-1 overflow-y-auto p-6 px-12 space-y-6 scrollbar-thin">
        {loading ? (
          <div className="text-center py-16 text-zinc-500 text-xs font-mono">
            Loading chronological event stream...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-xs font-mono">
            No intelligence events match the selected criteria.
          </div>
        ) : (
          <div className="relative border-l border-[#27272a] ml-4 pl-6 space-y-6">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="relative group">
                {/* Event Node Marker */}
                <div className="absolute -left-[31px] top-2 w-3.5 h-3.5 rounded-full bg-[#09090b] border-2 border-sky-400 flex items-center justify-center shadow-sm">
                  <div className="w-1 h-1 rounded-full bg-white" />
                </div>

                {/* Event Card matching Obsidian Design */}
                <div className="bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] p-4 rounded-lg space-y-2 transition-all shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-[#18181b] border border-[#27272a]">
                        {getEventIcon(ev.event_type)}
                      </div>
                      <h3 className="font-semibold text-sm text-white">{ev.title}</h3>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getEventBadgeColor(ev.event_type)}`}>
                        {ev.event_type}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {formatDate(ev.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{ev.description}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#27272a] text-[10px] font-mono text-zinc-500">
                    <span>Source: <strong className="text-zinc-300">{ev.source}</strong></span>
                    {ev.entity_value && (
                      <span>Associated Node: <strong className="text-sky-400">{ev.entity_value}</strong></span>
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
