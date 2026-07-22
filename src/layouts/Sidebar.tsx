import React from 'react';
import { 
  LayoutDashboard, 
  Settings,
  Fingerprint,
  MousePointer2,
  Activity,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { useAppStore } from '@stores/appStore';
import { useTelemetryStore } from '@stores/telemetryStore';

export default function Sidebar() {
  const activeTab = useAppStore(state => state.activeTab);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  
  const engineActive = useTelemetryStore(state => state.engineActive);
  const cameraOpen = useTelemetryStore(state => state.cameraOpen);
  const trackingEnabled = useTelemetryStore(state => state.trackingEnabled);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'LIVE' },
    { id: 'gestures', label: 'Gesture Library', icon: MousePointer2, badge: '5 POSES' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-[#09090e]/95 backdrop-blur-xl border-r border-white/10 flex flex-col justify-between select-none shrink-0 p-4">
      <div className="space-y-6">
        {/* App Logo & Header */}
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-white text-[15px] tracking-wide">
              Gesture Control
            </h1>
            <p className="text-[11px] font-mono text-purple-400 font-semibold">SUITE PRO v1.0</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                  isActive
                    ? 'text-white bg-purple-600/20 border border-purple-500/40 shadow-lg text-purple-200'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-white/40'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-purple-500/40 text-purple-200' : 'bg-white/5 text-white/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Hardware Status Panel */}
      <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2.5 font-mono text-[11px]">
        <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Hardware Status</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/80">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Engine</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${engineActive ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-white/10 text-white/40'}`}>
            {engineActive ? 'ONLINE' : 'STOPPED'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/80">
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
            <span>Webcam</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cameraOpen ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-white/10 text-white/40'}`}>
            {cameraOpen ? 'CONNECTED' : 'OFF'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Tracking</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${trackingEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-white/10 text-white/40'}`}>
            {trackingEnabled ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>
      </div>
    </aside>
  );
}
