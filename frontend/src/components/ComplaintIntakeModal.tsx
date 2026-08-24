import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Send, 
  Sparkles, 
  X, 
  FileText, 
  Phone, 
  Wallet, 
  Globe, 
  Smartphone, 
  Scale, 
  CheckCircle2, 
  AlertTriangle,
  Play
} from 'lucide-react';
import type { SampleComplaintItem, ComplaintParseResponse } from '../types';
import * as api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface ComplaintIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunTriage: (payload: {
    raw_text: string;
    source_channel: string;
    complainant_name?: string;
    complainant_contact?: string;
  }) => void;
  isStreaming?: boolean;
}

export const ComplaintIntakeModal: React.FC<ComplaintIntakeModalProps> = ({
  isOpen,
  onClose,
  onRunTriage,
  isStreaming = false
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [samples, setSamples] = useState<SampleComplaintItem[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('sample-electricity-hinglish');
  const [rawText, setRawText] = useState<string>('');
  const [sourceChannel, setSourceChannel] = useState<string>('1930 Helpline');
  const [complainantName, setComplainantName] = useState<string>('Aarav Sharma');
  const [complainantContact, setComplainantContact] = useState<string>('+91 98765 01234');
  
  // Real-time parsed preview
  const [parsedPreview, setParsedPreview] = useState<ComplaintParseResponse | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  useEffect(() => {
    api.fetchSampleComplaints()
      .then((data) => {
        setSamples(data);
        if (data.length > 0) {
          setSelectedSampleId(data[0].id);
          setRawText(data[0].payload);
          setSourceChannel(data[0].source_channel);
        }
      })
      .catch((err) => console.error('Failed to load sample complaints:', err));
  }, []);

  // When sample is selected, populate text
  const handleSelectSample = (sampleId: string) => {
    setSelectedSampleId(sampleId);
    const sample = samples.find((s) => s.id === sampleId);
    if (sample) {
      setRawText(sample.payload);
      setSourceChannel(sample.source_channel);
    }
  };

  // Debounced real-time parse
  useEffect(() => {
    if (!rawText || rawText.trim().length < 10) {
      setParsedPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsParsing(true);
      try {
        const preview = await api.parseComplaint({
          raw_text: rawText,
          source_channel: sourceChannel,
          complainant_name: complainantName,
          complainant_contact: complainantContact
        });
        setParsedPreview(preview);
      } catch (err) {
        console.error('Real-time parsing failed:', err);
      } finally {
        setIsParsing(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [rawText, sourceChannel, complainantName, complainantContact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || isStreaming) return;
    onRunTriage({
      raw_text: rawText.trim(),
      source_channel: sourceChannel,
      complainant_name: complainantName,
      complainant_contact: complainantContact
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className={`border rounded-sm w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#09090b] border-[#27272a] text-zinc-100'
      }`}>
        {/* Header */}
        <div className={`p-4 px-6 border-b flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#0d0e14] border-[#27272a]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-sm border flex items-center justify-center shadow-sm ${
              isLight ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-stone-200 text-black'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                AEGIS-I4C Complaint Intake & Triage Station
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm font-bold border ${
                  isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-white text-black border-stone-200'
                }`}>
                  MHA / I4C Portal
                </span>
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Ingest raw Hinglish/English citizen complaints, extract IOCs & trigger autonomous multi-agent triage</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1 rounded-sm transition cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Complaint Inputs */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Quick Sample Selector */}
            <div>
              <label className={`text-xs font-mono font-semibold mb-1.5 flex items-center justify-between ${
                isLight ? 'text-slate-700' : 'text-zinc-300'
              }`}>
                <span>Select Test Payload (Indian Cyber Crime Templates):</span>
                <span className={`text-[10px] flex items-center gap-1 font-sans font-bold ${
                  isLight ? 'text-sky-700' : 'text-cyan-400'
                }`}>
                  <Sparkles className="w-3 h-3" /> Pre-configured IOCs
                </span>
              </label>
              <select
                value={selectedSampleId}
                onChange={(e) => handleSelectSample(e.target.value)}
                className={`w-full rounded-sm px-3 py-2 text-xs focus:outline-none transition cursor-pointer font-sans border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                    : 'bg-[#121214] border-[#27272a] text-zinc-200 focus:border-violet-500'
                }`}
              >
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.source_channel})
                  </option>
                ))}
              </select>
            </div>

            {/* Source Channel & Complainant Meta */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-[11px] font-mono mb-1 block ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Intake Channel:</label>
                <select
                  value={sourceChannel}
                  onChange={(e) => setSourceChannel(e.target.value)}
                  className={`w-full rounded-sm px-2.5 py-1.5 text-xs focus:outline-none border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                      : 'bg-[#121214] border-[#27272a] text-zinc-200 focus:border-violet-500'
                  }`}
                >
                  <option value="1930 Helpline">1930 Helpline (Direct Citizen)</option>
                  <option value="Citizen Portal">National Cyber Crime Portal</option>
                  <option value="WhatsApp Helpline">WhatsApp Cyber Desk</option>
                  <option value="Cyber Cell FIR">State Police Cyber FIR</option>
                  <option value="SMS Gateway">TRAI SMS Gateway Trap</option>
                </select>
              </div>
              <div>
                <label className={`text-[11px] font-mono mb-1 block ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Complainant Contact:</label>
                <input
                  type="text"
                  value={complainantContact}
                  onChange={(e) => setComplainantContact(e.target.value)}
                  placeholder="+91 98765 01234"
                  className={`w-full rounded-sm px-2.5 py-1.5 text-xs focus:outline-none font-mono border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                      : 'bg-[#121214] border-[#27272a] text-zinc-200 focus:border-violet-500'
                  }`}
                />
              </div>
            </div>

            {/* Raw Complaint Text Area */}
            <div className="flex-1 flex flex-col">
              <label className={`text-xs font-mono font-semibold mb-1.5 flex items-center justify-between ${
                isLight ? 'text-slate-700' : 'text-zinc-300'
              }`}>
                <span>Raw Citizen Complaint Text (Hinglish / English):</span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>{rawText.length} chars</span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={7}
                placeholder="Paste citizen phishing SMS, WhatsApp forward, APK download link or UPI receipt message..."
                className={`w-full rounded-sm p-3 text-xs focus:outline-none font-mono leading-relaxed resize-none shadow-inner border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                    : 'bg-[#121214] border-[#27272a] text-zinc-200 focus:border-violet-500'
                }`}
              />
            </div>
          </div>

          {/* Right Column: Real-Time Parser Preview */}
          <div className={`lg:col-span-5 flex flex-col space-y-3 rounded-sm p-4 border ${
            isLight ? 'bg-[#f8fafc] border-slate-200 text-slate-900' : 'bg-[#0d0e14] border-[#27272a]'
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-[#27272a]'}`}>
              <span className={`text-xs font-mono font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                <FileText className={`w-3.5 h-3.5 ${isLight ? 'text-purple-600' : 'text-violet-400'}`} />
                Live Structured IOC Preview
              </span>
              {isParsing ? (
                <span className={`text-[10px] font-mono animate-pulse ${isLight ? 'text-sky-700 font-bold' : 'text-cyan-400'}`}>Parsing...</span>
              ) : (
                <span className={`text-[10px] font-mono flex items-center gap-1 font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              )}
            </div>

            {parsedPreview ? (
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-xs">
                {/* Scam Category & Threat Meter */}
                <div className={`p-2.5 rounded-sm border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#121214] border-[#27272a]'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Classification:</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${
                      parsedPreview.severity_level === 'CRITICAL'
                        ? isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {parsedPreview.severity_level} ({parsedPreview.threat_severity}/100)
                    </span>
                  </div>
                  <p className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{parsedPreview.scam_category}</p>
                </div>

                {/* Extracted IOC Badges */}
                <div className="space-y-2">
                  <span className={`text-[10px] font-mono uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Extracted Threat Indicators:</span>

                  {/* UPI VPAs */}
                  {parsedPreview.extracted_iocs.upi_vpas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`text-[10px] font-mono flex items-center gap-1 font-bold ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}><Wallet className="w-3 h-3" /> UPI:</span>
                      {parsedPreview.extracted_iocs.upi_vpas.map((v) => (
                        <span key={v} className={`px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold border ${
                          isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                        }`}>
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Phones */}
                  {parsedPreview.extracted_iocs.phone_numbers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`text-[10px] font-mono flex items-center gap-1 font-bold ${isLight ? 'text-emerald-700' : 'text-lime-400'}`}><Phone className="w-3 h-3" /> Phone:</span>
                      {parsedPreview.extracted_iocs.phone_numbers.map((p) => (
                        <span key={p} className={`px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold border ${
                          isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-lime-950/60 text-lime-300 border-lime-500/40'
                        }`}>
                          +91 {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* URLs & Domains */}
                  {parsedPreview.extracted_iocs.phishing_urls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`text-[10px] font-mono flex items-center gap-1 font-bold ${isLight ? 'text-amber-700' : 'text-orange-400'}`}><Globe className="w-3 h-3" /> Link:</span>
                      {parsedPreview.extracted_iocs.phishing_urls.map((u) => (
                        <span key={u} className={`px-2 py-0.5 rounded-sm text-[10px] font-mono truncate max-w-[220px] border ${
                          isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-orange-950/60 text-orange-300 border-orange-500/40'
                        }`}>
                          {u}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* APK Hashes */}
                  {parsedPreview.extracted_iocs.apk_hashes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`text-[10px] font-mono flex items-center gap-1 font-bold ${isLight ? 'text-purple-700' : 'text-pink-400'}`}><Smartphone className="w-3 h-3" /> APK:</span>
                      {parsedPreview.extracted_iocs.apk_hashes.map((h) => (
                        <span key={h} className={`px-2 py-0.5 rounded-sm text-[10px] font-mono border ${
                          isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-pink-950/60 text-pink-300 border-pink-500/40'
                        }`}>
                          SHA256: {h.substring(0, 12)}...
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Statutory Legal Clauses */}
                <div className={`p-2.5 rounded-sm border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#121214] border-[#27272a]'
                }`}>
                  <span className={`text-[10px] font-mono uppercase tracking-wider block mb-1 flex items-center gap-1 font-bold ${
                    isLight ? 'text-indigo-700' : 'text-zinc-400'
                  }`}>
                    <Scale className="w-3 h-3 text-indigo-500" /> Statutory BNS / IT Act Mapping:
                  </span>
                  <ul className={`space-y-1 text-[11px] ${isLight ? 'text-indigo-900 font-medium' : 'text-indigo-300'}`}>
                    {parsedPreview.bns_sections.map((sec) => (
                      <li key={sec} className="flex items-start gap-1">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{sec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className={`flex-1 flex flex-col items-center justify-center text-center p-6 ${
                isLight ? 'text-slate-400' : 'text-zinc-500'
              }`}>
                <AlertTriangle className={`w-8 h-8 mb-2 ${isLight ? 'text-slate-300' : 'text-zinc-600'}`} />
                <p className="text-xs">Paste or select a complaint payload to preview structured IOC extraction and legal violations.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 px-6 border-t flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#0d0e14] border-[#27272a]'
        }`}>
          <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>FastAPI SSE Stream Engine Connected (&lt; 4s Target)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-sm text-xs font-semibold transition cursor-pointer border ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 border-slate-300 hover:bg-slate-100'
                  : 'text-zinc-300 hover:text-white border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!rawText.trim() || isStreaming}
              className={`flex items-center gap-2 px-5 py-2 rounded-sm text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 border ${
                isLight
                  ? 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900'
                  : 'bg-white text-black hover:bg-stone-100 border-stone-200'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Autonomous Multi-Agent Triage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
