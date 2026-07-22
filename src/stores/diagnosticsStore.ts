import { create } from 'zustand';
import { DiagnosticLog } from '@shared/types';
import { SYSTEM_CONSTANTS } from '@shared/constants';

interface DiagnosticsState {
  logs: DiagnosticLog[];
  timeline: string[];
  addLog: (message: string, type?: DiagnosticLog['type']) => void;
  addTimelineEvent: (eventStr: string) => void;
  clearLogs: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
  logs: [],
  timeline: [],
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
  addTimelineEvent: (eventStr) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${eventStr}`;
    set((state) => ({
      timeline: [formatted, ...state.timeline].slice(0, 100)
    }));
  },
  clearLogs: () => set({ logs: [], timeline: [] })
}));
