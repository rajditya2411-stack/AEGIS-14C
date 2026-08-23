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

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
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
    <div className="min-h-screen w-screen bg-[#07080f] flex items-center justify-center p-4 select-none font-sans relative overflow-hidden">
      {/* Subtle Background Glow Accent */}
      <div className="absolute w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      {/* Main Authentication Box */}
      <div className="w-full max-w-md bg-[#121214] border border-[#27272a] rounded-lg shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Banner */}
        <div className="p-6 border-b border-[#27272a] bg-[#18181b] text-center space-y-2">
          <div className="w-12 h-12 rounded-md bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-white mx-auto shadow-sm">
            <ShieldAlert className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide font-mono flex items-center justify-center gap-2">
              TRACE OSINT PLATFORM
              <span className="text-[10px] font-mono bg-sky-950/80 text-sky-300 border border-sky-800/60 px-1.5 py-0.5 rounded">
                v3.5
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Enterprise Threat Reconnaissance & Intelligence
            </p>
          </div>
        </div>

        {/* Tab Switcher (Sign In vs Create Account) */}
        <div className="grid grid-cols-2 p-1.5 bg-[#09090b] border-b border-[#27272a] gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'login'
                ? 'bg-[#27272a] text-white border border-[#3f3f46] shadow-sm'
                : 'text-zinc-400 hover:text-white border border-transparent'
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
            className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'register'
                ? 'bg-[#27272a] text-white border border-[#3f3f46] shadow-sm'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" /> Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-md text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1 font-mono">
                  DISPLAY / ANALYST NAME
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Mercer"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1 font-mono">
                  RECON ROLE / DESIGNATION
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-zinc-200 outline-none focus:border-sky-500 cursor-pointer"
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
            <label className="block text-[11px] text-zinc-400 font-medium mb-1 font-mono">
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="analyst@tracex.osint"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 font-medium mb-1 font-mono">
              ACCOUNT PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-md bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Authenticating Analyst...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Access Workspace' : 'Create & Access Account'}</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Demo Fast-Login Shortcut */}
        <div className="px-6 py-4 border-t border-[#27272a] bg-[#18181b] flex items-center justify-between">
          <div className="text-[10px] text-zinc-400 font-mono">
            <span>Quick Evaluation?</span>
          </div>
          <button
            type="button"
            onClick={handleUseDemo}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Demo Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
