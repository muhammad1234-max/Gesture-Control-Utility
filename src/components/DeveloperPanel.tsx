import React, { useEffect, useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { SettingsSlider } from '@components/SettingsSlider';
import { useTelemetryStore } from '@stores/telemetryStore';

export const DeveloperPanel = () => {
  const config = useAppStore(state => state.config);
  const telemetry = useTelemetryStore();
  const [recording, setRecording] = useState(false);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    const unsub = IPCClient.subscribe((msg) => {
      if (msg.type === 'TELEMETRY' && msg.payload) {
        if (msg.payload.metrics) {
          telemetry.setMetrics(msg.payload.metrics);
        }
      }
      if (msg.type === 'RECORDING_STARTED') setRecording(true);
      if (msg.type === 'RECORDING_STOPPED') setRecording(false);
      if (msg.type === 'REPLAY_STARTED') setReplaying(true);
      if (msg.type === 'REPLAY_STOPPED') setReplaying(false);
    });
    return () => unsub();
  }, []);

  const handleParamChange = (key: string, val: number) => {
    const newParams = { ...config?.adaptive?.engineParams, [key]: val };
    const adaptive = { ...config?.adaptive, engineParams: newParams };
    useAppStore.getState().setConfigFromServer({ ...config, adaptive });
    
    // Immediate IPC to bypass local save delay for extreme responsiveness
    IPCClient.invoke('CONFIG', { adaptive });
  };

  const toggleRecording = () => IPCClient.invoke(recording ? 'STOP_RECORDING' : 'START_RECORDING');
  const toggleReplay = () => IPCClient.invoke(replaying ? 'STOP_REPLAY' : 'START_REPLAY');

  return (
    <div className="mt-4 p-5 bg-black/40 rounded-xl border border-[var(--color-primary)]/20 space-y-6">
      
      {/* HUD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
          <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold tracking-widest">Inference Time</p>
          <p className="text-lg font-mono text-white">{telemetry.metrics.t_inference_ms.toFixed(2)} <span className="text-xs text-[var(--color-text-secondary)]">ms</span></p>
        </div>
        <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
          <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold tracking-widest">Filter Time</p>
          <p className="text-lg font-mono text-white">{telemetry.metrics.t_filter_ms.toFixed(3)} <span className="text-xs text-[var(--color-text-secondary)]">ms</span></p>
        </div>
        <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
          <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold tracking-widest">Injection Time</p>
          <p className="text-lg font-mono text-white">{telemetry.metrics.t_injection_ms.toFixed(3)} <span className="text-xs text-[var(--color-text-secondary)]">ms</span></p>
        </div>
        <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
          <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold tracking-widest">Total Pipeline</p>
          <p className="text-lg font-mono text-white">{telemetry.metrics.total_ms.toFixed(2)} <span className="text-xs text-[var(--color-text-secondary)]">ms</span></p>
        </div>
        <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
          <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold tracking-widest">CPU Usage</p>
          <p className="text-lg font-mono text-white">{telemetry.metrics.cpu.toFixed(1)} <span className="text-xs text-[var(--color-text-secondary)]">%</span></p>
        </div>
        <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
          <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold tracking-widest">RAM Usage</p>
          <p className="text-lg font-mono text-white">{telemetry.metrics.ram_mb.toFixed(0)} <span className="text-xs text-[var(--color-text-secondary)]">MB</span></p>
        </div>
      </div>

      <div className="h-px w-full bg-[var(--color-border)]" />

      {/* Recording Tools */}
      <div>
        <h4 className="text-[13px] font-medium text-white mb-3">Benchmark Replay Tools</h4>
        <div className="flex gap-2">
          <button onClick={toggleRecording} className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${recording ? 'bg-rose-500 text-white' : 'bg-[#222] text-[var(--color-text-secondary)] hover:bg-[#333]'}`}>
            {recording ? 'Stop Recording' : 'Start Recording'}
          </button>
          <button onClick={toggleReplay} className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${replaying ? 'bg-[var(--color-primary)] text-black' : 'bg-[#222] text-[var(--color-text-secondary)] hover:bg-[#333]'}`}>
            {replaying ? 'Stop Replay' : 'Start Replay'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-2">Record an isolated movement, then play it back continuously to tune the engine against exact data.</p>
      </div>

      <div className="h-px w-full bg-[var(--color-border)]" />

      {/* Tuners */}
      <div className="space-y-4">
        <h4 className="text-[13px] font-medium text-white mb-2">Live Engine Tuners</h4>
        <SettingsSlider 
          label="Deadzone Radius (px)"
          description="Minimum raw pixel movement required to break out of rest state."
          value={config?.adaptive?.engineParams?.deadzone_px ?? 2.0}
          min={0.0} max={10.0} step={0.1}
          onChange={val => handleParamChange('deadzone_px', val)}
        />
        <SettingsSlider 
          label="1€ Min Cutoff (Hz)"
          description="Intercept parameter for slow movements. Lower means more smoothing at rest."
          value={config?.adaptive?.engineParams?.mincutoff ?? 0.05}
          min={0.001} max={1.0} step={0.001}
          onChange={val => handleParamChange('mincutoff', val)}
        />
        <SettingsSlider 
          label="1€ Beta"
          description="Slope parameter for velocity scaling. Higher means less smoothing at high speeds."
          value={config?.adaptive?.engineParams?.beta ?? 0.005}
          min={0.001} max={0.1} step={0.001}
          onChange={val => handleParamChange('beta', val)}
        />
        <SettingsSlider 
          label="Velocity Filter Cutoff (Hz)"
          description="EMA applied to the velocity derivative. Lower stabilizes the cutoff curve."
          value={config?.adaptive?.engineParams?.dcutoff ?? 1.0}
          min={0.1} max={5.0} step={0.1}
          onChange={val => handleParamChange('dcutoff', val)}
        />
      </div>

    </div>
  );
};
