import { create } from 'zustand';

interface TelemetryState {
  engineActive: boolean;
  fps: number;
  latency: number;
  setEngineActive: (active: boolean) => void;
  setFps: (fps: number) => void;
  setLatency: (latency: number) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  engineActive: true,
  fps: 60,
  latency: 4.2,
  setEngineActive: (engineActive) => set({ engineActive }),
  setFps: (fps) => set({ fps }),
  setLatency: (latency) => set({ latency }),
}));
