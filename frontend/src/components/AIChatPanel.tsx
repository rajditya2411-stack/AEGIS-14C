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
    <aside className="w-80 sm:w-96 bg-[#09090b] border-l border-[#27272a] flex flex-col h-screen select-none shrink-0 z-20 shadow-2xl font-sans">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[#27272a] flex items-center justify-between bg-[#121214]">
        <div className="flex items-center gap-2 truncate">
          <div className="w-7 h-7 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs tracking-wide flex items-center gap-1.5 font-mono">
              TRACE AI Assistant
              {isConfigured && (
                <span className="text-[9px] font-mono font-normal bg-[#27272a] text-sky-300 border border-[#3f3f46] px-1.5 py-0.5 rounded">
                  {providerName}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono">Grounded Graph Intelligence</p>
          </div>
        </div>

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          title="Collapse AI Chat Panel"
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#18181b] rounded-md transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Unconfigured State Banner */}
        {!isConfigured && (
          <div className="bg-amber-950/30 border border-amber-500/40 p-3.5 rounded-md space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>BYO-API Key Required</span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              AI Analysis runs using your <strong>Google Gemini API key (Free)</strong> or local <strong>Ollama</strong> instance.
            </p>
            <button
              onClick={onOpenSettings}
              className="w-full mt-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-1.5 px-3 rounded-md transition flex items-center justify-center gap-1.5 shadow-sm text-xs cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" /> Configure API Settings
            </button>
          </div>
        )}

        {/* Quick Action Presets */}
        {isConfigured && activeCase && messages.length === 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-wider block">
              SUGGESTED PROMPTS
            </span>
            <div className="space-y-1.5">
              <button
                onClick={() => handlePresetClick("Perform a full threat analysis of this target infrastructure.")}
                className="w-full text-left p-2.5 bg-[#121214] hover:bg-[#18181b] border border-[#27272a] hover:border-sky-500/40 rounded-md text-xs text-zinc-200 transition flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Full Infrastructure Analysis</span>
              </button>
              <button
                onClick={() => handlePresetClick("What shared tracking IDs or AdSense publisher IDs were found?")}
                className="w-full text-left p-2.5 bg-[#121214] hover:bg-[#18181b] border border-[#27272a] hover:border-sky-500/40 rounded-md text-xs text-zinc-200 transition flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Find Shared Analytics & Trackers</span>
              </button>
              <button
                onClick={() => handlePresetClick("Summarize all corporate ownership and sister properties.")}
                className="w-full text-left p-2.5 bg-[#121214] hover:bg-[#18181b] border border-[#27272a] hover:border-sky-500/40 rounded-md text-xs text-zinc-200 transition flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
                className={`max-w-[88%] p-3 rounded-md text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-sky-600 text-white rounded-br-none shadow-sm'
                    : msg.isError
                    ? 'bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-bl-none'
                    : 'bg-[#121214] border border-[#27272a] text-zinc-200 rounded-bl-none'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-400 font-bold mb-1 border-b border-[#27272a] pb-1">
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
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400 bg-[#121214] p-3 rounded-md border border-[#27272a]">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Analyzing investigation knowledge graph...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[#09090b] border-t border-[#27272a]">
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
            className="flex-1 bg-[#18181b] border border-[#27272a] text-white text-xs rounded-md p-2 focus:border-sky-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isConfigured || loading || !queryInput.trim()}
            className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
