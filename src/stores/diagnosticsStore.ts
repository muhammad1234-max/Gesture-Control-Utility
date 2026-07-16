import { create } from 'zustand';
import { DiagnosticLog } from '@shared/types';
import { SYSTEM_CONSTANTS } from '@shared/constants';

interface DiagnosticsState {
  logs: DiagnosticLog[];
  addLog: (message: string, type?: DiagnosticLog['type']) => void;
  clearLogs: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
  logs: [],
  addLog: (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: DiagnosticLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      message,
      type
    };
    set((state) => ({
      logs: [newLog, ...state.logs].slice(0, SYSTEM_CONSTANTS.MAX_LOG_HISTORY)
    }));
  },
  clearLogs: () => set({ logs: [] })
}));
