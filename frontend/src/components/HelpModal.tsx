import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  BookOpen, 
  MousePointer, 
  Radio, 
  Plus, 
  Sparkles, 
  Info, 
  FileText, 
  Share2, 
  Download, 
  Maximize2, 
  Lock, 
  Command,
  ShieldCheck
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'controls' | 'inspector' | 'shortcuts'>('quickstart');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none font-sans">
      <div className="w-full max-w-2xl rounded-lg border border-[#27272a] bg-[#121214] text-zinc-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#18181b]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-sky-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs tracking-wide font-mono">
                TRACE OSINT User Manual & Interface Guide
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">Enterprise Reconnaissance Reference</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 p-1.5 bg-[#09090b] border-b border-[#27272a] gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('quickstart')}
            className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'quickstart'
                ? 'bg-[#27272a] text-white border border-[#3f3f46]'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" /> Quick Start
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'controls'
                ? 'bg-[#27272a] text-white border border-[#3f3f46]'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5 text-emerald-400" /> Canvas Buttons
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inspector')}
            className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'inspector'
                ? 'bg-[#27272a] text-white border border-[#3f3f46]'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-purple-400" /> Inspector Tools
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'bg-[#27272a] text-white border border-[#3f3f46]'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <Command className="w-3.5 h-3.5 text-amber-400" /> Shortcuts
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin text-xs text-zinc-300">
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-md space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-mono text-[11px] flex items-center justify-center border border-sky-500/30">1</span>
                  Create or Select an OSINT Investigation Case
                </h4>
                <p className="text-zinc-300 leading-relaxed">
                  In the left sidebar under <strong className="text-white">ACTIVE CASES</strong>, click the <strong className="text-white font-mono">+</strong> button to start a new investigation. Enter your target domain name (e.g. <code className="text-sky-300 font-mono bg-[#09090b] px-1 py-0.5 rounded">binance.com</code>).
                </p>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-md space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-mono text-[11px] flex items-center justify-center border border-sky-500/30">2</span>
                  Launch Automated OSINT Reconnaissance
                </h4>
                <p className="text-zinc-300 leading-relaxed">
                  Click the white prominent <strong className="text-white font-mono">+ Launch OSINT Scan</strong> button at the top right of the Graph Canvas. TRACE will automatically query DNS, WHOIS, IP Geolocation, Subdomains, SSL Certificates, Threat Intel, and Social Footprints to expand your knowledge graph.
                </p>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-md space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-mono text-[11px] flex items-center justify-center border border-sky-500/30">3</span>
                  Explore Node Evidence & Generate PDF Dossiers
                </h4>
                <p className="text-zinc-300 leading-relaxed">
                  Click any node on the graph canvas to open the <strong className="text-white">Inspector Drawer</strong> on the right. You can inspect node parameters, 1-click copy values, add analyst notes, link custom relationships, or click <strong className="text-white font-mono">EXPORT REPORT →</strong> to download a formatted PDF dossier.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-3">
              <div className="p-3 bg-[#18181b] rounded-md border border-[#27272a] flex items-start gap-3">
                <div className="p-2 rounded bg-[#09090b] border border-[#27272a] text-white shrink-0">
                  <Radio className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs font-mono">+ Launch OSINT Scan</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5 leading-normal">
                    Triggers full 4-Layer OSINT collectors (DNS, WHOIS, SSL certs, IP Geolocation, HIBP breaches, and Social Footprints) for the active target.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#18181b] rounded-md border border-[#27272a] flex items-start gap-3">
                <div className="p-2 rounded bg-[#09090b] border border-[#27272a] text-white shrink-0">
                  <Plus className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs font-mono">+ Add Entity</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5 leading-normal">
                    Manually adds custom OSINT entities (Domains, IPs, Persons, Organizations, Emails, URLs) directly to your knowledge graph.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#18181b] rounded-md border border-[#27272a] flex items-start gap-3">
                <div className="p-2 rounded bg-[#09090b] border border-[#27272a] text-sky-400 shrink-0">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs font-mono">AI Assistant</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5 leading-normal">
                    Toggles the Grounded AI Chat Assistant (Google Gemini / Local Ollama) to run threat analysis and infrastructure summaries.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#18181b] rounded-md border border-[#27272a] flex items-start gap-3">
                <div className="p-2 rounded bg-[#09090b] border border-[#27272a] text-zinc-300 shrink-0 font-mono text-[10px] font-bold">
                  HUD
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs font-mono">Bottom-Left Floating HUD Controls</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5 leading-normal">
                    Contains <strong className="text-white">+</strong> (Zoom In), <strong className="text-white">-</strong> (Zoom Out), <strong className="text-white">Fit View</strong> (frame entire graph), and <strong className="text-white">Lock/Unlock</strong> (toggle canvas pan & node drag interactivity).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inspector' && (
            <div className="space-y-3">
              <div className="p-3 bg-[#18181b] rounded-md border border-[#27272a] flex items-start gap-3">
                <div className="p-2 rounded bg-[#09090b] border border-[#27272a] text-sky-400 shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs font-mono">Details Tab & Copy Buttons</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5 leading-normal">
                    Displays node type, IP address, registrar, reputation, and plain-English translation layer explaining what the node means. Features 1-click clipboard copy icons beside all entity values.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#18181b] rounded-md border border-[#27272a] flex items-start gap-3">
                <div className="p-2 rounded bg-[#09090b] border border-[#27272a] text-purple-400 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs font-mono">Connect Tab & Link Removal</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5 leading-normal">
                    Allows creating custom typed edges between nodes with confidence ratings, and includes an "Undo Connection / Remove Link" button for every relationship.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#18181b] rounded-md border border-[#27272a] flex items-start gap-3">
                <div className="p-2 rounded bg-[#09090b] border border-[#27272a] text-pink-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs font-mono">Notes Tab (Edit & Delete)</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5 leading-normal">
                    Allows adding, inline editing, and deleting analyst notes attached to the active investigation case.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#18181b] rounded-md border border-[#27272a] flex items-start gap-3">
                <div className="p-2 rounded bg-[#09090b] border border-[#27272a] text-emerald-400 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs font-mono">EXPORT REPORT → Button</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5 leading-normal">
                    Generates and downloads a clean, publication-ready PDF intelligence dossier generated by ReportLab.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 bg-[#18181b] rounded-md border border-[#27272a]">
                <span className="text-zinc-300">Click Any Graph Node</span>
                <span className="text-sky-400 font-semibold bg-[#09090b] px-2 py-0.5 rounded border border-[#27272a]">Open Node Inspector</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#18181b] rounded-md border border-[#27272a]">
                <span className="text-zinc-300">Click Canvas Backdrop</span>
                <span className="text-zinc-400 font-semibold bg-[#09090b] px-2 py-0.5 rounded border border-[#27272a]">Deselect Node</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#18181b] rounded-md border border-[#27272a]">
                <span className="text-zinc-300">Mouse Scroll / Pinch</span>
                <span className="text-emerald-400 font-semibold bg-[#09090b] px-2 py-0.5 rounded border border-[#27272a]">Zoom In / Zoom Out</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#18181b] rounded-md border border-[#27272a]">
                <span className="text-zinc-300">Drag Canvas</span>
                <span className="text-purple-400 font-semibold bg-[#09090b] px-2 py-0.5 rounded border border-[#27272a]">Pan Workspace</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#27272a] bg-[#18181b] flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500">TRACE Engine v3.0 • Obsidian HUD</span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-semibold transition cursor-pointer"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
