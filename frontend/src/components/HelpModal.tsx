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
import { useTheme } from '../context/ThemeContext';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'quickstart' | 'controls' | 'inspector' | 'shortcuts'>('quickstart');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none font-sans">
      <div className={`w-full max-w-2xl rounded-sm border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121214] border-[#27272a] text-zinc-100'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-sm border flex items-center justify-center ${
              isLight ? 'bg-white border-slate-300 text-sky-600' : 'bg-[#27272a] border-[#3f3f46] text-sky-400'
            }`}>
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-xs tracking-wide font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                TRACE OSINT User Manual & Interface Guide
              </h3>
              <p className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Enterprise Reconnaissance Reference</p>
            </div>
          </div>
          <button onClick={onClose} className={`transition cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
          }`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`grid grid-cols-4 p-1.5 border-b gap-1 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('quickstart')}
            className={`py-1.5 px-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'quickstart'
                ? isLight
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-[#27272a] text-white border-[#3f3f46]'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 border-transparent'
                  : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} /> Quick Start
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`py-1.5 px-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'controls'
                ? isLight
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-[#27272a] text-white border-[#3f3f46]'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 border-transparent'
                  : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <MousePointer className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} /> Canvas Buttons
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inspector')}
            className={`py-1.5 px-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'inspector'
                ? isLight
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-[#27272a] text-white border-[#3f3f46]'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 border-transparent'
                  : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <Info className={`w-3.5 h-3.5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} /> Inspector Tools
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`py-1.5 px-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'shortcuts'
                ? isLight
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-[#27272a] text-white border-[#3f3f46]'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 border-transparent'
                  : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <Command className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} /> Shortcuts
          </button>
        </div>

        {/* Content Body */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className={`border p-3.5 rounded-sm space-y-2 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <h4 className={`font-bold text-xs flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <span className={`w-5 h-5 rounded-full font-mono text-[11px] flex items-center justify-center border ${
                    isLight ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                  }`}>1</span>
                  Create or Select an OSINT Investigation Case
                </h4>
                <p className={`leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  In the left sidebar under <strong className={isLight ? 'text-slate-900' : 'text-white'}>ACTIVE CASES</strong>, click the <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>+</strong> button to start a new investigation. Enter your target domain name (e.g. <code className={`font-mono px-1 py-0.5 rounded border ${isLight ? 'text-sky-800 bg-white border-slate-200' : 'text-sky-300 bg-[#09090b] border-[#27272a]'}`}>binance.com</code>).
                </p>
              </div>

              <div className={`border p-3.5 rounded-sm space-y-2 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <h4 className={`font-bold text-xs flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <span className={`w-5 h-5 rounded-full font-mono text-[11px] flex items-center justify-center border ${
                    isLight ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                  }`}>2</span>
                  Launch Automated OSINT Reconnaissance
                </h4>
                <p className={`leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Click the <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>+ Launch OSINT Scan</strong> button at the top right of the Graph Canvas. TRACE will automatically query DNS, WHOIS, IP Geolocation, Subdomains, SSL Certificates, Threat Intel, and Social Footprints to expand your knowledge graph.
                </p>
              </div>

              <div className={`border p-3.5 rounded-sm space-y-2 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <h4 className={`font-bold text-xs flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <span className={`w-5 h-5 rounded-full font-mono text-[11px] flex items-center justify-center border ${
                    isLight ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                  }`}>3</span>
                  Explore Node Evidence & Generate PDF Dossiers
                </h4>
                <p className={`leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Click any node on the graph canvas to open the <strong className={isLight ? 'text-slate-900' : 'text-white'}>Inspector Drawer</strong> on the right. You can inspect node parameters, 1-click copy values, add analyst notes, link custom relationships, or click <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>EXPORT REPORT →</strong> to download a formatted PDF dossier.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-3">
              <div className={`p-3 rounded-sm border flex items-start gap-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`p-2 rounded-sm border shrink-0 ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#09090b] border-[#27272a] text-white'
                }`}>
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>+ Launch OSINT Scan</h4>
                  <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Triggers full 4-Layer OSINT collectors (DNS, WHOIS, SSL certs, IP Geolocation, HIBP breaches, and Social Footprints) for the active target.
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded-sm border flex items-start gap-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`p-2 rounded-sm border shrink-0 ${
                  isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-[#09090b] border-[#27272a] text-white'
                }`}>
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>+ Add Entity</h4>
                  <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Manually adds custom OSINT entities (Domains, IPs, Persons, Organizations, Emails, URLs) directly to your knowledge graph.
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded-sm border flex items-start gap-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`p-2 rounded-sm border shrink-0 ${
                  isLight ? 'bg-white border-slate-300 text-sky-600' : 'bg-[#09090b] border-[#27272a] text-sky-400'
                }`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>AI Assistant</h4>
                  <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Toggles the Grounded AI Chat Assistant (Google Gemini / Local Ollama) to run threat analysis and infrastructure summaries.
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded-sm border flex items-start gap-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`p-2 rounded-sm border shrink-0 font-mono text-[10px] font-bold ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#09090b] border-[#27272a] text-zinc-300'
                }`}>
                  HUD
                </div>
                <div>
                  <h4 className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>Bottom-Left Floating HUD Controls</h4>
                  <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Contains <strong className={isLight ? 'text-slate-900' : 'text-white'}>+</strong> (Zoom In), <strong className={isLight ? 'text-slate-900' : 'text-white'}>-</strong> (Zoom Out), <strong className={isLight ? 'text-slate-900' : 'text-white'}>Fit View</strong> (frame entire graph), and <strong className={isLight ? 'text-slate-900' : 'text-white'}>Lock/Unlock</strong> (toggle canvas pan & node drag interactivity).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inspector' && (
            <div className="space-y-3">
              <div className={`p-3 rounded-sm border flex items-start gap-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`p-2 rounded-sm border shrink-0 ${
                  isLight ? 'bg-white border-slate-300 text-sky-600' : 'bg-[#09090b] border-[#27272a] text-sky-400'
                }`}>
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>Details Tab & Copy Buttons</h4>
                  <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Displays node type, IP address, registrar, reputation, and plain-English translation layer explaining what the node means. Features 1-click clipboard copy icons beside all entity values.
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded-sm border flex items-start gap-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`p-2 rounded-sm border shrink-0 ${
                  isLight ? 'bg-white border-slate-300 text-purple-600' : 'bg-[#09090b] border-[#27272a] text-purple-400'
                }`}>
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>Connect Tab & Link Removal</h4>
                  <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Allows creating custom typed edges between nodes with confidence ratings, and includes an "Undo Connection / Remove Link" button for every relationship.
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded-sm border flex items-start gap-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`p-2 rounded-sm border shrink-0 ${
                  isLight ? 'bg-white border-slate-300 text-pink-600' : 'bg-[#09090b] border-[#27272a] text-pink-400'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>Notes Tab (Edit & Delete)</h4>
                  <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Allows adding, inline editing, and deleting analyst notes attached to the active investigation case.
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded-sm border flex items-start gap-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`p-2 rounded-sm border shrink-0 ${
                  isLight ? 'bg-white border-slate-300 text-emerald-600' : 'bg-[#09090b] border-[#27272a] text-emerald-400'
                }`}>
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>EXPORT REPORT → Button</h4>
                  <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Generates and downloads a clean, publication-ready PDF intelligence dossier generated by ReportLab.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className={`flex items-center justify-between p-2.5 rounded-sm border ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>Click Any Graph Node</span>
                <span className={`font-semibold px-2 py-0.5 rounded-sm border ${
                  isLight ? 'text-sky-800 bg-white border-slate-300' : 'text-sky-400 bg-[#09090b] border-[#27272a]'
                }`}>Open Node Inspector</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-sm border ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>Click Canvas Backdrop</span>
                <span className={`font-semibold px-2 py-0.5 rounded-sm border ${
                  isLight ? 'text-slate-600 bg-white border-slate-300' : 'text-zinc-400 bg-[#09090b] border-[#27272a]'
                }`}>Deselect Node</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-sm border ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>Mouse Scroll / Pinch</span>
                <span className={`font-semibold px-2 py-0.5 rounded-sm border ${
                  isLight ? 'text-emerald-800 bg-white border-slate-300' : 'text-emerald-400 bg-[#09090b] border-[#27272a]'
                }`}>Zoom In / Zoom Out</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-sm border ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>Drag Canvas</span>
                <span className={`font-semibold px-2 py-0.5 rounded-sm border ${
                  isLight ? 'text-purple-800 bg-white border-slate-300' : 'text-purple-400 bg-[#09090b] border-[#27272a]'
                }`}>Pan Workspace</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>TRACE Engine v3.0 • Unified OSINT</span>
          <button
            onClick={onClose}
            className={`py-1.5 px-4 rounded-sm text-xs font-bold transition cursor-pointer border ${
              isLight
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                : 'bg-[#27272a] hover:bg-[#3f3f46] text-white border-[#3f3f46]'
            }`}
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
