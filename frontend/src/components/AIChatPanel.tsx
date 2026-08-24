import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Key, 
  Bot, 
  ChevronRight, 
  ShieldAlert, 
  Zap, 
  Loader2
} from 'lucide-react';
import type { Investigation } from '../types';
import * as api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface AIChatPanelProps {
  activeCase: Investigation | null;
  isOpen: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  modelUsed?: string;
  isError?: boolean;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  activeCase,
  isOpen,
  onToggleCollapse,
  onOpenSettings
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [isConfigured, setIsConfigured] = useState(false);
  const [providerName, setProviderName] = useState('Gemini');
  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const checkConfig = async () => {
    try {
      const cfg = await api.fetchAIConfig();
      setIsConfigured(cfg.is_configured || false);
      setProviderName(cfg.provider === 'gemini' ? 'Google Gemini' : 'Local Ollama');
    } catch (err) {
      console.error('Error checking AI config:', err);
    }
  };

  useEffect(() => {
    checkConfig();
  }, [isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const strId = () => Math.random().toString(36).substring(2, 9);

  const handleSendQuery = async (customQuery?: string) => {
    const textToSend = customQuery || queryInput;
    if (!textToSend.trim() || !activeCase || loading) return;

    const userMsg: ChatMessage = {
      id: strId(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setQueryInput('');
    setLoading(true);

    try {
      const res = await api.analyzeInvestigation(activeCase.id, textToSend);

      if (!res.is_configured) {
        setIsConfigured(false);
      }

      const aiMsg: ChatMessage = {
        id: strId(),
        sender: 'ai',
        text: res.analysis || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.model_used,
        isError: !res.success
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: strId(),
        sender: 'ai',
        text: `Error executing analysis: ${err.message || 'API call failed.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (promptText: string) => {
    handleSendQuery(promptText);
  };

  if (!isOpen) return null;

  return (
    <aside className={`w-80 sm:w-96 border-l flex flex-col h-screen select-none shrink-0 z-20 shadow-2xl font-sans transition-colors duration-200 ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09090b] border-[#27272a] text-white'
    }`}>
      {/* Panel Header */}
      <div className={`p-3.5 border-b flex items-center justify-between ${
        isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#121214] border-[#27272a]'
      }`}>
        <div className="flex items-center gap-2 truncate">
          <div className={`w-7 h-7 rounded-sm border flex items-center justify-center ${
            isLight ? 'bg-white border-slate-300 text-sky-600' : 'bg-[#18181b] border-[#27272a] text-sky-400'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold text-xs tracking-wide flex items-center gap-1.5 font-mono ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              TRACE AI Assistant
              {isConfigured && (
                <span className={`text-[9px] font-mono font-normal px-1.5 py-0.5 rounded border ${
                  isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-[#27272a] text-sky-300 border-[#3f3f46]'
                }`}>
                  {providerName}
                </span>
              )}
            </h3>
            <p className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Grounded Graph Intelligence</p>
          </div>
        </div>

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          title="Collapse AI Chat Panel"
          className={`p-1.5 rounded-sm transition cursor-pointer ${
            isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-[#18181b]'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Unconfigured State Banner */}
        {!isConfigured && (
          <div className={`border p-3.5 rounded-sm space-y-2 text-xs ${
            isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
          }`}>
            <div className="flex items-center gap-2 font-semibold text-amber-600">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>BYO-API Key Required</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              AI Analysis runs using your <strong>Google Gemini API key (Free)</strong> or local <strong>Ollama</strong> instance.
            </p>
            <button
              onClick={onOpenSettings}
              className="w-full mt-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-1.5 px-3 rounded-sm transition flex items-center justify-center gap-1.5 shadow-sm text-xs cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" /> Configure API Settings
            </button>
          </div>
        )}

        {/* Quick Action Presets */}
        {isConfigured && activeCase && messages.length === 0 && (
          <div className="space-y-2">
            <span className={`text-[10px] font-bold font-mono uppercase tracking-wider block ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}>
              SUGGESTED PROMPTS
            </span>
            <div className="space-y-1.5">
              <button
                onClick={() => handlePresetClick("Perform a full threat analysis of this target infrastructure.")}
                className={`w-full text-left p-2.5 rounded-sm text-xs transition flex items-center gap-2 cursor-pointer border ${
                  isLight
                    ? 'bg-[#f8fafc] hover:bg-slate-100 border-slate-200 text-slate-800'
                    : 'bg-[#121214] hover:bg-[#18181b] border-[#27272a] text-zinc-200'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
                <span>Full Infrastructure Analysis</span>
              </button>
              <button
                onClick={() => handlePresetClick("What shared tracking IDs or AdSense publisher IDs were found?")}
                className={`w-full text-left p-2.5 rounded-sm text-xs transition flex items-center gap-2 cursor-pointer border ${
                  isLight
                    ? 'bg-[#f8fafc] hover:bg-slate-100 border-slate-200 text-slate-800'
                    : 'bg-[#121214] hover:bg-[#18181b] border-[#27272a] text-zinc-200'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                <span>Find Shared Analytics & Trackers</span>
              </button>
              <button
                onClick={() => handlePresetClick("Summarize all corporate ownership and sister properties.")}
                className={`w-full text-left p-2.5 rounded-sm text-xs transition flex items-center gap-2 cursor-pointer border ${
                  isLight
                    ? 'bg-[#f8fafc] hover:bg-slate-100 border-slate-200 text-slate-800'
                    : 'bg-[#121214] hover:bg-[#18181b] border-[#27272a] text-zinc-200'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span>Corporate Ownership Summary</span>
              </button>
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3 rounded-sm text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? isLight ? 'bg-slate-900 text-white rounded-br-none shadow-sm' : 'bg-sky-600 text-white rounded-br-none shadow-sm'
                    : msg.isError
                    ? isLight ? 'bg-rose-50 border border-rose-300 text-rose-800 rounded-bl-none' : 'bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-bl-none'
                    : isLight ? 'bg-[#f8fafc] border border-slate-200 text-slate-800 rounded-bl-none shadow-sm' : 'bg-[#121214] border border-[#27272a] text-zinc-200 rounded-bl-none'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold mb-1 border-b pb-1 ${
                    isLight ? 'text-sky-700 border-slate-200' : 'text-sky-400 border-[#27272a]'
                  }`}>
                    <Bot className="w-3.5 h-3.5" />
                    <span>TRACE AI ({msg.modelUsed || providerName})</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <span className="text-[9px] font-mono opacity-60 block text-right mt-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className={`flex items-center gap-2 text-xs font-mono p-3 rounded-sm border ${
              isLight ? 'bg-[#f8fafc] border-slate-200 text-sky-700' : 'bg-[#121214] border-[#27272a] text-sky-400'
            }`}>
              <Loader2 className={`w-4 h-4 animate-spin ${isLight ? 'text-sky-700' : 'text-sky-400'}`} />
              <span>Analyzing investigation knowledge graph...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className={`p-3 border-t ${isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#09090b] border-[#27272a]'}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={isConfigured ? "Ask TRACE AI analyst..." : "API key required to chat..."}
            disabled={!isConfigured || loading}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className={`flex-1 text-xs rounded-sm p-2 focus:outline-none disabled:opacity-50 border ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                : 'bg-[#18181b] border-[#27272a] text-white focus:border-sky-500'
            }`}
          />
          <button
            type="submit"
            disabled={!isConfigured || loading || !queryInput.trim()}
            className={`p-2 rounded-sm transition disabled:opacity-50 shrink-0 cursor-pointer text-white shadow-sm ${
              isLight ? 'bg-slate-900 hover:bg-slate-800' : 'bg-sky-600 hover:bg-sky-500'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
