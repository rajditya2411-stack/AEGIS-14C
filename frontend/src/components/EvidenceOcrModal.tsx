import React, { useState } from 'react';
import { 
  X, 
  Eye, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Scale, 
  Wallet, 
  Landmark, 
  Phone,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import * as api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import type { Investigation } from '../types';

interface EvidenceOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: Investigation | null;
  onSuccess?: () => void;
}

export const EvidenceOcrModal: React.FC<EvidenceOcrModalProps> = ({
  isOpen,
  onClose,
  activeCase,
  onSuccess
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [imageBase64, setImageBase64] = useState<string>('');
  const [filename, setFilename] = useState<string>('whatsapp_scam.jpg');
  const [evidenceType, setEvidenceType] = useState<string>('WHATSAPP_CHAT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFilename(file.name);
      setError(null);

      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunOCR = async () => {
    if (!imageBase64) {
      setError('Please choose an image file or click one of the quick presets below.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await api.parseEvidenceVisionOCR({
        image_base64: imageBase64,
        filename,
        evidence_type: evidenceType,
        investigation_id: activeCase?.id
      });
      setOcrResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Vision OCR parsing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadPreset = (name: string, type: string, mockBase64: string) => {
    setFilename(name);
    setEvidenceType(type);
    setImageBase64(mockBase64);
    setError(null);
    setOcrResult(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className={`border rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121214] border-[#27272a] text-zinc-100'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-xs font-mono tracking-wide">
            <Eye className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
            <span className={isLight ? 'text-slate-900' : 'text-white'}>
              Multi-Modal Vision OCR & FIR Evidence Extractor
            </span>
          </div>
          <button onClick={onClose} className={`transition cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
          }`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {activeCase && (
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-indigo-500/10 border border-indigo-500/30 text-xs font-mono">
              <span className="text-zinc-400">Target Investigation Case:</span>
              <span className="font-bold text-indigo-300">{activeCase.title}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              ⚡ Quick Cybercrime Evidence Presets:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => loadPreset(
                  'whatsapp_telegram_job_scam.png',
                  'WHATSAPP_CHAT',
                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                )}
                className="p-2 text-left rounded-sm border border-[#27272a] hover:bg-white/5 transition text-xs font-mono cursor-pointer"
              >
                <span className="font-bold text-sky-400 block">WhatsApp Chat</span>
                <span className="text-[10px] text-zinc-400">Part-Time Job Review</span>
              </button>

              <button
                type="button"
                onClick={() => loadPreset(
                  'electricity_bill_sms_alert.jpg',
                  'SMS_DEBIT_RECEIPT',
                  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
                )}
                className="p-2 text-left rounded-sm border border-[#27272a] hover:bg-white/5 transition text-xs font-mono cursor-pointer"
              >
                <span className="font-bold text-amber-400 block">Urgent Bijli SMS</span>
                <span className="text-[10px] text-zinc-400">Power Disconnection</span>
              </button>

              <button
                type="button"
                onClick={() => loadPreset(
                  'handwritten_fir_complaint_slip.jpg',
                  'COMPLAINT_FIR',
                  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
                )}
                className="p-2 text-left rounded-sm border border-[#27272a] hover:bg-white/5 transition text-xs font-mono cursor-pointer"
              >
                <span className="font-bold text-rose-400 block">Digital Arrest FIR</span>
                <span className="text-[10px] text-zinc-400">CBI Impersonation</span>
              </button>
            </div>
          </div>

          {/* Upload Box */}
          <div className={`border-2 border-dashed rounded-sm p-5 text-center cursor-pointer transition ${
            imageBase64 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[#27272a] hover:border-zinc-500 bg-[#0d0e17]'
          }`}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="vision-upload-input"
            />
            <label htmlFor="vision-upload-input" className="cursor-pointer block">
              <Upload className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
              {imageBase64 ? (
                <div className="space-y-1">
                  <span className="font-bold text-xs font-mono text-emerald-400 block">
                    ✓ Image Loaded: {filename}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Type: {evidenceType}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-mono text-zinc-300 block">
                    Upload handwritten FIR photo, WhatsApp chat screenshot, or bank debit slip
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Analyzes via Gemini 1.5 Flash Vision / Heuristic Cyber OCR engine
                  </span>
                </div>
              )}
            </label>
          </div>

          {error && (
            <div className="p-2.5 rounded-sm bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OCR Results */}
          {ocrResult && (
            <div className="space-y-3 p-4 rounded-sm border border-[#27272a] bg-[#07080f] font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Extracted Financial & Threat Indicators
                </span>
                <span className="px-2 py-0.5 rounded-sm bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                  {ocrResult.analysis_method}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Complainant:</span>
                  <span className="font-bold text-zinc-200">{ocrResult.complainant_name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Defrauded Sum:</span>
                  <span className="font-bold text-rose-400">₹{ocrResult.defrauded_amount_inr?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Confidence:</span>
                  <span className="font-bold text-emerald-400">{ocrResult.confidence_score}%</span>
                </div>
              </div>

              {/* Narrative */}
              <div className="p-2 rounded-sm bg-[#121214] border border-[#27272a] text-[11px] text-zinc-300">
                <span className="text-zinc-500 block text-[10px] uppercase font-bold mb-0.5">Scam Modus Operandi:</span>
                <p>{ocrResult.scam_narrative}</p>
              </div>

              {/* Custody Certificate */}
              <div className="p-2 rounded-sm bg-indigo-500/10 border border-indigo-500/20 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Section 63 BSA Custody ID:</span>
                  <span className="font-bold text-indigo-300">{ocrResult.custody_envelope?.custody_id}</span>
                </div>
                <div className="truncate">
                  <span className="text-zinc-400">SHA-256: </span>
                  <span className="text-emerald-400 font-bold">{ocrResult.custody_envelope?.sha256}</span>
                </div>
              </div>

              {/* Suspect VPAs & Bank Accounts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                {ocrResult.suspect_upi_vpas?.length > 0 && (
                  <div>
                    <span className="text-zinc-400 block mb-1">Suspect UPI VPAs:</span>
                    {ocrResult.suspect_upi_vpas.map((vpa: string, i: number) => (
                      <div key={i} className="p-1 rounded-sm bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 truncate">
                        💳 {vpa}
                      </div>
                    ))}
                  </div>
                )}
                {ocrResult.transaction_utrs?.length > 0 && (
                  <div>
                    <span className="text-zinc-400 block mb-1">Transaction UTRs:</span>
                    {ocrResult.transaction_utrs.map((utr: string, i: number) => (
                      <div key={i} className="p-1 rounded-sm bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 truncate">
                        🏷️ {utr}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <span className="text-[11px] font-mono text-zinc-400">
            {ocrResult ? '✓ Evidence authenticated & certified u/s 63 BSA' : 'Supports JPG, PNG, WEBP files'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm border border-[#27272a] text-xs font-mono text-zinc-300 hover:bg-white/5 transition cursor-pointer"
            >
              {ocrResult ? 'Close' : 'Cancel'}
            </button>

            {!ocrResult && (
              <button
                onClick={handleRunOCR}
                disabled={isProcessing || !imageBase64}
                className="px-4 py-1.5 rounded-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-mono transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                <span>Extract Evidence via Vision OCR</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
