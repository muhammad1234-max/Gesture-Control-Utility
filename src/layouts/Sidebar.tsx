import React from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Sliders, 
  FolderGit2, 
  Camera, 
  Cpu,
  Fingerprint
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '@stores/appStore';
import { useTelemetryStore } from '@stores/telemetryStore';

export default function Sidebar() {
  const activeTab = useAppStore(state => state.activeTab);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const userMode = useAppStore(state => state.config.userMode);
  
  const engineActive = useTelemetryStore(state => state.engineActive);
  const setEngineActive = useTelemetryStore(state => state.setEngineActive);
  const fps = useTelemetryStore(state => state.fps);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, mode: 'beginner' },
    { id: 'library', label: 'Gesture Library', icon: FolderGit2, mode: 'advanced' },
    { id: 'sandbox', label: 'Sandbox', icon: SquareTerminal, mode: 'advanced' },
    { id: 'calibration', label: 'Calibration', icon: Sliders, mode: 'advanced' },
    { id: 'profiles', label: 'Settings', icon: Settings, mode: 'beginner' },
    { id: 'benchmarking', label: 'Developer', icon: Activity, mode: 'developer' },
  ];

  const visibleItems = menuItems.filter(item => {
    if (userMode === 'developer') return true;
    if (userMode === 'advanced' && item.mode !== 'developer') return true;
    if (userMode === 'beginner' && item.mode === 'beginner') return true;
    return false;
  });

  return (
    <aside className="w-64 bg-[#0c0e12] border-r border-slate-800/40 flex flex-col justify-between select-none shrink-0">
      {/* Brand Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-slate-100 text-[13px] tracking-wide">
              GCCC V2
            </h1>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide">
              PRO EDITION
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer relative ${
                  isActive
                    ? 'text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-tab-indicator"
                    className="absolute inset-0 bg-white/[0.06] rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Connection State */}
      <div className="p-6 pb-6">
        {/* Toggle Engine */}
        <div className="p-3.5 bg-[#12141a] rounded-xl border border-slate-800/40 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Engine</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
              engineActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
            }`}>
              {engineActive ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <button
            onClick={() => setEngineActive(!engineActive)}
            className={`w-full py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer ${
              engineActive
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {engineActive ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>

        {/* Engine Telemetry */}
        <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>Telemetry</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{engineActive ? fps : 0} FPS</span>
            <span className="flex h-2 w-2 relative">
              {engineActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${engineActive ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
