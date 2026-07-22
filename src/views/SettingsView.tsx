import React, { useState, useEffect } from 'react';
import { Camera, MousePointer2, TerminalSquare, Power, Eye, Activity, Sliders, Hand } from 'lucide-react';
import { useAppStore } from '@stores/appStore';
import { IPCClient } from '@ipc/client';
import { ToggleSwitch } from '@components/ToggleSwitch';
import { SettingsSlider } from '@components/SettingsSlider';
import { EngineController, CameraController, TrackingController, ConfigurationController } from '@controllers';
import { DeveloperPanel } from '@components/DeveloperPanel';
import { ErrorBoundary } from '@components/ErrorBoundary';

type SettingsTab = 'general' | 'tracking' | 'cursor' | 'gestures' | 'accessibility' | 'performance' | 'diagnostics' | 'advanced';

export default function SettingsView() {
  const config = useAppStore(state => state.config);
  const updateConfig = useAppStore(state => state.updateConfig);
  const setOnboardingOpen = useAppStore(state => state.setOnboardingOpen);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [devMode, setDevMode] = useState(false);
  const [startWithWindows, setStartWithWindows] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(false);
  const [engineStatus, setEngineStatus] = useState<any>({ pid: null, camera_open: false, tracking: false });

  useEffect(() => {
    IPCClient.storeGet('startWithWindows').then(val => val !== undefined && setStartWithWindows(val));
    IPCClient.storeGet('minimizeToTray').then(val => val !== undefined && setMinimizeToTray(val));

    const fetchStatus = () => IPCClient.invoke('GET_STATUS');
    const unsub = IPCClient.subscribe((msg) => {
      if (msg.type === 'ENGINE_STATUS' && msg.payload) {
        setEngineStatus(msg.payload);
      }
    });

    const interval = setInterval(fetchStatus, 2000);
    fetchStatus();

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const handleToggleStart = (val: boolean) => {
    setStartWithWindows(val);
    IPCClient.storeSet('startWithWindows', val);
  };

  const handleToggleTray = (val: boolean) => {
    setMinimizeToTray(val);
    IPCClient.storeSet('minimizeToTray', val);
  };

  const handleAccessibilityToggle = (key: keyof typeof config.accessibility) => (val: boolean) => {
    const newAcc = { ...config.accessibility, [key]: val };
    updateConfig({ accessibility: newAcc });
    IPCClient.storeSet('appConfig', { ...config, accessibility: newAcc });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Power className="w-4 h-4" /> },
    { id: 'tracking', label: 'Tracking & Camera', icon: <Camera className="w-4 h-4" /> },
    { id: 'cursor', label: 'Cursor', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'gestures', label: 'Gestures', icon: <Hand className="w-4 h-4" /> },
    { id: 'accessibility', label: 'Accessibility', icon: <Eye className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
    { id: 'diagnostics', label: 'Diagnostics', icon: <TerminalSquare className="w-4 h-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Sliders className="w-4 h-4" /> }
  ] as const;

  const cameraId = config?.camera?.deviceId ?? '0';
  const smoothing = config?.adaptive?.overrides?.smoothing ?? 0.3;

  return (
    <div className="flex flex-col h-full animate-[var(--animate-native-fade)]">
      <div className="mb-6">
        <h2 className="text-h1">Settings</h2>
        <p className="text-body mt-1">Configure application behavior and preferences.</p>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Sidebar Tabs */}
        <div className="w-56 shrink-0 flex flex-col gap-1 border-r border-[var(--color-border)] pr-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === tab.id 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          
          <div className="mt-auto pt-4 mb-4">
             <button onClick={() => setOnboardingOpen(true)} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[#111] hover:bg-[#222] text-[var(--color-text-secondary)] hover:text-white text-xs font-semibold uppercase tracking-widest transition-colors">
               Launch Tutorial
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-4 space-y-6 pb-12">
          
          {activeTab === 'general' && (
            <section className="space-y-4 animate-[var(--animate-native-fade)]">
              <h3 className="text-lg font-bold text-white mb-4">Startup & Behavior</h3>
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">Start with Windows</h4>
                    <p className="text-caption mt-0.5">Automatically launch Gesture Mouse when you log in.</p>
                  </div>
                  <ToggleSwitch checked={startWithWindows} onChange={handleToggleStart} />
                </div>
                <div className="h-px w-full bg-[var(--color-border)]" />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">Minimize to Tray</h4>
                    <p className="text-caption mt-0.5">Keep running in the background when the window is closed.</p>
                  </div>
                  <ToggleSwitch checked={minimizeToTray} onChange={handleToggleTray} />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'tracking' && (
            <section className="space-y-4 animate-[var(--animate-native-fade)]">
              <h3 className="text-lg font-bold text-white mb-4">Camera Source</h3>
              <div className="card p-5">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white">Video Source</label>
                  <select 
                    value={cameraId}
                    onChange={e => ConfigurationController.apply({ camera: { ...config?.camera, deviceId: e.target.value } as any })}
                    className="w-full bg-[#111] border border-[var(--color-border)] text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  >
                    <option value="0">Camera 0 (Default / Integrated)</option>
                    <option value="1">Camera 1 (External / OBS Virtual)</option>
                    <option value="2">Camera 2</option>
                  </select>
                  <p className="text-caption pt-1">Note: Restart the tracking engine for camera changes to take effect.</p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'cursor' && (
             <section className="space-y-4 animate-[var(--animate-native-fade)]">
               <h3 className="text-lg font-bold text-white mb-4">Cursor Behavior</h3>
               <p className="text-sm text-[var(--color-text-secondary)]">Note: A full custom overlay is deferred. The native Windows cursor is used for maximum stability.</p>
             </section>
          )}
          
          {activeTab === 'gestures' && (
             <section className="space-y-4 animate-[var(--animate-native-fade)]">
               <h3 className="text-lg font-bold text-white mb-4">Gestures</h3>
               <p className="text-sm text-[var(--color-text-secondary)]">Please visit the Gestures tab in the main sidebar to configure gesture actions.</p>
             </section>
          )}

          {activeTab === 'accessibility' && (
            <section className="space-y-4 animate-[var(--animate-native-fade)]">
              <h3 className="text-lg font-bold text-white mb-4">Accessibility</h3>
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">High Contrast Mode</h4>
                    <p className="text-caption mt-0.5">Increase UI contrast for better readability.</p>
                  </div>
                  <ToggleSwitch checked={config?.accessibility?.highContrast || false} onChange={handleAccessibilityToggle('highContrast')} />
                </div>
                <div className="h-px w-full bg-[var(--color-border)]" />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">Large UI Text</h4>
                    <p className="text-caption mt-0.5">Increase the font size of the application.</p>
                  </div>
                  <ToggleSwitch checked={config?.accessibility?.largeText || false} onChange={handleAccessibilityToggle('largeText')} />
                </div>
                <div className="h-px w-full bg-[var(--color-border)]" />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">Reduced Motion</h4>
                    <p className="text-caption mt-0.5">Disable UI animations and smooth transitions.</p>
                  </div>
                  <ToggleSwitch checked={config?.accessibility?.reducedMotion || false} onChange={handleAccessibilityToggle('reducedMotion')} />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'performance' && (
            <section className="space-y-4 animate-[var(--animate-native-fade)]">
              <h3 className="text-lg font-bold text-white mb-4">Engine Performance</h3>
              <div className="card p-5">
                <SettingsSlider 
                  label="Cursor Smoothing"
                  description="Lower values reduce shaking but add slight delay to cursor movement."
                  value={smoothing}
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  onChange={val => ConfigurationController.apply({ adaptive: { ...config?.adaptive, overrides: { ...config?.adaptive?.overrides, smoothing: val } } })}
                />
              </div>
            </section>
          )}

          {activeTab === 'diagnostics' && (
            <section className="space-y-4 animate-[var(--animate-native-fade)]">
              <h3 className="text-lg font-bold text-white mb-4">System Diagnostics</h3>
              <div className="card p-5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--color-text-secondary)] uppercase">Daemon Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${engineStatus.pid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-sm text-white font-mono">{engineStatus.pid ? `PID: ${engineStatus.pid}` : 'Offline'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--color-text-secondary)] uppercase">Camera Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${engineStatus.camera_open ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-sm text-white">{engineStatus.camera_open ? 'Active' : 'Closed'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--color-text-secondary)] uppercase">Tracking Engine</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${engineStatus.tracking ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                      <span className="text-sm text-white">{engineStatus.tracking ? 'Tracking' : 'Paused'}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-[var(--color-border)]" />
                
                <div className="space-y-3">
                  <h4 className="text-[13px] font-medium text-white mb-2">Manual Overrides</h4>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => EngineController.start()} className="px-3 py-1.5 text-xs font-medium bg-[#222] hover:bg-[#333] border border-[var(--color-border)] rounded text-white transition-colors">Start Daemon</button>
                    <button onClick={() => EngineController.stop()} className="px-3 py-1.5 text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded text-rose-400 transition-colors">Kill Daemon</button>
                    <button onClick={() => EngineController.restart()} className="px-3 py-1.5 text-xs font-medium bg-[#222] hover:bg-[#333] border border-[var(--color-border)] rounded text-white transition-colors">Restart Daemon</button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button onClick={() => CameraController.open()} className="px-3 py-1.5 text-xs font-medium bg-[#222] hover:bg-[#333] border border-[var(--color-border)] rounded text-white transition-colors">Open Camera</button>
                    <button onClick={() => CameraController.close()} className="px-3 py-1.5 text-xs font-medium bg-[#222] hover:bg-[#333] border border-[var(--color-border)] rounded text-white transition-colors">Close Camera</button>
                    <button onClick={() => CameraController.restart()} className="px-3 py-1.5 text-xs font-medium bg-[#222] hover:bg-[#333] border border-[var(--color-border)] rounded text-white transition-colors">Restart Camera</button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button onClick={() => TrackingController.start()} className="px-3 py-1.5 text-xs font-medium bg-[#222] hover:bg-[#333] border border-[var(--color-border)] rounded text-white transition-colors">Resume Tracking</button>
                    <button onClick={() => TrackingController.stop()} className="px-3 py-1.5 text-xs font-medium bg-[#222] hover:bg-[#333] border border-[var(--color-border)] rounded text-white transition-colors">Pause Tracking</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'advanced' && (
            <section className="space-y-4 animate-[var(--animate-native-fade)]">
              <h3 className="text-lg font-bold text-white mb-4">Advanced Tools</h3>
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">Developer Mode</h4>
                    <p className="text-caption mt-0.5">Enables raw telemetry logs and hardware diagnostics.</p>
                  </div>
                  <ToggleSwitch checked={devMode} onChange={setDevMode} />
                </div>
                {devMode && (
                  <ErrorBoundary fallbackTitle="Developer Panel Exception">
                    <DeveloperPanel />
                  </ErrorBoundary>
                )}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
