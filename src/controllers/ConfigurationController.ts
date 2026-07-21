import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { useAppStore } from '@stores/appStore';
import { AppConfig } from '@shared/types';

export const ConfigurationController = {
  apply: async (partialConfig: Partial<AppConfig>) => {
    try {
      // 1. Mutate Zustand state
      const currentConfig = useAppStore.getState().config;
      const newConfig = { ...currentConfig, ...partialConfig };
      useAppStore.getState().setConfigFromServer(newConfig);
      
      // 2. Save locally
      await IPCClient.storeSet('appConfig', newConfig);
      
      // 3. Issue IPC command to Python
      await IPCClient.invokeWithAck('CONFIG', 'CONFIG_APPLIED', 3000, newConfig);
    } catch (e: any) {
      useAppStore.getState().showToast('Configuration Failed', e.message, 'warn');
    }
  },
  reload: async () => {
    try {
      await IPCClient.invokeWithAck(IPCEventType.RELOAD_CONFIG, 'CONFIG_APPLIED', 3000);
    } catch (e: any) {
      useAppStore.getState().showToast('Reload Config Failed', e.message, 'warn');
    }
  }
};
