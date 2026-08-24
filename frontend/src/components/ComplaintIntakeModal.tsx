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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#09090b] border border-[#27272a] rounded-sm w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[#27272a] flex items-center justify-between bg-[#0d0e14]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-white border border-stone-200 flex items-center justify-center text-black shadow-md">
              <ShieldAlert className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                AEGIS-I4C Complaint Intake & Triage Station
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-white text-black font-bold border border-stone-200">
                  MHA / I4C Portal
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Ingest raw Hinglish/English citizen complaints, extract IOCs & trigger autonomous multi-agent triage</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-sm hover:bg-zinc-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Complaint Inputs */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Quick Sample Selector */}
            <div>
              <label className="text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Select Test Payload (Indian Cyber Crime Templates):</span>
                <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-sans">
                  <Sparkles className="w-3 h-3" /> Pre-configured IOCs
                </span>
              </label>
              <select
                value={selectedSampleId}
                onChange={(e) => handleSelectSample(e.target.value)}
                className="w-full bg-[#121214] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 transition cursor-pointer font-sans"
              >
                {samples.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#121214] text-zinc-200">
                    {s.title} ({s.source_channel})
                  </option>
                ))}
              </select>
            </div>

            {/* Source Channel & Complainant Meta */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 mb-1 block">Intake Channel:</label>
                <select
                  value={sourceChannel}
                  onChange={(e) => setSourceChannel(e.target.value)}
                  className="w-full bg-[#121214] border border-[#27272a] rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="1930 Helpline">1930 Helpline (Direct Citizen)</option>
                  <option value="Citizen Portal">National Cyber Crime Portal</option>
                  <option value="WhatsApp Helpline">WhatsApp Cyber Desk</option>
                  <option value="Cyber Cell FIR">State Police Cyber FIR</option>
                  <option value="SMS Gateway">TRAI SMS Gateway Trap</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-mono text-zinc-400 mb-1 block">Complainant Contact:</label>
                <input
                  type="text"
                  value={complainantContact}
                  onChange={(e) => setComplainantContact(e.target.value)}
                  placeholder="+91 98765 01234"
                  className="w-full bg-[#121214] border border-[#27272a] rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
            </div>

            {/* Raw Complaint Text Area */}
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Raw Citizen Complaint Text (Hinglish / English):</span>
                <span className="text-[10px] text-zinc-500 font-mono">{rawText.length} chars</span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={7}
                placeholder="Paste citizen phishing SMS, WhatsApp forward, APK download link or UPI receipt message..."
                className="w-full bg-[#121214] border border-[#27272a] rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 font-mono leading-relaxed resize-none shadow-inner"
              />
            </div>
          </div>

          {/* Right Column: Real-Time Parser Preview */}
          <div className="lg:col-span-5 flex flex-col space-y-3 bg-[#0d0e14] border border-[#27272a] rounded-lg p-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                Live Structured IOC Preview
              </span>
              {isParsing ? (
                <span className="text-[10px] text-cyan-400 font-mono animate-pulse">Parsing...</span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              )}
            </div>

            {parsedPreview ? (
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-xs">
                {/* Scam Category & Threat Meter */}
                <div className="p-2.5 rounded-md bg-[#121214] border border-[#27272a]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Classification:</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      parsedPreview.severity_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {parsedPreview.severity_level} ({parsedPreview.threat_severity}/100)
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate">{parsedPreview.scam_category}</p>
                </div>

                {/* Extracted IOC Badges */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Extracted Threat Indicators:</span>

                  {/* UPI VPAs */}
                  {parsedPreview.extracted_iocs.upi_vpas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1"><Wallet className="w-3 h-3" /> UPI:</span>
                      {parsedPreview.extracted_iocs.upi_vpas.map((v) => (
                        <span key={v} className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-semibold">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Phones */}
                  {parsedPreview.extracted_iocs.phone_numbers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-lime-400 font-mono flex items-center gap-1"><Phone className="w-3 h-3" /> Phone:</span>
                      {parsedPreview.extracted_iocs.phone_numbers.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-lime-950/60 text-lime-300 border border-lime-500/40 text-[11px] font-mono font-semibold">
                          +91 {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* URLs & Domains */}
                  {parsedPreview.extracted_iocs.phishing_urls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-orange-400 font-mono flex items-center gap-1"><Globe className="w-3 h-3" /> Link:</span>
                      {parsedPreview.extracted_iocs.phishing_urls.map((u) => (
                        <span key={u} className="px-2 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-500/40 text-[10px] font-mono truncate max-w-[220px]">
                          {u}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* APK Hashes */}
                  {parsedPreview.extracted_iocs.apk_hashes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-pink-400 font-mono flex items-center gap-1"><Smartphone className="w-3 h-3" /> APK:</span>
                      {parsedPreview.extracted_iocs.apk_hashes.map((h) => (
                        <span key={h} className="px-2 py-0.5 rounded bg-pink-950/60 text-pink-300 border border-pink-500/40 text-[10px] font-mono">
                          SHA256: {h.substring(0, 12)}...
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Statutory Legal Clauses */}
                <div className="p-2.5 rounded-md bg-[#121214] border border-[#27272a]">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-indigo-400" /> Statutory BNS / IT Act Mapping:
                  </span>
                  <ul className="space-y-1 text-[11px] text-indigo-300">
                    {parsedPreview.bns_sections.map((sec) => (
                      <li key={sec} className="flex items-start gap-1">
                        <span className="text-indigo-400">•</span>
                        <span>{sec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <AlertTriangle className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs">Paste or select a complaint payload to preview structured IOC extraction and legal violations.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[#27272a] bg-[#0d0e14] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>FastAPI SSE Stream Engine Connected (&lt; 4s Target)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-sm text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!rawText.trim() || isStreaming}
              className="flex items-center gap-2 px-5 py-2 rounded-sm text-xs font-bold bg-white text-black hover:bg-stone-100 shadow-sm border border-stone-200 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current text-black" />
              <span>Launch Autonomous Multi-Agent Triage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
