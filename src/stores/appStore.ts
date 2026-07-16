import { create } from 'zustand';
import { AppConfig, DEFAULT_CONFIG, CalibrationProfile } from '@shared/types';
import { IPCClient } from '../ipc/client';
import { IPCEventType } from '@shared/events';

export type TabId = 'dashboard' | 'library' | 'sandbox' | 'calibration' | 'profiles' | 'benchmarking';

interface AppState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  toast: { id: string; title: string; message: string; type: 'success' | 'warn' } | null;
  showToast: (title: string, message: string, type: 'success' | 'warn') => void;
  clearToast: (id: string) => void;
  
  // Phase 7 config state
  config: AppConfig;
  profiles: CalibrationProfile[];
  updateConfig: (partial: Partial<AppConfig>) => void;
  setConfigFromServer: (config: AppConfig) => void;
  setProfilesFromServer: (profiles: CalibrationProfile[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  toast: null,
  showToast: (title, message, type) => {
    const id = Math.random().toString(36).substring(7);
    set({ toast: { id, title, message, type } });
    setTimeout(() => {
      set((state) => (state.toast?.id === id ? { toast: null } : state));
    }, 4000);
  },
  clearToast: (id) => set((state) => (state.toast?.id === id ? { toast: null } : state)),

  config: DEFAULT_CONFIG,
  profiles: [],
  updateConfig: (partial) => {
    set((state) => {
      const newConfig = { ...state.config, ...partial };
      IPCClient.send(IPCEventType.CONFIG_UPDATE, partial);
      return { config: newConfig };
    });
  },
  setConfigFromServer: (config) => set({ config }),
  setProfilesFromServer: (profiles) => set({ profiles }),
}));
