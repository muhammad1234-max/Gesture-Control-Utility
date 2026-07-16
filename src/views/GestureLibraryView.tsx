import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Keyboard, 
  Play, 
  Volume2, 
  ExternalLink, 
  X, 
  Save, 
  RefreshCw, 
  Settings2
} from 'lucide-react';
import { GestureMapping, ActionType } from '@shared/types';
import { useProfileStore } from '@stores/profileStore';
import { useDiagnosticsStore } from '@stores/diagnosticsStore';
import { useAppStore } from '@stores/appStore';

export default function GestureLibraryView() {
  const activeProfile = useProfileStore(state => state.activeProfile);
  const updateActiveProfile = useProfileStore(state => state.updateActiveProfile);
  const resetToDefaults = useProfileStore(state => state.resetToDefaults);
  const addLog = useDiagnosticsStore(state => state.addLog);
  const showToast = useAppStore(state => state.showToast);

  const gestures = activeProfile.gestures;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'keystroke' | 'launch-app' | 'media-control' | 'volume-control'>('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('swipe-left');
  const [actionType, setActionType] = useState<ActionType>('keystroke');
  const [targetAction, setTargetAction] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [isActive, setIsActive] = useState(true);
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const filteredGestures = gestures.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.trigger.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.targetAction.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeFilter === 'all' || g.actionType === activeFilter;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    if (!isRecordingKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      if (e.metaKey) keys.push('Win');
      const ignoredKeys = ['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'];
      if (!ignoredKeys.includes(e.key)) {
        let keyName = e.key;
        if (keyName === ' ') keyName = 'Space';
        if (keyName.length === 1) keyName = keyName.toUpperCase();
        keys.push(keyName);
      }
      if (keys.length > 0) setTargetAction(keys.join(' + '));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
        setIsRecordingKey(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isRecordingKey]);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setTrigger('swipe-left');
    setActionType('keystroke');
    setTargetAction('');
    setConfidenceThreshold(80);
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (g: GestureMapping) => {
    setEditingId(g.id);
    setName(g.name);
    setTrigger(g.trigger);
    setActionType(g.actionType);
    setTargetAction(g.targetAction);
    setConfidenceThreshold(g.confidenceThreshold);
    setIsActive(g.isActive);
    setShowModal(true);
  };

  const onAddGesture = (data: Omit<GestureMapping, 'id'>) => {
    const newGesture: GestureMapping = {
      ...data,
      id: 'g_' + Math.random().toString(36).substring(2, 9)
    };
    updateActiveProfile(p => ({ ...p, gestures: [newGesture, ...p.gestures] }));
    addLog(`Created custom gesture mapping rule: '${data.name}'`, 'success');
    showToast('Mapping Saved', `'${data.name}' registered to '${data.trigger}'.`, 'success');
  };

  const onUpdateGesture = (id: string, updatedFields: Partial<GestureMapping>) => {
    updateActiveProfile(p => ({
      ...p,
      gestures: p.gestures.map(g => g.id === id ? { ...g, ...updatedFields } : g)
    }));

    if (updatedFields.isActive !== undefined) {
      const g = gestures.find(i => i.id === id);
      if (g) {
        addLog(`Gesture rule '${g.name}' ${updatedFields.isActive ? 'activated' : 'deactivated'}.`, 'info');
      }
    } else {
      addLog('Skeletal mapping configurations updated.', 'info');
    }
  };

  const onDeleteGesture = (id: string) => {
    const rule = gestures.find(g => g.id === id);
    if (!rule) return;
    updateActiveProfile(p => ({ ...p, gestures: p.gestures.filter(g => g.id !== id) }));
    addLog(`Deleted gesture mapping rule: '${rule.name}'`, 'warning');
    showToast('Mapping Deleted', `Removed '${rule.name}' from pipeline rules.`, 'warn');
  };

  const onResetToDefaults = () => {
    resetToDefaults();
    addLog('Reset current profile configurations to standard system defaults.', 'warning');
    showToast('Profile Reset', 'Mappings reverted to default specifications.', 'warn');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      trigger,
      actionType,
      targetAction: targetAction.trim() || 'Unassigned',
      isActive,
      confidenceThreshold
    };
    if (editingId) onUpdateGesture(editingId, data);
    else onAddGesture(data);
    setShowModal(false);
  };

  const getActionIcon = (type: string) => {
    switch(type) {
      case 'keystroke': return <Keyboard className="w-4 h-4 text-sky-400" />;
      case 'launch-app': return <ExternalLink className="w-4 h-4 text-indigo-400" />;
      case 'media-control': return <Play className="w-4 h-4 text-purple-400" />;
      case 'volume-control': return <Volume2 className="w-4 h-4 text-amber-400" />;
      default: return <Settings2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold text-slate-100 tracking-tight">
            Gesture Library
          </h2>
          <p className="text-[13px] text-slate-400 mt-1">
            Manage your custom hand gestures and their corresponding system actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onResetToDefaults}
            className="flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer shadow-sm bg-[#14171d] border-slate-700/50 text-slate-300 hover:bg-slate-800"
            title="Reset to defaults"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-medium text-[13px] text-slate-950 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Gesture
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 bg-[#14171d] border border-slate-800/60 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search gestures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 text-[13px] pr-2">
          {['all', 'keystroke', 'launch-app', 'media-control', 'volume-control'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as any)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                activeFilter === filter 
                  ? 'bg-slate-800 text-slate-100 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Gestures List */}
      <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-800/60">
          {filteredGestures.map((g) => (
            <div 
              key={g.id} 
              className={`p-4 flex items-center gap-4 transition-colors hover:bg-slate-800/30 ${
                !g.isActive && 'opacity-60 grayscale-[0.5]'
              }`}
            >
              {/* Icon & Status */}
              <div className="flex items-center gap-4 w-[280px] shrink-0">
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={g.isActive}
                    onChange={(e) => onUpdateGesture(g.id, { isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:border-emerald-500"></div>
                </label>
                
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shrink-0">
                    {getActionIcon(g.actionType)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-slate-100 truncate">{g.name}</h3>
                    <p className="text-[12px] text-slate-500 capitalize">{g.trigger.replace('-', ' ')}</p>
                  </div>
                </div>
              </div>

              {/* Action Preview */}
              <div className="flex-1 min-w-0 flex items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800 text-[13px] font-mono text-slate-300 truncate">
                  <span className="truncate">{g.targetAction}</span>
                </div>
              </div>

              {/* Threshold & Controls */}
              <div className="flex items-center gap-6 shrink-0 pl-4">
                <div className="text-right">
                  <p className="text-[12px] font-medium text-slate-500">Confidence</p>
                  <p className="text-[13px] font-semibold text-emerald-400">{g.confidenceThreshold}%</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(g)}
                    className="p-2 text-slate-400 hover:text-slate-200 transition-colors hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteGesture(g.id)}
                    disabled={g.isSystemDefault}
                    className="p-2 text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredGestures.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/30 flex items-center justify-center mx-auto mb-4">
                <Settings2 className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-[14px] font-medium text-slate-300">No gestures found</p>
              <p className="text-[13px] text-slate-500 mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e12]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            ref={modalRef} 
            className="w-full max-w-lg bg-[#14171d] border border-slate-800/60 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <h3 className="font-semibold text-[15px] text-slate-100">
                {editingId ? 'Edit Gesture' : 'Create Gesture'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next Track"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0c0e12] border border-slate-800 rounded-xl text-[14px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-slate-400">Trigger Gesture</label>
                  <select
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0c0e12] border border-slate-800 rounded-xl text-[13px] text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <option value="swipe-left">Swipe Left</option>
                    <option value="swipe-right">Swipe Right</option>
                    <option value="swipe-up">Swipe Up</option>
                    <option value="swipe-down">Swipe Down</option>
                    <option value="circle">Circular Clockwise</option>
                    <option value="tap">Index Tap</option>
                    <option value="double-tap">Double Tap</option>
                    <option value="pinch">Index Pinch</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-slate-400">Action Type</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as ActionType)}
                    className="w-full px-4 py-2.5 bg-[#0c0e12] border border-slate-800 rounded-xl text-[13px] text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <option value="keystroke">Keystroke Shortcut</option>
                    <option value="launch-app">Launch Application</option>
                    <option value="volume-control">Volume Control</option>
                    <option value="media-control">Media Control</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[12px] font-medium text-slate-400">Target Command</label>
                  {actionType === 'keystroke' && (
                    <button
                      type="button"
                      onClick={() => setIsRecordingKey(!isRecordingKey)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        isRecordingKey 
                          ? 'bg-amber-500/10 text-amber-400 animate-pulse' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isRecordingKey ? 'Recording...' : 'Record Keys'}
                    </button>
                  )}
                </div>

                {actionType === 'keystroke' ? (
                  <input
                    type="text"
                    required
                    readOnly
                    placeholder="Press keys..."
                    value={targetAction}
                    className={`w-full px-4 py-2.5 border rounded-xl font-mono text-[13px] transition-colors ${
                      isRecordingKey 
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' 
                        : 'bg-[#0c0e12] border-slate-800 text-slate-300'
                    }`}
                  />
                ) : actionType === 'launch-app' ? (
                  <input
                    type="text"
                    required
                    placeholder="e.g. C:\Windows\System32\notepad.exe"
                    value={targetAction}
                    onChange={(e) => setTargetAction(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0c0e12] border border-slate-800 rounded-xl text-[13px] font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                ) : actionType === 'volume-control' ? (
                  <select
                    value={targetAction}
                    onChange={(e) => setTargetAction(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0c0e12] border border-slate-800 rounded-xl text-[13px] text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Select action --</option>
                    <option value="volume-up">Volume Up</option>
                    <option value="volume-down">Volume Down</option>
                    <option value="volume-mute">Mute/Unmute</option>
                  </select>
                ) : (
                  <select
                    value={targetAction}
                    onChange={(e) => setTargetAction(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0c0e12] border border-slate-800 rounded-xl text-[13px] text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Select action --</option>
                    <option value="media-play">Play / Pause</option>
                    <option value="media-next">Next Track</option>
                    <option value="media-prev">Previous Track</option>
                  </select>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-[12px] font-medium text-slate-400">Confidence Threshold</label>
                  <span className="text-[13px] font-semibold text-emerald-400">{confidenceThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="99"
                  step="5"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-800/60">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:border-emerald-500"></div>
                </label>
                <span className="text-[13px] font-medium text-slate-300">Gesture Enabled</span>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-[13px] font-medium text-slate-950 shadow-sm transition-all cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Create Gesture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
