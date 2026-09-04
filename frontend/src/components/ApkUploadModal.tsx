import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Upload, 
  AlertTriangle, 
  ShieldCheck, 
  FileCode2, 
  Radio, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Lock,
  ArrowRight,
  RefreshCw,
  Phone
} from 'lucide-react';
import * as api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import type { Investigation } from '../types';

interface ApkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: Investigation | null;
  onSuccess?: () => void;
}

export const ApkUploadModal: React.FC<ApkUploadModalProps> = ({
  isOpen,
  onClose,
  activeCase,
  onSuccess
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDecompiling, setIsDecompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDecompile = async () => {
    if (!selectedFile) {
      setError('Please choose a .apk file or select a sample preset.');
      return;
    }

    setIsDecompiling(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.decompileApkFile(formData, activeCase?.id);
      setAnalysisResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to decompile APK file');
    } finally {
      setIsDecompiling(false);
    }
  };

  const loadPreset = (name: string, mockContent: string) => {
    const file = new File([mockContent], name, { type: 'application/vnd.android.package-archive' });
    setSelectedFile(file);
    setError(null);
    setAnalysisResult(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className={`border rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121214] border-[#27272a] text-zinc-100'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-xs font-mono tracking-wide">
            <Smartphone className={`w-4 h-4 ${isLight ? 'text-pink-600' : 'text-pink-400'}`} />
            <span className={isLight ? 'text-slate-900' : 'text-white'}>
              Static APK Malware Decompiler & C2 Threat Extractor
            </span>
          </div>
          <button onClick={onClose} className={`transition cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
          }`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Active Case Banner */}
          {activeCase && (
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-pink-500/10 border border-pink-500/30 text-xs font-mono">
              <span className="text-zinc-400">Target Investigation Case:</span>
              <span className="font-bold text-pink-300">{activeCase.title}</span>
            </div>
          )}

          {/* Sample Preset Buttons */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              ⚡ Quick Cybercrime Malware Presets:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loadPreset(
                  'SBI_Reward_KYC.apk',
                  'PK\x03\x04AndroidManifest.xml<manifest package="com.sbi.reward.trojan"><uses-permission name="android.permission.RECEIVE_SMS"/><uses-permission name="android.permission.BIND_ACCESSIBILITY_SERVICE"/></manifest>classes.dex bot8899112233:AAFlkjhsdf87123jhsdf_kjhsdf8123jhsdf https://c2.sbi-scam-gate.top/log.php drop_phone: 9811204567'
                )}
                className="p-2 text-left rounded-sm border border-[#27272a] hover:bg-white/5 transition text-xs font-mono flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="font-bold text-pink-400 block">SBI Banking Trojan</span>
                  <span className="text-[10px] text-zinc-400">SMS-Stealer & Overlay RAT</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              <button
                type="button"
                onClick={() => loadPreset(
                  'Electricity_Bill_Update.apk',
                  'PK\x03\x04AndroidManifest.xml<manifest package="in.gov.bijli.update"><uses-permission name="android.permission.RECEIVE_SMS"/><uses-permission name="android.permission.SEND_SMS"/></manifest>classes.dex https://c2.power-update.org/gate.php drop_phone: 9876543210'
                )}
                className="p-2 text-left rounded-sm border border-[#27272a] hover:bg-white/5 transition text-xs font-mono flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="font-bold text-amber-400 block">Electricity Bill APK</span>
                  <span className="text-[10px] text-zinc-400">Jamtara SMS Forwarder</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Upload Area */}
          <div className={`border-2 border-dashed rounded-sm p-5 text-center cursor-pointer transition ${
            selectedFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[#27272a] hover:border-zinc-500 bg-[#0d0e17]'
          }`}>
            <input
              type="file"
              accept=".apk"
              onChange={handleFileChange}
              className="hidden"
              id="apk-upload-input"
            />
            <label htmlFor="apk-upload-input" className="cursor-pointer block">
              <Upload className="w-8 h-8 mx-auto mb-2 text-pink-400" />
              {selectedFile ? (
                <div className="space-y-1">
                  <span className="font-bold text-xs font-mono text-emerald-400 block">
                    ✓ Selected: {selectedFile.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-mono text-zinc-300 block">
                    Click to select or drag & drop malicious Android package (.apk)
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Statically extracts C2 URLs, Telegram Bots, and permissions without executing
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

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="space-y-3 p-4 rounded-sm border border-[#27272a] bg-[#07080f] font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                <span className="font-bold text-pink-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Decompilation & Extraction Summary
                </span>
                <span className="px-2 py-0.5 rounded-sm bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                  Risk: {analysisResult.threat_risk_score}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Malware Family:</span>
                  <span className="font-bold text-zinc-200">{analysisResult.malware_family}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Package Name:</span>
                  <span className="font-bold text-zinc-200">{analysisResult.package_name}</span>
                </div>
              </div>

              {/* Section 63 BSA Custody Info */}
              <div className="p-2 rounded-sm bg-indigo-500/10 border border-indigo-500/20 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Section 63 BSA Custody ID:</span>
                  <span className="font-bold text-indigo-300">{analysisResult.custody_envelope?.custody_id}</span>
                </div>
                <div className="truncate">
                  <span className="text-zinc-400">SHA-256: </span>
                  <span className="text-emerald-400 font-bold">{analysisResult.custody_envelope?.sha256}</span>
                </div>
              </div>

              {/* Extracted C2 URLs */}
              {analysisResult.c2_urls?.length > 0 && (
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block mb-1">Extracted C2 Server URLs:</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {analysisResult.c2_urls.map((url: string, i: number) => (
                      <div key={i} className="p-1.5 rounded-sm bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] truncate">
                        🚨 {url}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dangerous Permissions */}
              {analysisResult.dangerous_permissions?.length > 0 && (
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block mb-1">Flagged Permissions:</span>
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.dangerous_permissions.map((p: any, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px]" title={p.description}>
                        ⚠️ {p.permission.replace('android.permission.', '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <span className="text-[11px] font-mono text-zinc-400">
            {analysisResult ? '✓ Discovered indicators synced to canvas graph' : 'Court admissible under Section 63 BSA'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm border border-[#27272a] text-xs font-mono text-zinc-300 hover:bg-white/5 transition cursor-pointer"
            >
              {analysisResult ? 'Close' : 'Cancel'}
            </button>

            {!analysisResult && (
              <button
                onClick={handleDecompile}
                disabled={isDecompiling || !selectedFile}
                className="px-4 py-1.5 rounded-sm bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs font-mono transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isDecompiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCode2 className="w-3.5 h-3.5" />}
                <span>Decompile & Seed Graph</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
