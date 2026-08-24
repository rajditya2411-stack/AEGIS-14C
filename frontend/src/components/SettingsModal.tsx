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
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import * as api from '../lib/api';
import type { User } from '../types';
import { useTheme } from '../context/ThemeContext';

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
  const { theme, setTheme } = useTheme();
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

  const isLight = theme === 'light';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none font-sans">
      <div className={`w-full max-w-xl rounded-sm border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121214] border-[#27272a] text-zinc-100'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <div className="flex items-center gap-2">
            <KeyRound className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            <h3 className={`font-bold text-xs tracking-wide font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
              TRACE Settings & BYO-API Management
            </h3>
          </div>
          <button onClick={onClose} className={`transition cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
          }`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top-Level Segmented Control Navigation Tabs */}
        <div className={`grid grid-cols-3 p-1.5 border-b gap-1 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`py-1.5 px-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'account'
                ? isLight
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-[#27272a] text-white border-[#3f3f46]'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 border-transparent'
                  : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <UserIcon className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} /> Account & Security
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-1.5 px-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'ai'
                ? isLight
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-[#27272a] text-white border-[#3f3f46]'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 border-transparent'
                  : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} /> AI Model Keys
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('social')}
            className={`py-1.5 px-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'social'
                ? isLight
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-[#27272a] text-white border-[#3f3f46]'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 border-transparent'
                  : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} /> Social & BYO-API
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* TAB 1: Account & Security Management */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              {accountMessage && (
                <div
                  className={`p-3 rounded-sm text-xs flex items-center gap-2 border ${
                    accountMessage.type === 'success'
                      ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : isLight ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {accountMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{accountMessage.text}</span>
                </div>
              )}

              {/* Appearance & Workspace Theme Mode */}
              <div className={`border p-4 rounded-sm space-y-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200 text-slate-900' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`flex items-center justify-between border-b pb-2 ${
                  isLight ? 'border-slate-200' : 'border-[#27272a]'
                }`}>
                  <div className={`flex items-center gap-2 text-xs font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>APPEARANCE & THEME MODE</span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm border ${
                    isLight ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-black border-stone-200'
                  }`}>
                    {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-sm border flex items-center justify-between transition cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-zinc-800 border-white text-white font-bold ring-1 ring-white/50 shadow-sm'
                        : isLight
                        ? 'bg-white border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400'
                        : 'bg-[#121214] border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-sky-400' : 'text-slate-400'}`} />
                      <div className="text-left">
                        <p className="text-xs font-bold font-mono">Obsidian Dark</p>
                        <p className={`text-[10px] ${theme === 'dark' ? 'text-zinc-300' : 'text-slate-500'}`}>Deep obsidian command HUD</p>
                      </div>
                    </div>
                    {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-sm border flex items-center justify-between transition cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white border-slate-900 text-slate-900 font-bold ring-1 ring-slate-900/50 shadow-sm'
                        : 'bg-[#121214] border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <div className="text-left">
                        <p className="text-xs font-bold font-mono">Clean Light</p>
                        <p className={`text-[10px] ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>High-contrast white theme</p>
                      </div>
                    </div>
                    {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </button>
                </div>
              </div>

              {/* User Profile Card */}
              <form onSubmit={handleUpdateProfile} className={`border p-4 rounded-sm space-y-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200 text-slate-900' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`flex items-center justify-between border-b pb-3 ${
                  isLight ? 'border-slate-200' : 'border-[#27272a]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold font-mono text-sm ${
                      isLight ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-sky-500/20 border-sky-400/40 text-sky-400'
                    }`}>
                      {currentUser?.display_name ? currentUser.display_name.substring(0, 2).toUpperCase() : 'TR'}
                    </div>
                    <div>
                      <h4 className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentUser?.display_name || 'Recon Analyst'}</h4>
                      <p className={`text-[10px] font-mono flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        <Mail className="w-3 h-3 text-zinc-400" /> {currentUser?.email || 'analyst@tracex.osint'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm border ${
                    isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                  }`}>
                    {currentUser?.role || 'Lead Investigator'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className={`block text-[11px] font-medium mb-1 font-mono ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                          : 'bg-[#121214] border-[#27272a] text-white focus:border-sky-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-medium mb-1 font-mono ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>Recon Role</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none cursor-pointer border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                          : 'bg-[#121214] border-[#27272a] text-zinc-200 focus:border-sky-500'
                      }`}
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
                  className={`mt-1 py-1.5 px-3 rounded-sm font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border ${
                    isLight
                      ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                      : 'bg-[#27272a] hover:bg-[#3f3f46] text-white border-[#3f3f46]'
                  }`}
                >
                  {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Profile</span>
                </button>
              </form>

              {/* Password Management */}
              <form onSubmit={handleChangePassword} className={`border p-4 rounded-sm space-y-3 ${
                isLight ? 'bg-[#f8fafc] border-slate-200 text-slate-900' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div className={`flex items-center gap-2 text-xs font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Lock className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
                  <span>CHANGE PASSWORD</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                          : 'bg-[#121214] border-[#27272a] text-white focus:border-sky-500'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>New Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••••••"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none border ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                            : 'bg-[#121214] border-[#27272a] text-white focus:border-sky-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>Confirm New Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••••••"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none border ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                            : 'bg-[#121214] border-[#27272a] text-white focus:border-sky-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className={`mt-1 py-1.5 px-3 rounded-sm font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border ${
                    isLight
                      ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                      : 'bg-[#27272a] hover:bg-[#3f3f46] text-white border-[#3f3f46]'
                  }`}
                >
                  {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Update Password</span>
                </button>
              </form>

              {/* Active Session & Sign Out Button */}
              <div className={`border p-3.5 rounded-sm flex items-center justify-between ${
                isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>Active Analyst Session</span>
                  <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Logged in as {currentUser?.email || 'analyst'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-sm transition cursor-pointer ${
                    isLight
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                      : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/40'
                  }`}
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
                <div className={`p-3 border rounded-sm text-xs ${
                  isLight ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  {byoError}
                </div>
              )}

              {byoSuccess && (
                <div className={`p-3 border rounded-sm text-xs flex items-center gap-2 ${
                  isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                }`}>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Configuration saved successfully!</span>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 font-mono ${
                      isLight ? 'text-slate-600' : 'text-zinc-400'
                    }`}>
                      AI PROVIDER MODEL
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setProvider('gemini')}
                        className={`p-3 rounded-sm border cursor-pointer transition ${
                          provider === 'gemini'
                            ? isLight
                              ? 'bg-sky-50 border-sky-500 text-slate-900'
                              : 'bg-[#27272a] border-sky-500/80 text-white'
                            : isLight
                              ? 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                              : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-sky-600" /> Google Gemini Free Tier
                        </div>
                        <p className={`text-[10px] mt-1 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Recommended for OSINT analysis & graph summaries.
                        </p>
                      </div>

                      <div
                        onClick={() => setProvider('ollama')}
                        className={`p-3 rounded-sm border cursor-pointer transition ${
                          provider === 'ollama'
                            ? isLight
                              ? 'bg-emerald-50 border-emerald-500 text-slate-900'
                              : 'bg-[#27272a] border-sky-500/80 text-white'
                            : isLight
                              ? 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                              : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Cpu className="w-3.5 h-3.5 text-emerald-600" /> Local Ollama Model
                        </div>
                        <p className={`text-[10px] mt-1 leading-normal ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          100% offline local air-gapped LLM.
                        </p>
                      </div>
                    </div>
                  </div>

                  {provider === 'gemini' ? (
                    <div className={`space-y-2 border p-4 rounded-sm ${
                      isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Google Gemini API Key</label>
                        {hasGeminiKey && (
                          <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 font-bold">
                            <ShieldCheck className="w-3 h-3" /> Configured ({maskedGeminiKey})
                          </span>
                        )}
                      </div>
                      <input
                        type="password"
                        placeholder={hasGeminiKey ? "Enter new API key to overwrite..." : "AIzaSy..."}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none border ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                            : 'bg-[#18181b] border-[#27272a] text-white focus:border-sky-500'
                        }`}
                      />
                      <p className={`text-[10px] flex items-center justify-between pt-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        <span>Free key available at Google AI Studio.</span>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          Get Gemini API Key <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                  ) : (
                    <div className={`space-y-3 border p-4 rounded-sm ${
                      isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
                    }`}>
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Ollama Host URL</label>
                        <input
                          type="text"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none border ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                              : 'bg-[#18181b] border-[#27272a] text-white focus:border-sky-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Ollama Model Name</label>
                        <input
                          type="text"
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none border ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                              : 'bg-[#18181b] border-[#27272a] text-white focus:border-sky-500'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-3">
                  <div className={`border p-3.5 rounded-sm space-y-2 ${
                    isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Apify API Token (Scraper API)</label>
                      {hasApifyToken && (
                        <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 font-bold">
                          <ShieldCheck className="w-3 h-3" /> Configured ({maskedApifyToken})
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      placeholder={hasApifyToken ? "Enter new token to overwrite..." : "apify_api_..."}
                      value={apifyToken}
                      onChange={(e) => setApifyToken(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                          : 'bg-[#18181b] border-[#27272a] text-white focus:border-sky-500'
                      }`}
                    />
                  </div>

                  <div className={`border p-3.5 rounded-sm space-y-2 ${
                    isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>HIBP Threat Intel API Key</label>
                      {hasHibpKey && (
                        <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 font-bold">
                          <ShieldCheck className="w-3 h-3" /> Configured ({maskedHibpKey})
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      placeholder={hasHibpKey ? "Enter new key to overwrite..." : "hibp_key_..."}
                      value={hibpKey}
                      onChange={(e) => setHibpKey(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-sm text-xs outline-none focus:outline-none border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                          : 'bg-[#18181b] border-[#27272a] text-white focus:border-sky-500'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingBYO}
                  className={`py-2 px-4 rounded-sm font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer w-full disabled:opacity-50 ${
                    isLight ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
                  }`}
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
