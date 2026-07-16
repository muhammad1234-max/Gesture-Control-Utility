/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  FolderOpen,
  Settings2,
  FileJson
} from 'lucide-react';
import { AppProfile } from '../types';

interface ProfileViewProps {
  profiles: AppProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string, desc: string) => void;
  onDeleteProfile: (id: string) => void;
  onImportProfile: (profileJson: string) => boolean;
  onExportProfile: (profile: AppProfile) => string;
}

export default function ProfileView({
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onImportProfile,
  onExportProfile
}: ProfileViewProps) {
  const [copied, setCopied] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  
  const [importJson, setImportJson] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onCreateProfile(newProfileName.trim(), newProfileDesc.trim() || 'Custom user configuration profile.');
    setNewProfileName('');
    setNewProfileDesc('');
  };

  const handleCopyJson = () => {
    const jsonStr = onExportProfile(activeProfile);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadJson = () => {
    const jsonStr = onExportProfile(activeProfile);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeProfile.name.toLowerCase().replace(/\s+/g, '_')}_config.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJson.trim()) return;

    const success = onImportProfile(importJson);
    if (success) {
      setImportFeedback({ type: 'success', message: 'Configuration loaded successfully.' });
      setImportJson('');
    } else {
      setImportFeedback({ type: 'error', message: 'Invalid profile configuration schema.' });
    }

    setTimeout(() => {
      setImportFeedback(null);
    }, 4000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-semibold text-slate-100 tracking-tight">
          Configuration Profiles
        </h2>
        <p className="text-[13px] text-slate-400 mt-1">
          Manage system configurations, profiles, and environment mappings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Profiles Management */}
        <div className="space-y-6 flex flex-col h-full">
          {/* List Panel */}
          <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-2 border-b border-slate-800/60 bg-[#14171d]">
              <FolderOpen className="w-4 h-4 text-emerald-500" />
              <h3 className="text-[13px] font-semibold text-slate-200">
                Configuration Presets
              </h3>
            </div>

            <div className="p-6 bg-[#0c0e12] flex-1">
              <div className="space-y-3">
                {profiles.map((p) => {
                  const isActive = p.id === activeProfileId;
                  return (
                    <div 
                      key={p.id}
                      onClick={() => onSelectProfile(p.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isActive 
                          ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm' 
                          : 'bg-[#14171d] border-slate-800/60 hover:border-slate-700/80 hover:bg-slate-800/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className={`text-[14px] font-semibold ${isActive ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {p.name}
                          </span>
                          {p.isDefault && (
                            <span className="text-[10px] font-medium bg-slate-800/80 border border-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">
                              System
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-slate-500 block max-w-[280px] truncate">{p.description}</span>
                      </div>

                      <div className="flex items-center gap-4 pl-4 shrink-0">
                        {isActive && <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                        
                        {!p.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProfile(p.id);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-800/80 rounded-lg cursor-pointer"
                            title="Delete Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Create Form Panel */}
          <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl shadow-sm overflow-hidden shrink-0">
            <div className="px-6 py-4 flex items-center gap-2 border-b border-slate-800/60 bg-[#14171d]">
              <Plus className="w-4 h-4 text-emerald-500" />
              <h3 className="text-[13px] font-semibold text-slate-200">
                Create New Profile
              </h3>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5 bg-[#0c0e12]">
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400">Profile Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Video Editing Layout"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#14171d] border border-slate-800/80 rounded-xl text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Optimized mappings for Premiere Pro"
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#14171d] border border-slate-800/80 rounded-xl text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-[13px] font-medium text-slate-950 shadow-sm transition-all cursor-pointer mt-2"
              >
                Create Profile
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Import/Export */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Export Panel */}
          <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/60 bg-[#14171d]">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-emerald-500" />
                <h3 className="text-[13px] font-semibold text-slate-200">
                  Export Configuration
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-5 bg-[#0c0e12] flex-1">
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Export current mappings and skeletal tracking parameters as a JSON payload for local deployment.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleCopyJson}
                  className="flex-1 py-2.5 bg-[#14171d] hover:bg-slate-800/80 border border-slate-700/50 rounded-xl text-[13px] font-medium text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>

                <button
                  onClick={handleDownloadJson}
                  className="flex-1 py-2.5 bg-[#14171d] hover:bg-slate-800/80 border border-slate-700/50 rounded-xl text-[13px] font-medium text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  Download File
                </button>
              </div>

              <div className="p-4 bg-[#14171d] border border-slate-800/50 rounded-xl text-[11px] font-mono text-slate-500 max-h-[160px] overflow-y-auto whitespace-pre">
                {onExportProfile(activeProfile)}
              </div>
            </div>
          </div>

          {/* Import Panel */}
          <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 flex items-center gap-2 border-b border-slate-800/60 bg-[#14171d]">
              <Upload className="w-4 h-4 text-emerald-500" />
              <h3 className="text-[13px] font-semibold text-slate-200">
                Import Configuration
              </h3>
            </div>

            <form onSubmit={handleImport} className="p-6 space-y-5 bg-[#0c0e12] flex-1">
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Paste a valid schema payload below to load a profile.
              </p>

              <textarea
                required
                rows={5}
                placeholder='{ "name": "Custom", "gestures": [...] }'
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                className="w-full p-4 bg-[#14171d] border border-slate-800/80 rounded-xl font-mono text-[12px] text-slate-300 placeholder-slate-700 focus:outline-none focus:border-emerald-500 resize-none transition-colors shadow-inner"
              />

              {importFeedback && (
                <div className={`p-3.5 rounded-xl border text-[12px] flex items-center gap-2 font-medium ${
                  importFeedback.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {importFeedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{importFeedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#14171d] hover:bg-slate-800/80 border border-slate-700/50 rounded-xl text-[13px] font-medium text-slate-300 transition-colors cursor-pointer shadow-sm"
              >
                Parse & Import Payload
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
