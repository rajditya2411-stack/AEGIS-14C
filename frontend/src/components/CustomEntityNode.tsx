import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Globe, 
  Server, 
  Mail, 
  User, 
  Building2, 
  AtSign, 
  FolderGit2, 
  Link, 
  ShieldCheck, 
  Network,
  Fingerprint,
  Phone,
  ShieldAlert,
  Wallet,
  AlertTriangle,
  Landmark,
  MessageSquare,
  Smartphone,
  Scale
} from 'lucide-react';
import type { EntityType, GraphNodeData } from '../types';

interface CustomNodeProps {
  data: GraphNodeData;
  selected?: boolean;
}

const getEntityConfig = (type: EntityType, isTarget?: boolean, isMule?: boolean) => {
  switch (type) {
    case 'COMPLAINT_TICKET':
      return { 
        icon: ShieldAlert, 
        nodeBg: 'bg-violet-600/30', 
        border: 'border-violet-400', 
        text: 'text-violet-300', 
        glow: 'shadow-[0_0_25px_rgba(139,92,246,0.6)] animate-pulse',
        innerBg: 'bg-violet-950',
        badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30'
      };
    case 'UPI_VPA':
      return { 
        icon: Wallet, 
        nodeBg: 'bg-cyan-500/20', 
        border: 'border-cyan-400', 
        text: 'text-cyan-400', 
        glow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)]',
        innerBg: 'bg-cyan-950',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
      };
    case 'MULE_ACCOUNT':
      return { 
        icon: AlertTriangle, 
        nodeBg: 'bg-rose-600/30', 
        border: 'border-rose-500', 
        text: 'text-rose-400', 
        glow: 'shadow-[0_0_30px_rgba(244,63,94,0.7)] animate-bounce',
        innerBg: 'bg-rose-950',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      };
    case 'BANK_ACCOUNT':
      return { 
        icon: Landmark, 
        nodeBg: 'bg-emerald-500/20', 
        border: 'border-emerald-400', 
        text: 'text-emerald-400', 
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]',
        innerBg: 'bg-emerald-950',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      };
    case 'PHISHING_URL':
      return { 
        icon: Link, 
        nodeBg: 'bg-orange-500/25', 
        border: 'border-orange-400', 
        text: 'text-orange-400', 
        glow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]',
        innerBg: 'bg-orange-950',
        badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      };
    case 'SMS_HEADER':
      return { 
        icon: MessageSquare, 
        nodeBg: 'bg-amber-500/20', 
        border: 'border-amber-400', 
        text: 'text-amber-400', 
        glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
        innerBg: 'bg-amber-950',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      };
    case 'APK_HASH':
      return { 
        icon: Smartphone, 
        nodeBg: 'bg-pink-500/20', 
        border: 'border-pink-400', 
        text: 'text-pink-400', 
        glow: 'shadow-[0_0_20px_rgba(236,72,153,0.4)]',
        innerBg: 'bg-pink-950',
        badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
      };
    case 'LEGAL_DIRECTIVE':
      return { 
        icon: Scale, 
        nodeBg: 'bg-indigo-500/25', 
        border: 'border-indigo-400', 
        text: 'text-indigo-400', 
        glow: 'shadow-[0_0_25px_rgba(99,102,241,0.5)]',
        innerBg: 'bg-indigo-950',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
      };
    case 'DOMAIN':
      return { 
        icon: Globe, 
        nodeBg: 'bg-sky-500/20', 
        border: 'border-sky-400', 
        text: 'text-sky-400', 
        glow: 'shadow-[0_0_20px_rgba(56,189,248,0.4)]',
        innerBg: 'bg-sky-950',
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30'
      };
    case 'IP ADDRESS':
      return { 
        icon: Server, 
        nodeBg: 'bg-emerald-500/20', 
        border: 'border-emerald-400', 
        text: 'text-emerald-400', 
        glow: 'shadow-[0_0_20px_rgba(52,211,153,0.4)]',
        innerBg: 'bg-emerald-950',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      };
    case 'EMAIL':
      return { 
        icon: Mail, 
        nodeBg: 'bg-rose-500/20', 
        border: 'border-rose-400', 
        text: 'text-rose-400', 
        glow: 'shadow-[0_0_20px_rgba(244,63,94,0.4)]',
        innerBg: 'bg-rose-950',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      };
    case 'PERSON':
      return { 
        icon: User, 
        nodeBg: 'bg-amber-500/20', 
        border: 'border-amber-400', 
        text: 'text-amber-400', 
        glow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]',
        innerBg: 'bg-amber-950',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      };
    case 'ORGANIZATION':
      return { 
        icon: Building2, 
        nodeBg: 'bg-purple-500/20', 
        border: 'border-purple-400', 
        text: 'text-purple-400', 
        glow: 'shadow-[0_0_20px_rgba(192,132,252,0.4)]',
        innerBg: 'bg-purple-950',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      };
    case 'USERNAME':
      return { 
        icon: AtSign, 
        nodeBg: 'bg-violet-500/20', 
        border: 'border-violet-400', 
        text: 'text-violet-400', 
        glow: 'shadow-[0_0_20px_rgba(167,139,250,0.4)]',
        innerBg: 'bg-violet-950',
        badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30'
      };
    case 'REPOSITORY':
      return { 
        icon: FolderGit2, 
        nodeBg: 'bg-indigo-500/20', 
        border: 'border-indigo-400', 
        text: 'text-indigo-400', 
        glow: 'shadow-[0_0_20px_rgba(129,140,248,0.4)]',
        innerBg: 'bg-indigo-950',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
      };
    case 'URL':
      return { 
        icon: Link, 
        nodeBg: 'bg-blue-500/20', 
        border: 'border-blue-400', 
        text: 'text-blue-400', 
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
        innerBg: 'bg-blue-950',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      };
    case 'CERTIFICATE':
      return { 
        icon: ShieldCheck, 
        nodeBg: 'bg-teal-500/20', 
        border: 'border-teal-400', 
        text: 'text-teal-400', 
        glow: 'shadow-[0_0_20px_rgba(45,212,191,0.4)]',
        innerBg: 'bg-teal-950',
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
      };
    case 'ASN':
      return { 
        icon: Network, 
        nodeBg: 'bg-orange-500/20', 
        border: 'border-orange-400', 
        text: 'text-orange-400', 
        glow: 'shadow-[0_0_20px_rgba(249,115,22,0.4)]',
        innerBg: 'bg-orange-950',
        badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      };
    case 'TRACKING_ID':
      return { 
        icon: Fingerprint, 
        nodeBg: 'bg-fuchsia-500/20', 
        border: 'border-fuchsia-400', 
        text: 'text-fuchsia-400', 
        glow: 'shadow-[0_0_20px_rgba(232,121,249,0.4)]',
        innerBg: 'bg-fuchsia-950',
        badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30'
      };
    case 'PHONE':
      return { 
        icon: Phone, 
        nodeBg: 'bg-lime-500/20', 
        border: 'border-lime-400', 
        text: 'text-lime-400', 
        glow: 'shadow-[0_0_20px_rgba(163,230,53,0.4)]',
        innerBg: 'bg-lime-950',
        badgeColor: 'bg-lime-500/20 text-lime-300 border-lime-500/30'
      };
    default:
      return { 
        icon: Globe, 
        nodeBg: 'bg-slate-500/20', 
        border: 'border-slate-400', 
        text: 'text-slate-400', 
        glow: 'shadow-[0_0_20px_rgba(148,163,184,0.4)]',
        innerBg: 'bg-slate-900',
        badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
      };
  }
};

