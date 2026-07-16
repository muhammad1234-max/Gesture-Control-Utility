import React, { useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { Settings, Monitor, Accessibility, Camera, UserCircle2 } from 'lucide-react';

export default function SettingsView() {
  const config = useAppStore(state => state.config);
  const updateConfig = useAppStore(state => state.updateConfig);
  const [activeCategory, setActiveCategory] = useState('general');
  const [search, setSearch] = useState('');

  const categories = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Monitor },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'camera', label: 'Camera & Tracking', icon: Camera },
    { id: 'profiles', label: 'Profiles', icon: UserCircle2 },
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] bg-[#14171d] rounded-2xl border border-slate-800/60 overflow-hidden shadow-sm">
      {/* Settings Sidebar */}
      <div className="w-64 border-r border-slate-800/60 bg-slate-900/30 p-4 flex flex-col gap-2">
        <div className="mb-4 px-2">
          <input 
            type="text" 
            placeholder="Search settings..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        
        {categories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                isActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Settings Content */}
      <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6 capitalize">{categories.find(c => c.id === activeCategory)?.label} Settings</h2>
          
          {activeCategory === 'general' && (
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">User Mode</h4>
                    <p className="text-xs text-slate-500 mt-1">Adjust the complexity of the interface.</p>
                  </div>
                  <select 
                    value={config.userMode}
                    onChange={(e) => updateConfig({ userMode: e.target.value as any })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="advanced">Advanced</option>
                    <option value="developer">Developer</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">Launch on Startup</h4>
                    <p className="text-xs text-slate-500 mt-1">Automatically start with Windows.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={config.startup?.autoStart || false} onChange={(e) => updateConfig({ startup: { ...config.startup, autoStart: e.target.checked } })} />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'appearance' && (
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">Theme</h4>
                    <p className="text-xs text-slate-500 mt-1">Choose your preferred visual style.</p>
                  </div>
                  <select 
                    value={config.theme}
                    onChange={(e) => updateConfig({ theme: e.target.value as any })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
                  >
                    <option value="system">System Default</option>
                    <option value="dark">Dark Mode</option>
                    <option value="light">Light Mode</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'accessibility' && (
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 space-y-6">
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">High Contrast</h4>
                    <p className="text-xs text-slate-500 mt-1">Increase contrast for better readability.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={config.accessibility?.highContrast || false} onChange={(e) => updateConfig({ accessibility: { ...config.accessibility, highContrast: e.target.checked } })} />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-slate-700/50 pt-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">Large Text</h4>
                    <p className="text-xs text-slate-500 mt-1">Increase overall font size.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={config.accessibility?.largeText || false} onChange={(e) => updateConfig({ accessibility: { ...config.accessibility, largeText: e.target.checked } })} />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-slate-700/50 pt-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">Reduced Motion</h4>
                    <p className="text-xs text-slate-500 mt-1">Minimize UI animations.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={config.accessibility?.reducedMotion || false} onChange={(e) => updateConfig({ accessibility: { ...config.accessibility, reducedMotion: e.target.checked } })} />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
