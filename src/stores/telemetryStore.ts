import { create } from 'zustand';

interface TelemetryState {
  engineActive: boolean;
  cameraOpen: boolean;
  trackingEnabled: boolean;
  configApplied: boolean;
  fps: number;
  latency: number;
  metrics: {
    t_inference_ms: number;
    t_filter_ms: number;
    t_injection_ms: number;
    total_ms: number;
    cpu: number;
    ram_mb: number;
  };
  setEngineActive: (active: boolean) => void;
  setCameraOpen: (open: boolean) => void;
  setTrackingEnabled: (enabled: boolean) => void;
  setConfigApplied: (applied: boolean) => void;
  setFps: (fps: number) => void;
  setLatency: (latency: number) => void;
  setMetrics: (metrics: TelemetryState['metrics']) => void;
  resetState: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  engineActive: false,
  cameraOpen: false,
  trackingEnabled: false,
  configApplied: false,
  fps: 0,
  latency: 0,
  metrics: {
    t_inference_ms: 0,
    t_filter_ms: 0,
    t_injection_ms: 0,
    total_ms: 0,
    cpu: 0,
    ram_mb: 0
  },
  setEngineActive: (engineActive) => set({ engineActive }),
  setCameraOpen: (cameraOpen) => set({ cameraOpen }),
  setTrackingEnabled: (trackingEnabled) => set({ trackingEnabled }),
  setConfigApplied: (configApplied) => set({ configApplied }),
  setFps: (fps) => set({ fps }),
  setLatency: (latency) => set({ latency }),
  setMetrics: (metrics) => set((state) => ({
    metrics: {
      t_inference_ms: metrics?.t_inference_ms ?? 0,
      t_filter_ms: metrics?.t_filter_ms ?? 0,
      t_injection_ms: metrics?.t_injection_ms ?? 0,
      total_ms: metrics?.total_ms ?? 0,
      cpu: metrics?.cpu ?? 0,
      ram_mb: metrics?.ram_mb ?? 0
    }
  })),
  resetState: () => set({ engineActive: false, cameraOpen: false, trackingEnabled: false, configApplied: false, fps: 0, latency: 0, metrics: {t_inference_ms: 0, t_filter_ms: 0, t_injection_ms: 0, total_ms: 0, cpu: 0, ram_mb: 0} }),
}));
