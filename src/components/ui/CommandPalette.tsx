import React, { useState, useEffect } from 'react';
import { Search, Settings, LayoutDashboard, Sliders, Play, Square } from 'lucide-react';
import { useAppStore } from '@stores/appStore';
import { useTelemetryStore } from '@stores/telemetryStore';
import { EngineController } from '@controllers';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const { engineActive, setEngineActive } = useTelemetryStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const actions = [
    { id: 'go-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, onSelect: () => setActiveTab('dashboard') },
    { id: 'go-gestures', label: 'Open Gestures', icon: Sliders, onSelect: () => setActiveTab('gestures') },
    { id: 'go-settings', label: 'Open Settings', icon: Settings, onSelect: () => setActiveTab('settings') },
    { id: 'toggle-engine', label: engineActive ? 'Stop Tracking Engine' : 'Start Tracking Engine', icon: engineActive ? Square : Play, onSelect: () => engineActive ? EngineController.stop() : EngineController.start() },
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-slate-950/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-slate-700/60">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            type="text"
            className="w-full bg-transparent border-none text-slate-200 px-3 focus:outline-none placeholder-slate-500 text-lg"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-2 no-scrollbar">
          {filtered.length > 0 ? (
            filtered.map(action => (
              <button
                key={action.id}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-300 transition-colors"
                onClick={() => { action.onSelect(); setIsOpen(false); }}
              >
                <action.icon className="w-4 h-4" />
                <span className="font-medium">{action.label}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-slate-500">
              No results found for "{query}"
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-700/60 text-xs text-slate-500 flex justify-between bg-slate-900/50">
          <span>Use arrows to navigate</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
