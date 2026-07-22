import { IPCClient } from '@ipc/client';
import { useEngineStore } from '@stores/engineStore';

export const EngineController = {
  start: async () => {
    try {
      useEngineStore.getState().setEngineState('STARTING', 10, 'Spawning Python process...');
      await IPCClient.invoke('START_ENGINE');
    } catch (e: any) {
      useEngineStore.getState().setEngineState('ERROR', 0, e.message || 'Failed to start engine');
    }
  },
  stop: async () => {
    try {
      useEngineStore.getState().setEngineState('STOPPING', 0, 'Stopping engine...');
      await IPCClient.invoke('STOP_ENGINE');
    } catch (e: any) {
      useEngineStore.getState().setEngineState('ERROR', 0, e.message || 'Failed to stop engine');
    }
  },
  restart: async () => {
    try {
      useEngineStore.getState().setEngineState('RESTARTING', 0, 'Restarting engine...');
      await IPCClient.invoke('RESTART_ENGINE');
    } catch (e: any) {
      useEngineStore.getState().setEngineState('ERROR', 0, e.message || 'Failed to restart engine');
    }
  }
};
