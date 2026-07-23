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
    // Extended performance metrics used by DeveloperPanel
    fps: number;
    avg_frame_ms: number;
    max_frame_ms: number;
    p99_frame_ms: number;
    dropped_frames: number;
  };
  setEngineActive: (active: boolean) => void;
  setCameraOpen: (open: boolean) => void;
  setTrackingEnabled: (enabled: boolean) => void;
  setConfigApplied: (applied: boolean) => void;
  setFps: (fps: number) => void;
  setLatency: (latency: number) => void;
  setMetrics: (metrics: Partial<TelemetryState['metrics']>) => void;
  resetState: () => void;
}

const defaultMetrics: TelemetryState['metrics'] = {
  t_inference_ms: 0,
  t_filter_ms: 0,
  t_injection_ms: 0,
  total_ms: 0,
  cpu: 0,
  ram_mb: 0,
  fps: 0,
  avg_frame_ms: 0,
  max_frame_ms: 0,
  p99_frame_ms: 0,
  dropped_frames: 0,
};

export const useTelemetryStore = create<TelemetryState>((set) => ({
  engineActive: false,
  cameraOpen: false,
  trackingEnabled: false,
  configApplied: false,
  fps: 0,
  latency: 0,
  metrics: { ...defaultMetrics },
  setEngineActive: (engineActive) => set({ engineActive }),
  setCameraOpen: (cameraOpen) => set({ cameraOpen }),
  setTrackingEnabled: (trackingEnabled) => set({ trackingEnabled }),
  setConfigApplied: (configApplied) => set({ configApplied }),
  setFps: (fps) => set({ fps }),
  setLatency: (latency) => set({ latency }),
  setMetrics: (metrics) => set((state) => ({
    metrics: { ...state.metrics, ...metrics }
  })),
  resetState: () => set({
    engineActive: false,
    cameraOpen: false,
    trackingEnabled: false,
    configApplied: false,
    fps: 0,
    latency: 0,
    metrics: { ...defaultMetrics }
  }),
}));
