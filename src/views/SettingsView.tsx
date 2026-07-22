import React, { useState, useEffect } from 'react';
import { Camera, MousePointer2, TerminalSquare, Power } from 'lucide-react';
import { useAppStore } from '@stores/appStore';
import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { ToggleSwitch } from '@components/ToggleSwitch';
import { SettingsSlider } from '@components/SettingsSlider';
import { EngineController, CameraController, TrackingController, ConfigurationController } from '@controllers';
import { DeveloperPanel } from '@components/DeveloperPanel';
import { ErrorBoundary } from '@components/ErrorBoundary';

export default function SettingsView() {
  const config = useAppStore(state => state.config);
  const [devMode, setDevMode] = useState(false);
  const [startWithWindows, setStartWithWindows] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(false);
  const [engineStatus, setEngineStatus] = useState<any>({ pid: null, camera_open: false, tracking: false });

  useEffect(() => {
    // Load OS-level settings on mount
    IPCClient.storeGet('startWithWindows').then(val => {
      if (val !== undefined) setStartWithWindows(val);
    });
    IPCClient.storeGet('minimizeToTray').then(val => {
      if (val !== undefined) setMinimizeToTray(val);
    });

    const fetchStatus = () => IPCClient.invoke(IPCEventType.GET_STATUS);
    
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

  const smoothing = config?.adaptive?.overrides?.smoothing ?? 0.3;
  const cameraId = config?.camera?.deviceId ?? '0';

  return (
    <div className="space-y-6 animate-[var(--animate-native-fade)] pb-12">
      <div>
        <h2 className="text-h1">Settings</h2>
        <p className="text-body mt-1">Configure application behavior and preferences.</p>
      </div>

      <div className="space-y-8">
        
        {/* Camera Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <Camera className="w-4 h-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Camera</h3>
          </div>
          <div className="card p-5">
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Video Source</label>
              <select 
                value={cameraId}
                onChange={e => ConfigurationController.apply({ camera: { ...config?.camera, deviceId: e.target.value } as any })}
                className="w-full bg-[#111] border border-[var(--color-border)] text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-all"
              >
                <option value="0">Camera 0 (Default / Integrated)</option>
                <option value="1">Camera 1 (External / OBS Virtual)</option>
                <option value="2">Camera 2</option>
              </select>
              <p className="text-caption pt-1">Note: Restart the tracking engine for camera changes to take effect.</p>
            </div>
          </div>
        </section>

        {/* Performance Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <MousePointer2 className="w-4 h-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Performance</h3>
          </div>
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

        {/* Startup Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <Power className="w-4 h-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Startup</h3>
          </div>
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

        {/* Advanced Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <TerminalSquare className="w-4 h-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Advanced</h3>
          </div>
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

        {/* System Diagnostics & Control Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <TerminalSquare className="w-4 h-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">System Control</h3>
          </div>
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

      </div>

      <div className="pt-8 mt-8 border-t border-[var(--color-border)] flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
        <div>
           <span>Gesture Control Utility v1.0.0</span>
        </div>
        <div className="flex gap-4">
           <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Documentation</a>
           <a href="#" className="hover:text-[var(--color-primary)] transition-colors">GitHub</a>
        </div>
      </div>
    </div>
  );
}
