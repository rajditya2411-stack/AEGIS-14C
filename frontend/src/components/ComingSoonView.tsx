import React from 'react';
import { Clock, ShieldAlert, Sparkles, Network, GitCompare, Cpu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  const isLight = theme === 'light';

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
    <div className={`flex-1 h-screen flex flex-col items-center justify-center p-8 text-center select-none overflow-y-auto font-sans transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0b0f19] text-slate-100'
    }`}>
      <div className="max-w-lg space-y-6">
        {/* Animated Icon Badge */}
        <div className="relative inline-block">
          <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center mx-auto shadow-xl backdrop-blur-md ${
            isLight
              ? 'bg-white border-slate-300 text-sky-600 shadow-slate-200'
              : 'bg-sky-950/60 border-sky-500/40 text-sky-400 shadow-sky-500/10'
          }`}>
            <IconComponent className="w-10 h-10 animate-pulse" />
          </div>
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-lg border border-amber-300">
            {phase}
          </span>
        </div>

        {/* Header Title */}
        <div className="space-y-2">
          <h2 className={`text-2xl font-extrabold tracking-wide ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{title}</h2>
          <p className={`text-xs font-mono uppercase tracking-widest font-bold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
            FEATURE COMING SOON
          </p>
          <p className={`text-xs leading-relaxed max-w-md mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {description}
          </p>
        </div>

        {/* Upcoming Roadmap Card */}
        <div className={`rounded-sm p-4 text-left space-y-3 shadow-sm border ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0d1322] border-[#1f293d] text-slate-300 shadow-xl'
        }`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Planned Capabilities
          </span>
          <ul className="space-y-2 text-xs">
            {features.map((feat, idx) => (
              <li key={idx} className={`flex items-start gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span className={`font-bold ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>•</span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Phase Indicator Footer */}
        <div className={`inline-flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded-sm border ${
          isLight ? 'bg-white border-slate-200 text-slate-600' : 'text-slate-500 bg-slate-900/60 border-slate-800'
        }`}>
          <ShieldAlert className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
          Currently active: <span className={`font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Phase 1 Workspace</span>
        </div>
      </div>
    </div>
  );
};
