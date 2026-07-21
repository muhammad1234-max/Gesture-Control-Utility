import { create } from 'zustand';

interface TelemetryState {
  engineActive: boolean;
  cameraOpen: boolean;
  trackingEnabled: boolean;
  configApplied: boolean;
  fps: number;
  latency: number;
  setEngineActive: (active: boolean) => void;
  setCameraOpen: (open: boolean) => void;
  setTrackingEnabled: (enabled: boolean) => void;
  setConfigApplied: (applied: boolean) => void;
  setFps: (fps: number) => void;
  setLatency: (latency: number) => void;
  resetState: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  engineActive: false,
  cameraOpen: false,
  trackingEnabled: false,
  configApplied: false,
  fps: 0,
  latency: 0,
  setEngineActive: (engineActive) => set({ engineActive }),
  setCameraOpen: (cameraOpen) => set({ cameraOpen }),
  setTrackingEnabled: (trackingEnabled) => set({ trackingEnabled }),
  setConfigApplied: (configApplied) => set({ configApplied }),
  setFps: (fps) => set({ fps }),
  setLatency: (latency) => set({ latency }),
  resetState: () => set({ engineActive: false, cameraOpen: false, trackingEnabled: false, configApplied: false, fps: 0, latency: 0 }),
}));
