import React, { useState } from 'react';
import { X, Plus, FolderPlus, Globe } from 'lucide-react';
import type { EntityType } from '../types';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, target: string, type: string) => void;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({ isOpen, onClose, onSubmit }) => {
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1322] border border-[#1f293d] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#1f293d] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <FolderPlus className="w-4 h-4" /> Create New Investigation Case
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Case Title</label>
            <input
              type="text"
              placeholder="e.g. Example Corp Investigation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 focus:border-sky-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target</label>
            <input
              type="text"
              placeholder="e.g. hashicorp.com, elonmusk, or 192.168.1.1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 focus:border-sky-500 focus:outline-none font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Investigation Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 focus:border-sky-500 focus:outline-none"
            >
              <option value="Domain Investigation">Domain Investigation</option>
              <option value="Username / Persona Reconnaissance">Username / Persona Reconnaissance</option>
              <option value="Network Infrastructure Audit">Network Infrastructure Audit</option>
              <option value="Corporate Threat Profiling">Corporate Threat Profiling</option>
              <option value="Person of Interest Analysis">Person of Interest Analysis</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition shadow"
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1322] border border-[#1f293d] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#1f293d] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <Plus className="w-4 h-4" /> Create Manual Entity Node
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 focus:border-sky-500 focus:outline-none"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Entity Value</label>
            <input
              type="text"
              placeholder="Enter domain, IP, person name..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 focus:border-sky-500 focus:outline-none font-mono"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition shadow"
            >
              Add Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
