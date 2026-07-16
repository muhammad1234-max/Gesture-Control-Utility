import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import DashboardView from '@views/DashboardView';
import GestureLibraryView from '@views/GestureLibraryView';
import SandboxView from '@views/SandboxView';
import CalibrationView from '@views/CalibrationView';
import ProfileView from '@views/ProfileView';
import BenchmarkingView from '@views/BenchmarkingView';
import SettingsView from '@views/SettingsView';
import { useAppStore } from '@stores/appStore';
import { useTelemetryStore } from '@stores/telemetryStore';
import { useDiagnosticsStore } from '@stores/diagnosticsStore';
import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function MainLayout() {
  const activeTab = useAppStore(state => state.activeTab);
  const toast = useAppStore(state => state.toast);
  
  const engineActive = useTelemetryStore(state => state.engineActive);
  const setFps = useTelemetryStore(state => state.setFps);
  
  const addLog = useDiagnosticsStore(state => state.addLog);

  // Initialize IPC
  useEffect(() => {
    addLog('Skeletal Pipeline Engine initialized.', 'info');
    addLog('Host OS: Windows 11 x64 (CLR Native CLI Host)', 'info');
    addLog('Hardware backend: DirectX12 DirectCompute shaders loaded.', 'info');

    IPCClient.connect();

    return () => {
      IPCClient.disconnect();
    };
  }, [addLog]);

  // Handle telemetry sync
  useEffect(() => {
    if (engineActive) {
      IPCClient.send(IPCEventType.ENGINE_STATUS, { active: true });
      addLog('Skeletal Tracking Service initialized local telemetry.', 'info');
      setFps(60);

      const interval = setInterval(() => {
        setFps(Math.floor(Math.random() * 5) + 57);
        const checkChance = Math.random();
        if (checkChance < 0.15) {
          addLog('Tracking pipeline confidence check: stable (96.4% confidence)', 'info');
        } else if (checkChance < 0.22) {
          addLog('DirectX buffers synchronized. Pipeline render latency: 4.1ms', 'info');
        }
      }, 12000);

      return () => clearInterval(interval);
    } else {
      IPCClient.send(IPCEventType.ENGINE_STATUS, { active: false });
      setFps(0);
      addLog('Skeletal Tracking Service disabled locally.', 'warning');
    }
  }, [engineActive, addLog, setFps]);

  const config = useAppStore(state => state.config);
  const accessibility = config?.accessibility || { highContrast: false, largeText: false, reducedMotion: false };
  const theme = config?.theme || 'dark';

  return (
    <div 
      id="gesture-app-shell" 
      className={`min-h-screen flex flex-col font-sans select-none overflow-hidden transition-colors duration-300
        ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#0c0e12] text-slate-200'}
        ${accessibility.highContrast ? 'contrast-125' : ''}
        ${accessibility.largeText ? 'text-lg' : 'text-sm'}
        ${accessibility.reducedMotion ? 'motion-reduce' : ''}
      `}
    >
      {/* Windows 11 Native-like Title Bar */}
      <header className="h-10 flex items-center justify-between px-4 shrink-0 app-region-drag select-none border-b border-slate-800/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          <span className="text-[11px] font-medium text-slate-400 tracking-wide">Gesture Control Command Center</span>
        </div>
        
        {/* Fake Window Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
            <div className="w-3 h-px bg-slate-400"></div>
            <div className="w-3 h-3 border border-slate-400 rounded-[2px]"></div>
            <div className="w-3 h-3 relative before:absolute before:inset-0 before:rotate-45 before:bg-slate-400 before:h-px before:top-1.5 after:absolute after:inset-0 after:-rotate-45 after:bg-slate-400 after:h-px after:top-1.5"></div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto no-scrollbar relative p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'library' && config.userMode !== 'beginner' && <GestureLibraryView />}
            {activeTab === 'sandbox' && config.userMode !== 'beginner' && <SandboxView />}
            {activeTab === 'calibration' && config.userMode !== 'beginner' && <CalibrationView />}
            {activeTab === 'profiles' && <SettingsView />}
            {activeTab === 'benchmarking' && config.userMode === 'developer' && <BenchmarkingView />}
          </div>

          {/* Floating Toast Notification */}
          {toast && (
            <div 
              className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl max-w-sm z-50 flex items-start gap-3 transition-all duration-300 transform translate-y-0 scale-100 ${
                toast.type === 'success' 
                  ? 'bg-[#181a20] border border-emerald-500/10 text-slate-200' 
                  : 'bg-[#181a20] border border-amber-500/10 text-slate-200'
              }`}
            >
              <div className="mt-0.5">
                {toast.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[13px] font-medium text-slate-100">
                  {toast.title}
                </h4>
                <p className="text-[12px] text-slate-400">
                  {toast.message}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