export const CustomEntityNode = memo(({ data, selected }: CustomNodeProps) => {
  const isTarget = data.is_target || data.metadata_json?.is_target;
  const isMule = data.entity_type === 'MULE_ACCOUNT' || data.metadata_json?.is_mule;
  const config = getEntityConfig(data.entity_type, isTarget, isMule);
  const IconComponent = config.icon;

  return (
    <div className="flex flex-col items-center justify-center group cursor-pointer">
      {/* Target Connection Handles */}
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2 !-top-1 opacity-0 group-hover:opacity-100 transition" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2 !-bottom-1 opacity-0 group-hover:opacity-100 transition" />

      {/* Circular Glowing Icon Badge */}
      <div
        className={`w-13 h-13 rounded-full border-2 ${config.border} ${config.nodeBg} ${config.glow} flex items-center justify-center transition-all duration-200 relative ${
          selected ? 'ring-4 ring-sky-400/80 scale-115' : 'hover:scale-110'
        } ${isTarget ? 'ring-2 ring-violet-400/60' : ''}`}
      >
        <div className={`w-9 h-9 rounded-full ${config.innerBg} border ${config.border} flex items-center justify-center ${config.text}`}>
          <IconComponent className="w-4.5 h-4.5" />
        </div>

        {/* Pulse indicator for high-risk / target */}
        {(isTarget || isMule) && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMule ? 'bg-rose-400' : 'bg-violet-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isMule ? 'bg-rose-500' : 'bg-violet-500'}`}></span>
          </span>
        )}
      </div>

      {/* Label Underneath Node */}
      <div className="mt-1.5 px-2.5 py-1 rounded-sm bg-[#121214]/95 dark:bg-[#121214]/95 light:bg-white/95 border border-[#27272a] dark:border-[#27272a] light:border-slate-300 backdrop-blur-md shadow-md text-center max-w-[180px] transition-colors">
        <span className="text-[9px] font-mono uppercase tracking-wider block text-zinc-400 dark:text-zinc-400 light:text-slate-500 font-bold">
          {data.entity_type.replace('_', ' ')}
        </span>
        <p className="text-[11px] font-mono font-semibold text-[#fafaf9] dark:text-[#fafaf9] light:text-slate-900 truncate" title={data.label}>
          {data.label}
        </p>
      </div>
    </div>
  );
});

CustomEntityNode.displayName = 'CustomEntityNode';

