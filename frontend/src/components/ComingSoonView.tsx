import React from 'react';
import { Clock, ShieldAlert, Sparkles, Network, GitCompare, Cpu } from 'lucide-react';

interface ComingSoonViewProps {
  title: string;
  phase: string;
  description: string;
  features: string[];
  icon: 'timeline' | 'snapshots' | 'collectors' | 'ai';
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({
  title,
  phase,
  description,
  features,
  icon
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'timeline':
        return Clock;
      case 'snapshots':
        return GitCompare;
      case 'collectors':
        return Network;
      case 'ai':
        return Cpu;
      default:
        return Sparkles;
    }
  };

  const IconComponent = getIcon();

  return (
    <div className="flex-1 h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-8 text-center select-none overflow-y-auto">
      <div className="max-w-lg space-y-6">
        {/* Animated Icon Badge */}
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-2xl bg-sky-950/60 border border-sky-500/40 flex items-center justify-center text-sky-400 mx-auto shadow-2xl shadow-sky-500/10 backdrop-blur-md">
            <IconComponent className="w-10 h-10 animate-pulse" />
          </div>
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-lg border border-amber-300">
            {phase}
          </span>
        </div>

        {/* Header Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-wide">{title}</h2>
          <p className="text-xs text-sky-400 font-mono uppercase tracking-widest">
            FEATURE COMING SOON
          </p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>

        {/* Upcoming Roadmap Card */}
        <div className="bg-[#0d1322] border border-[#1f293d] rounded-xl p-4 text-left space-y-3 shadow-xl">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Planned Capabilities
          </span>
          <ul className="space-y-2 text-xs text-slate-300">
            {features.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-400">
                <span className="text-sky-400 font-bold">•</span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Phase Indicator Footer */}
        <div className="inline-flex items-center gap-2 text-[11px] text-slate-500 font-mono bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
          Currently active: <span className="text-emerald-400 font-semibold">Phase 1 Workspace</span>
        </div>
      </div>
    </div>
  );
};
