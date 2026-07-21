import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { useAppStore } from '@stores/appStore';

export const EngineController = {
  start: async () => {
    try {
      await IPCClient.invokeWithAck(IPCEventType.START_ENGINE, 'ENGINE_STARTED', 8000);
    } catch (e: any) {
      useAppStore.getState().showToast('Engine Start Failed', e.message, 'warn');
    }
  },
  stop: async () => {
    try {
      // main.ts will broadcast ENGINE_DIED when the daemon exits
      await IPCClient.invokeWithAck(IPCEventType.STOP_ENGINE, 'ENGINE_DIED', 5000);
    } catch (e: any) {
      useAppStore.getState().showToast('Engine Stop Failed', e.message, 'warn');
    }
  },
  restart: async () => {
    try {
      await IPCClient.invokeWithAck(IPCEventType.STOP_ENGINE, 'ENGINE_DIED', 5000);
      setTimeout(async () => {
        try {
          await IPCClient.invokeWithAck(IPCEventType.START_ENGINE, 'ENGINE_STARTED', 8000);
        } catch (e: any) {
          useAppStore.getState().showToast('Engine Restart Failed', e.message, 'warn');
        }
      }, 500);
    } catch (e: any) {
      useAppStore.getState().showToast('Engine Restart Failed', e.message, 'warn');
    }
  }
};
