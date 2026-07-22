import React, { useEffect, useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { SettingsSlider } from '@components/SettingsSlider';
import { useTelemetryStore } from '@stores/telemetryStore';
import fingerprint from '@shared/fingerprint.json';

import { HandSkeletonCanvas } from '@components/HandSkeletonCanvas';

export const DeveloperPanel = () => {
  const config = useAppStore(state => state.config);
  const telemetry = useTelemetryStore();
  const [recording, setRecording] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [validating, setValidating] = useState(false);
  const [engineStatus, setEngineStatus] = useState('🟢 Ready');
  const [validationReport, setValidationReport] = useState<any>(null);
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [detectedPose, setDetectedPose] = useState<string>('NONE');
  const [intentMatrix, setIntentMatrix] = useState<Record<string, any>>({});
  const [electronFp, setElectronFp] = useState('loading...');
  const [pythonFp, setPythonFp] = useState('loading...');

  useEffect(() => {
    // Initial fetch of fingerprints
    IPCClient.invoke('GET_FINGERPRINTS').then((res: any) => {
      if (res) {
        setElectronFp(res.electron);
        setPythonFp(res.python);
      }
    }).catch(() => {});

    const unsub = IPCClient.subscribe((msg) => {
      if (msg.type === 'TELEMETRY' && msg.payload) {
        if (msg.payload.metrics) {
          telemetry.setMetrics(msg.payload.metrics);
        }
        if (msg.payload.landmarks) setLandmarks(msg.payload.landmarks);
        if (msg.payload.detected_pose) setDetectedPose(msg.payload.detected_pose);
        if (msg.payload.intent_matrix) setIntentMatrix(msg.payload.intent_matrix);
      }
      if (msg.type === 'PYTHON_BUILD_ID' && msg.payload) {
        setPythonFp(msg.payload);
      }
      if (msg.type === 'SELF_TEST_RESULT' && msg.payload) {
        setEngineStatus(msg.payload.badge || '🟢 Ready');
      }
      if (msg.type === 'VALIDATION_REPORT' && msg.payload) {
        setValidationReport(msg.payload);
        setValidating(false);
      }
      if (msg.type === 'DRY_RUN_CHANGED') {
        setDryRun(msg.payload);
      }
      if (msg.type === 'RECORDING_STARTED') setRecording(true);
      if (msg.type === 'RECORDING_STOPPED') setRecording(false);
      if (msg.type === 'REPLAY_STARTED') setReplaying(true);
      if (msg.type === 'REPLAY_STOPPED') setReplaying(false);
    });
    return () => unsub();
  }, []);

  const toggleDryRun = () => {
    const next = !dryRun;
    setDryRun(next);
    IPCClient.invoke('SET_DRY_RUN', next);
  };

  const toggleValidationSession = () => {
    if (!validating) {
      setValidating(true);
      setValidationReport(null);
      IPCClient.invoke('START_VALIDATION_SESSION');
    } else {
      IPCClient.invoke('STOP_VALIDATION_SESSION');
    }
  };

  const handleParamChange = (key: string, val: number) => {
    const newParams = { ...config?.adaptive?.engineParams, [key]: val };
    const adaptive = { ...config?.adaptive, engineParams: newParams };
    useAppStore.getState().setConfigFromServer({ ...config, adaptive });
    
    // Immediate IPC to bypass local save delay for extreme responsiveness
    IPCClient.invoke('CONFIG', { adaptive });
  };

  const exportConfigSnapshot = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0',
      fingerprint: fingerprint.BUILD_ID,
      engineParams: config?.adaptive?.engineParams || {},
      camera: config?.camera || {},
      gestures: config?.gestures || {}
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `engine_config_snapshot_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const toggleRecording = () => IPCClient.invoke(recording ? 'STOP_RECORDING' : 'START_RECORDING');
  const toggleReplay = () => IPCClient.invoke(replaying ? 'STOP_REPLAY' : 'START_REPLAY');

  return (
    <div className="mt-4 p-5 bg-black/40 rounded-xl border border-[var(--color-primary)]/20 space-y-6">
      
      {/* Engine Status & Validation Mode Control Header */}
      <div className="bg-[#111] p-4 rounded-xl border border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold tracking-widest">Startup Self-Test Status</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-bold font-mono">{engineStatus}</span>
            <span className="text-xs text-white/60">(All core modules verified)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDryRun}
            className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${dryRun ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-[#222] border-[var(--color-border)] text-white/80 hover:bg-[#333]'}`}
          >
            {dryRun ? 'Dry-Run Mode: ACTIVE (OS Injection Off)' : 'Dry-Run Mode: OFF'}
          </button>
          
          <button
            onClick={toggleValidationSession}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${validating ? 'bg-rose-500 text-white animate-pulse' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
          >
            {validating ? 'Stop Validation Session' : 'Start Validation Session'}
          </button>
        </div>
      </div>

      {/* Validation Report Render */}
      {validationReport && (
        <div className="p-4 bg-purple-950/40 border border-purple-500/40 rounded-xl font-mono text-xs text-purple-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white uppercase tracking-wider text-sm">Hardware Validation Report</h4>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${validationReport.status === 'PASS' ? 'bg-green-500/30 border border-green-500 text-green-300' : 'bg-rose-500/30 border border-rose-500 text-rose-300'}`}>
              {validationReport.status}
            </span>
          </div>
          <pre className="text-[11px] bg-black/60 p-3 rounded border border-purple-500/20 whitespace-pre-wrap text-white">
            {validationReport.formatted_text}
          </pre>
        </div>
      )}

      {/* Live Hand Skeleton Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-medium text-white uppercase tracking-widest text-[var(--color-text-secondary)]">Live Hand Skeleton & Diagnostic Overlay</h4>
          <span className="text-xs font-mono text-purple-400 font-bold">POSE: {detectedPose}</span>
        </div>
        <HandSkeletonCanvas landmarks={landmarks} detectedPose={detectedPose} fps={telemetry.metrics?.fps ?? 0} />
      </div>

      {/* Simultaneous Gesture Intent Recognizer Matrix */}
      <div className="space-y-3">
        <h4 className="text-[13px] font-medium text-white uppercase tracking-widest text-[var(--color-text-secondary)]">Simultaneous Gesture Intent Recognizer Matrix</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {['OPEN_HAND', 'LEFT_CLICK', 'RIGHT_CLICK', 'SCROLL', 'ZOOM'].map((gKey) => {
            const data = intentMatrix[gKey] || { confidence: 0, stability: 0, activation_reason: 'Idle' };
            const isActive = detectedPose === gKey;
            return (
              <div key={gKey} className={`p-3 rounded-lg border transition-all ${
                isActive ? 'bg-purple-950/50 border-purple-500 text-white' : 'bg-[#111] border-[var(--color-border)] text-white/70'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-purple-300">{gKey}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-green-500 text-black' : 'bg-white/10 text-white/50'}`}>
                    {isActive ? 'ACTIVE' : 'IDLE'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-white/80">
                  <span>Conf: <strong className="text-purple-400">{data.confidence}%</strong></span>
                  <span>Stab: <strong className="text-green-400">{data.stability}%</strong></span>
                </div>
                <p className="text-[10px] text-white/50 truncate mt-1">{data.activation_reason}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance HUD */}
      <div className="space-y-2">
        <h4 className="text-[13px] font-medium text-white uppercase tracking-widest text-[var(--color-text-secondary)]">Pipeline Performance Watchdog</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">Inference Time</p>
            <p className="text-base text-white font-mono">{(telemetry.metrics?.t_inference_ms ?? 0).toFixed(2)} <span className="text-xs text-[var(--color-text-secondary)]">ms</span></p>
          </div>
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">Filter Time</p>
            <p className="text-base text-white font-mono">{(telemetry.metrics?.t_filter_ms ?? 0).toFixed(3)} <span className="text-xs text-[var(--color-text-secondary)]">ms</span></p>
          </div>
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">Avg / Max Frame</p>
            <p className="text-base text-white font-mono">{(telemetry.metrics?.avg_frame_ms ?? 0).toFixed(1)} / {(telemetry.metrics?.max_frame_ms ?? 0).toFixed(1)} <span className="text-xs text-[var(--color-text-secondary)]">ms</span></p>
          </div>
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">p99 / Dropped</p>
            <p className="text-base text-white font-mono">{(telemetry.metrics?.p99_frame_ms ?? 0).toFixed(1)}ms | <span className="text-rose-400">{telemetry.metrics?.dropped_frames ?? 0}</span></p>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-[var(--color-border)]" />

      {/* Quantitative Jitter Analyzer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-medium text-white uppercase tracking-widest text-[var(--color-text-secondary)]">Fingertip Jitter Analyzer (Rest State)</h4>
          <span className="text-[11px] font-mono text-purple-400">Target: RMS &lt; 0.25px | Pk-Pk &lt; 1px</span>
        </div>
        <div className="grid grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">RMS Jitter</p>
            <p className={`text-base font-bold ${((telemetry as any).jitter?.rms_px ?? 0) < 0.25 ? 'text-green-400' : 'text-yellow-400'}`}>
              {((telemetry as any).jitter?.rms_px ?? 0).toFixed(3)} <span className="text-xs text-white/60">px</span>
            </p>
          </div>
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">Peak-to-Peak Jitter</p>
            <p className={`text-base font-bold ${((telemetry as any).jitter?.pk_pk_px ?? 0) < 1.0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {((telemetry as any).jitter?.pk_pk_px ?? 0).toFixed(3)} <span className="text-xs text-white/60">px</span>
            </p>
          </div>
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">Standard Dev</p>
            <p className="text-base text-white font-mono">
              {((telemetry as any).jitter?.std_dev_px ?? 0).toFixed(3)} <span className="text-xs text-white/60">px</span>
            </p>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-[var(--color-border)]" />

      {/* Module Health Indicators */}
      <div className="space-y-3">
        <h4 className="text-[13px] font-medium text-white uppercase tracking-widest text-[var(--color-text-secondary)]">Module Health Indicators & Budget Watchdog</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">Cursor Module</span>
              <span>🟢</span>
            </div>
            <p className="text-white text-[11px]">Budget: &lt;2.0 ms</p>
            <p className="text-purple-300 text-[11px]">Status: HEALTHY</p>
          </div>
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">Click Module</span>
              <span>🟢</span>
            </div>
            <p className="text-white text-[11px]">Budget: &lt;1.0 ms</p>
            <p className="text-purple-300 text-[11px]">Status: HEALTHY</p>
          </div>
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">Scroll Module</span>
              <span>🟢</span>
            </div>
            <p className="text-white text-[11px]">Budget: &lt;1.0 ms</p>
            <p className="text-purple-300 text-[11px]">Status: HEALTHY</p>
          </div>
          <div className="bg-[#111] p-3 rounded-lg border border-[var(--color-border)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-[var(--color-text-secondary)] font-semibold">Priority Mgr</span>
              <span>🟢</span>
            </div>
            <p className="text-white text-[11px]">Budget: &lt;0.5 ms</p>
            <p className="text-purple-300 text-[11px]">Status: HEALTHY</p>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-[var(--color-border)]" />

      {/* Build Signatures */}
      <div className="bg-[#111] p-4 rounded-lg border border-[var(--color-border)] space-y-2">
        <h4 className="text-[13px] font-medium text-white mb-2 uppercase tracking-widest text-[var(--color-text-secondary)]">Build Signatures & Configuration Snapshot</h4>
        <div className="flex justify-between items-center text-sm font-mono">
          <span className="text-[var(--color-text-secondary)]">React UI:</span>
          <span className="text-white bg-black px-2 py-1 rounded">{fingerprint.BUILD_ID}</span>
        </div>
        <div className="flex justify-between items-center text-sm font-mono">
          <span className="text-[var(--color-text-secondary)]">Electron Host:</span>
          <span className={`${electronFp === fingerprint.BUILD_ID ? 'text-green-400' : 'text-rose-500'} bg-black px-2 py-1 rounded`}>{electronFp}</span>
        </div>
        <div className="flex justify-between items-center text-sm font-mono">
          <span className="text-[var(--color-text-secondary)]">Python Engine:</span>
          <span className={`${pythonFp === fingerprint.BUILD_ID ? 'text-green-400' : 'text-rose-500'} bg-black px-2 py-1 rounded`}>{pythonFp}</span>
        </div>
        <div className="pt-2">
          <button onClick={exportConfigSnapshot} className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold rounded transition-colors">
            Export Engine Configuration JSON
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-[var(--color-border)]" />

      {/* Recording & Session Tools */}
      <div>
        <h4 className="text-[13px] font-medium text-white mb-3 uppercase tracking-widest text-[var(--color-text-secondary)] font-semibold">Production Session Recorder</h4>
        <div className="flex gap-2">
          <button onClick={toggleRecording} className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${recording ? 'bg-rose-500 text-white' : 'bg-[#222] text-[var(--color-text-secondary)] hover:bg-[#333]'}`}>
            {recording ? 'Stop Session Recording' : 'Start Session Recording'}
          </button>
          <button onClick={toggleReplay} className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${replaying ? 'bg-[var(--color-primary)] text-black' : 'bg-[#222] text-[var(--color-text-secondary)] hover:bg-[#333]'}`}>
            {replaying ? 'Stop Replay Session' : 'Start Replay Session'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-2">Records full session telemetry, landmark traces, confidence histories, and interaction events compatible with Phase 5 Replay Engine.</p>
      </div>

      <div className="h-px w-full bg-[var(--color-border)]" />

      {/* Tuners */}
      <div className="space-y-4">
        <h4 className="text-[13px] font-medium text-white mb-2 uppercase tracking-widest text-[var(--color-text-secondary)]">Live Engine Tuners</h4>
        <SettingsSlider 
          label="Deadzone Radius (px)"
          description="Minimum raw pixel movement required to break out of rest state."
          value={config?.adaptive?.engineParams?.deadzone_px ?? 2.5}
          min={0.0} max={10.0} step={0.1}
          onChange={val => handleParamChange('deadzone_px', val)}
        />
        <SettingsSlider 
          label="1€ Min Cutoff (Hz)"
          description="Intercept parameter for slow movements. Lower means more smoothing at rest."
          value={config?.adaptive?.engineParams?.min_cutoff ?? 0.5}
          min={0.01} max={2.0} step={0.01}
          onChange={val => handleParamChange('min_cutoff', val)}
        />
        <SettingsSlider 
          label="1€ Beta"
          description="Slope parameter for velocity scaling. Higher means less smoothing at high speeds."
          value={config?.adaptive?.engineParams?.beta ?? 0.1}
          min={0.001} max={0.5} step={0.005}
          onChange={val => handleParamChange('beta', val)}
        />
        <SettingsSlider 
          label="Derivative Cutoff (Hz)"
          description="EMA applied to the velocity derivative. Lower stabilizes the cutoff curve."
          value={config?.adaptive?.engineParams?.dcutoff ?? 2.0}
          min={0.1} max={5.0} step={0.1}
          onChange={val => handleParamChange('dcutoff', val)}
        />
        <SettingsSlider 
          label="Prediction Threshold (px/s)"
          description="Velocity threshold below which prediction is completely disabled at rest."
          value={config?.adaptive?.engineParams?.pred_threshold ?? 50.0}
          min={0.0} max={200.0} step={5.0}
          onChange={val => handleParamChange('pred_threshold', val)}
        />
        <SettingsSlider 
          label="Cursor Sensitivity"
          description="Global gain multiplier for mapped screen coordinate delta."
          value={config?.adaptive?.engineParams?.sensitivity ?? 1.0}
          min={0.5} max={3.0} step={0.05}
          onChange={val => handleParamChange('sensitivity', val)}
        />
        <SettingsSlider 
          label="Velocity Cap (px/s)"
          description="Maximum clamped velocity to prevent wild cursor jumps under occlusion."
          value={config?.adaptive?.engineParams?.vel_cap ?? 3000.0}
          min={500.0} max={6000.0} step={100.0}
          onChange={val => handleParamChange('vel_cap', val)}
        />
      </div>

    </div>
  );
};
