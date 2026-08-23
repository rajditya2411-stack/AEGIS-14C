import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Cpu, 
  ExternalLink, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Globe, 
  KeyRound, 
  Loader2, 
  Save,
  User as UserIcon,
  Shield,
  Lock,
  LogOut,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import * as api from '../lib/api';
import type { User } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserUpdated?: (user: User) => void;
  onLogout: () => void;
  onSettingsUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onLogout,
  onSettingsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'ai' | 'social'>('account');

  // Account Profile & Password state
  const [displayName, setDisplayName] = useState(currentUser?.display_name || 'Recon Analyst');
  const [userRole, setUserRole] = useState(currentUser?.role || 'Lead Investigator');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [accountMessage, setAccountMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI settings
  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [maskedGeminiKey, setMaskedGeminiKey] = useState('');

  // Social & Threat Intel keys
  const [apifyToken, setApifyToken] = useState('');
  const [twitterToken, setTwitterToken] = useState('');
  const [instaToken, setInstaToken] = useState('');
  const [hibpKey, setHibpKey] = useState('');

  const [hasApifyToken, setHasApifyToken] = useState(false);
  const [maskedApifyToken, setMaskedApifyToken] = useState('');
  const [hasTwitterToken, setHasTwitterToken] = useState(false);
  const [maskedTwitterToken, setMaskedTwitterToken] = useState('');
  const [hasInstaToken, setHasInstaToken] = useState(false);
  const [maskedInstaToken, setMaskedInstaToken] = useState('');
  const [hasHibpKey, setHasHibpKey] = useState(false);
  const [maskedHibpKey, setMaskedHibpKey] = useState('');

  const [savingBYO, setSavingBYO] = useState(false);
  const [byoSuccess, setByoSuccess] = useState(false);
  const [byoError, setByoError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
      if (currentUser) {
        setDisplayName(currentUser.display_name);
        setUserRole(currentUser.role);
      }
    }
  }, [isOpen, currentUser]);

  const loadCurrentConfig = async () => {
    try {
      const cfg = await api.fetchAIConfig();
      setProvider(cfg.provider || 'gemini');
      setHasGeminiKey(cfg.has_gemini_key || false);
      setMaskedGeminiKey(cfg.masked_gemini_key || '');
      setOllamaUrl(cfg.ollama_url || 'http://localhost:11434');
      setOllamaModel(cfg.ollama_model || 'llama3');

      setHasApifyToken(cfg.has_apify_token || false);
      setMaskedApifyToken(cfg.masked_apify_token || '');
      setHasTwitterToken(cfg.has_twitter_token || false);
      setMaskedTwitterToken(cfg.masked_twitter_token || '');
      setHasInstaToken(cfg.has_instagram_token || false);
      setMaskedInstaToken(cfg.masked_instagram_token || '');
      setHasHibpKey(cfg.has_hibp_key || false);
      setMaskedHibpKey(cfg.masked_hibp_key || '');
    } catch (err) {
      console.error('Error fetching settings config:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setAccountMessage(null);
    try {
      const updated = await api.updateUserProfile({
        display_name: displayName,
        role: userRole
      });
      if (onUserUpdated) onUserUpdated(updated);
      setAccountMessage({ type: 'success', text: 'Analyst profile updated successfully!' });
      setTimeout(() => setAccountMessage(null), 3000);
    } catch (err: any) {
      setAccountMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) return;
    if (newPass !== confirmPass) {
      setAccountMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSavingPassword(true);
    setAccountMessage(null);
    try {
      await api.changePassword(currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setAccountMessage({ type: 'success', text: 'Account password changed successfully!' });
      setTimeout(() => setAccountMessage(null), 3000);
    } catch (err: any) {
      setAccountMessage({ type: 'error', text: err.message || 'Password update failed.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveBYO = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBYO(true);
    setByoError(null);
    setByoSuccess(false);

    try {
      const updateData: any = {
        provider,
        ollama_url: ollamaUrl,
        ollama_model: ollamaModel
      };

      if (geminiApiKey.trim()) updateData.gemini_api_key = geminiApiKey.trim();
      if (apifyToken.trim()) updateData.apify_api_token = apifyToken.trim();
      if (twitterToken.trim()) updateData.twitter_bearer_token = twitterToken.trim();
      if (instaToken.trim()) updateData.instagram_access_token = instaToken.trim();
      if (hibpKey.trim()) updateData.hibp_api_key = hibpKey.trim();

      await api.updateAIConfig(updateData);
      setByoSuccess(true);
      setGeminiApiKey('');
      setApifyToken('');
      setTwitterToken('');
      setInstaToken('');
      setHibpKey('');
      await loadCurrentConfig();
      if (onSettingsUpdated) onSettingsUpdated();
      setTimeout(() => setByoSuccess(false), 3000);
    } catch (err: any) {
      setByoError(err.message || 'Failed to save BYO-API settings');
    } finally {
      setSavingBYO(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none font-sans">
      <div className="w-full max-w-xl rounded-lg border border-[#27272a] bg-[#121214] text-zinc-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#18181b]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-white text-xs tracking-wide font-mono">
              TRACE Settings & BYO-API Management
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top-Level Segmented Control Navigation Tabs */}
        <div className="grid grid-cols-3 p-1.5 bg-[#09090b] border-b border-[#27272a] gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'account'
                ? 'bg-[#27272a] text-white border border-[#3f3f46]'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-sky-400" /> Account & Security
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-[#27272a] text-white border border-[#3f3f46]'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> AI Model Keys
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('social')}
            className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'social'
                ? 'bg-[#27272a] text-white border border-[#3f3f46]'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" /> Social & BYO-API
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* TAB 1: Account & Security Management */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              {accountMessage && (
                <div
                  className={`p-3 rounded-md text-xs flex items-center gap-2 ${
                    accountMessage.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  {accountMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{accountMessage.text}</span>
                </div>
              )}

              {/* User Profile Card */}
              <form onSubmit={handleUpdateProfile} className="bg-[#18181b] border border-[#27272a] p-4 rounded-md space-y-3">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 font-bold font-mono text-sm">
                      {currentUser?.display_name ? currentUser.display_name.substring(0, 2).toUpperCase() : 'TR'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{currentUser?.display_name || 'Recon Analyst'}</h4>
                      <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                        <Mail className="w-3 h-3 text-zinc-500" /> {currentUser?.email || 'analyst@tracex.osint'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-sky-950/60 text-sky-300 border border-sky-800/60 px-2 py-0.5 rounded">
                    {currentUser?.role || 'Lead Investigator'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-zinc-400 font-medium mb-1 font-mono">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-[#121214] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 font-medium mb-1 font-mono">Recon Role</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-[#121214] border border-[#27272a] text-xs text-zinc-200 outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="Lead Investigator">Lead Investigator</option>
                      <option value="Security Analyst">Security Analyst</option>
                      <option value="Threat Hunter">Threat Hunter</option>
                      <option value="SOC Incident Responder">SOC Incident Responder</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="mt-1 py-1.5 px-3 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Profile</span>
                </button>
              </form>

              {/* Password Management */}
              <form onSubmit={handleChangePassword} className="bg-[#18181b] border border-[#27272a] p-4 rounded-md space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white font-mono">
                  <Lock className="w-4 h-4 text-sky-400" />
                  <span>CHANGE PASSWORD</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-zinc-400 font-medium mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-[#121214] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 font-medium mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••••••"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md bg-[#121214] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 font-medium mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••••••"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md bg-[#121214] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="mt-1 py-1.5 px-3 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Update Password</span>
                </button>
              </form>

              {/* Active Session & Sign Out Button */}
              <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-md flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Active Analyst Session</span>
                  <span className="text-[10px] text-zinc-400 font-mono block">Logged in as {currentUser?.email || 'analyst'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold rounded-md transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: BYO-API & Social Settings Form */}
          {(activeTab === 'ai' || activeTab === 'social') && (
            <form onSubmit={handleSaveBYO} className="space-y-4">
              {byoError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-md text-xs text-rose-300">
                  {byoError}
                </div>
              )}

              {byoSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-md text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Configuration saved successfully!</span>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2 font-mono">
                      AI PROVIDER MODEL
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setProvider('gemini')}
                        className={`p-3 rounded-md border cursor-pointer transition ${
                          provider === 'gemini'
                            ? 'bg-[#27272a] border-sky-500/80 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Google Gemini Free Tier
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                          Recommended for OSINT analysis & graph summaries.
                        </p>
                      </div>

                      <div
                        onClick={() => setProvider('ollama')}
                        className={`p-3 rounded-md border cursor-pointer transition ${
                          provider === 'ollama'
                            ? 'bg-[#27272a] border-sky-500/80 text-white'
                            : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Local Ollama Model
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                          100% offline local air-gapped LLM.
                        </p>
                      </div>
                    </div>
                  </div>

                  {provider === 'gemini' ? (
                    <div className="space-y-2 bg-[#18181b] border border-[#27272a] p-4 rounded-md">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-200">Google Gemini API Key</label>
                        {hasGeminiKey && (
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Configured ({maskedGeminiKey})
                          </span>
                        )}
                      </div>
                      <input
                        type="password"
                        placeholder={hasGeminiKey ? "Enter new API key to overwrite..." : "AIzaSy..."}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                      />
                      <p className="text-[10px] text-zinc-400 flex items-center justify-between pt-1">
                        <span>Free key available at Google AI Studio.</span>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1"
                        >
                          Get Gemini API Key <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-[#18181b] border border-[#27272a] p-4 rounded-md">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-200 mb-1">Ollama Host URL</label>
                        <input
                          type="text"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-200 mb-1">Ollama Model Name</label>
                        <input
                          type="text"
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-3">
                  <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-200">Apify API Token (Scraper API)</label>
                      {hasApifyToken && (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Configured ({maskedApifyToken})
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      placeholder={hasApifyToken ? "Enter new token to overwrite..." : "apify_api_..."}
                      value={apifyToken}
                      onChange={(e) => setApifyToken(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>

                  <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-200">HIBP Threat Intel API Key</label>
                      {hasHibpKey && (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Configured ({maskedHibpKey})
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      placeholder={hasHibpKey ? "Enter new key to overwrite..." : "hibp_key_..."}
                      value={hibpKey}
                      onChange={(e) => setHibpKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingBYO}
                  className="py-2 px-4 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all shadow-none flex items-center justify-center gap-1.5 cursor-pointer w-full disabled:opacity-50"
                >
                  {savingBYO ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving Configuration...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-white" />
                      <span>Save Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
