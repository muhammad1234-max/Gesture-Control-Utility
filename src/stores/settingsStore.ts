import { create } from 'zustand';

interface SettingsState {
  theme: 'dark' | 'light';
  launchOnStartup: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  launchOnStartup: true,
  setTheme: (theme) => set({ theme }),
}));
