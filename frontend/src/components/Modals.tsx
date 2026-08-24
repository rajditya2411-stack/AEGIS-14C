import React, { useState } from 'react';
import { X, Plus, FolderPlus, Globe } from 'lucide-react';
import type { EntityType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, target: string, type: string) => void;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [type, setType] = useState('Domain Investigation');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !target.trim()) return;
    onSubmit(title, target, type);
    setTitle('');
    setTarget('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className={`border rounded-sm w-full max-w-md shadow-2xl overflow-hidden ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121214] border-[#27272a] text-zinc-100'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-xs font-mono tracking-wide">
            <FolderPlus className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            <span className={isLight ? 'text-slate-900' : 'text-white'}>Create New Investigation Case</span>
          </div>
          <button onClick={onClose} className={`transition cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
          }`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Case Title</label>
            <input
              type="text"
              placeholder="e.g. Example Corp Investigation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full text-xs rounded-sm p-2.5 focus:outline-none border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                  : 'bg-[#18181b] border-[#27272a] text-slate-100 focus:border-sky-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Target</label>
            <input
              type="text"
              placeholder="e.g. hashicorp.com, elonmusk, or 192.168.1.1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={`w-full text-xs rounded-sm p-2.5 focus:outline-none font-mono border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                  : 'bg-[#18181b] border-[#27272a] text-slate-100 focus:border-sky-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Investigation Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={`w-full text-xs rounded-sm p-2.5 focus:outline-none border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                  : 'bg-[#18181b] border-[#27272a] text-slate-100 focus:border-sky-500'
              }`}
            >
              <option value="Domain Investigation">Domain Investigation</option>
              <option value="Username / Persona Reconnaissance">Username / Persona Reconnaissance</option>
              <option value="Network Infrastructure Audit">Network Infrastructure Audit</option>
              <option value="Corporate Threat Profiling">Corporate Threat Profiling</option>
              <option value="Person of Interest Analysis">Person of Interest Analysis</option>
            </select>
          </div>

          <div className={`flex justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-[#27272a]'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-sm transition cursor-pointer border ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 border-slate-300 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-bold text-white rounded-sm transition shadow-sm cursor-pointer ${
                isLight ? 'bg-slate-900 hover:bg-slate-800' : 'bg-sky-600 hover:bg-sky-500'
              }`}
            >
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


interface NewEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entityType: EntityType, value: string) => void;
}

export const NewEntityModal: React.FC<NewEntityModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [entityType, setEntityType] = useState<EntityType>('DOMAIN');
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(entityType, value);
    setValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className={`border rounded-sm w-full max-w-md shadow-2xl overflow-hidden ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121214] border-[#27272a] text-zinc-100'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-xs font-mono tracking-wide">
            <Plus className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            <span className={isLight ? 'text-slate-900' : 'text-white'}>Create Manual Entity Node</span>
          </div>
          <button onClick={onClose} className={`transition cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
          }`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className={`w-full text-xs rounded-sm p-2.5 focus:outline-none border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                  : 'bg-[#18181b] border-[#27272a] text-slate-100 focus:border-sky-500'
              }`}
            >
              <option value="DOMAIN">DOMAIN (e.g. api.example.com)</option>
              <option value="IP ADDRESS">IP ADDRESS (e.g. 192.168.1.1)</option>
              <option value="EMAIL">EMAIL (e.g. john@example.com)</option>
              <option value="PERSON">PERSON (e.g. John Doe)</option>
              <option value="ORGANIZATION">ORGANIZATION (e.g. Example Corp)</option>
              <option value="USERNAME">USERNAME (e.g. johndoe)</option>
              <option value="REPOSITORY">REPOSITORY (e.g. github.com/example/repo)</option>
              <option value="URL">URL (e.g. https://example.com/login)</option>
              <option value="CERTIFICATE">CERTIFICATE (e.g. SHA-256 Fingerprint)</option>
              <option value="ASN">ASN (e.g. AS13335)</option>
              <option value="TRACKING_ID">TRACKING_ID (e.g. UA-XXXXX, pub-XXXXX)</option>
              <option value="PHONE">PHONE (e.g. +1 800 555 0199)</option>
            </select>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Entity Value</label>
            <input
              type="text"
              placeholder="Enter domain, IP, person name..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`w-full text-xs rounded-sm p-2.5 focus:outline-none font-mono border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-900'
                  : 'bg-[#18181b] border-[#27272a] text-slate-100 focus:border-sky-500'
              }`}
              required
            />
          </div>

          <div className={`flex justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-[#27272a]'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-sm transition cursor-pointer border ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 border-slate-300 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-bold text-white rounded-sm transition shadow-sm cursor-pointer ${
                isLight ? 'bg-slate-900 hover:bg-slate-800' : 'bg-sky-600 hover:bg-sky-500'
              }`}
            >
              Add Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
