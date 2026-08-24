import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import * as api from '../lib/api';
import type { User } from '../types';
import { useTheme } from '../context/ThemeContext';

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Lead Investigator');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await api.loginUser({ email: email.trim(), password });
        onAuthenticated(res.user);
      } else {
        const res = await api.registerUser({
          email: email.trim(),
          password,
          display_name: displayName.trim() || 'Recon Analyst',
          role
        });
        onAuthenticated(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemo = async () => {
    setEmail('demo_analyst@tracex.osint');
    setPassword('DemoTracePass123!');
    setDisplayName('Demo Recon Investigator');
    setLoading(true);
    setError(null);

    try {
      // Try login first; if demo account does not exist, register it automatically
      try {
        const res = await api.loginUser({
          email: 'demo_analyst@tracex.osint',
          password: 'DemoTracePass123!'
        });
        onAuthenticated(res.user);
      } catch {
        const res = await api.registerUser({
          email: 'demo_analyst@tracex.osint',
          password: 'DemoTracePass123!',
          display_name: 'Demo Recon Investigator',
          role: 'Lead Threat Hunter'
        });
        onAuthenticated(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-screen flex items-center justify-center p-4 select-none font-sans relative overflow-hidden transition-colors duration-200 ${
      isLight ? 'bg-slate-100' : 'bg-[#07080f]'
    }`}>
      {/* Subtle Background Glow Accent */}
      <div className={`absolute w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none -top-20 -left-20 ${
        isLight ? 'bg-sky-200/40' : 'bg-sky-500/5'
      }`} />
      <div className={`absolute w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 ${
        isLight ? 'bg-purple-200/40' : 'bg-purple-500/5'
      }`} />

      {/* Main Authentication Box */}
      <div className={`w-full max-w-md border rounded-sm shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200 ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121214] border-[#27272a] text-white'
      }`}>
        {/* Brand Banner */}
        <div className={`p-6 border-b text-center space-y-2 ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <div className={`w-12 h-12 rounded-sm border flex items-center justify-center mx-auto shadow-sm ${
            isLight ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-stone-200 text-black'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-wide font-mono flex items-center justify-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              TRACE OSINT PLATFORM
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${
                isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-white text-black border-stone-200'
              }`}>
                v3.5
              </span>
            </h1>
            <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Enterprise Threat Reconnaissance & Intelligence
            </p>
          </div>
        </div>

        {/* Tab Switcher (Sign In vs Create Account) */}
        <div className={`grid grid-cols-2 p-1.5 border-b gap-1 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 px-3 rounded-sm text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              mode === 'login'
                ? isLight
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-white text-black border-stone-200 shadow-sm'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 border-transparent'
                  : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 px-3 rounded-sm text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              mode === 'register'
                ? isLight
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : 'bg-white text-black border-stone-200 shadow-sm'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 border-transparent'
                  : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" /> Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className={`p-3 border rounded-sm text-xs flex items-start gap-2 ${
              isLight ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className={`block text-[11px] font-medium mb-1 font-mono ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                  DISPLAY / ANALYST NAME
                </label>
                <div className="relative">
                  <UserIcon className={`w-4 h-4 absolute left-3 top-2.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Mercer"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 rounded-sm text-xs outline-none focus:outline-none border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                        : 'bg-[#18181b] border-[#27272a] text-white focus:border-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 font-mono ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                  RECON ROLE / DESIGNATION
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={`w-full px-3 py-2 rounded-sm text-xs outline-none focus:outline-none cursor-pointer border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                      : 'bg-[#18181b] border-[#27272a] text-zinc-200 focus:border-white'
                  }`}
                >
                  <option value="Lead Investigator">Lead Investigator</option>
                  <option value="Security Analyst">Security Analyst</option>
                  <option value="Threat Hunter">Threat Hunter</option>
                  <option value="SOC Incident Responder">SOC Incident Responder</option>
                  <option value="OSINT Researcher">OSINT Researcher</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className={`block text-[11px] font-medium mb-1 font-mono ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 absolute left-3 top-2.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
              <input
                type="email"
                required
                placeholder="analyst@tracex.osint"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-sm text-xs outline-none focus:outline-none border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                    : 'bg-[#18181b] border-[#27272a] text-white focus:border-white'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-medium mb-1 font-mono ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              ACCOUNT PASSWORD
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3 top-2.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-sm text-xs outline-none focus:outline-none border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                    : 'bg-[#18181b] border-[#27272a] text-white focus:border-white'
                }`}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 px-4 rounded-sm font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border ${
                isLight
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                  : 'bg-white hover:bg-stone-100 text-black border-stone-200'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className={`w-4 h-4 animate-spin ${isLight ? 'text-white' : 'text-black'}`} />
                  <span>Authenticating Analyst...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Access Workspace' : 'Create & Access Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Demo Fast-Login Shortcut */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            <span>Quick Evaluation?</span>
          </div>
          <button
            type="button"
            onClick={handleUseDemo}
            disabled={loading}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm font-bold transition cursor-pointer disabled:opacity-50 shadow-sm border ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300'
                : 'text-black bg-white hover:bg-stone-100 border-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>1-Click Demo Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
