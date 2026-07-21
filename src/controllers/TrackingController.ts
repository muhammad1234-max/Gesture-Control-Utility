import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { useAppStore } from '@stores/appStore';

export const TrackingController = {
  start: async () => {
    try {
      await IPCClient.invokeWithAck(IPCEventType.START_TRACKING, 'TRACKING_STARTED', 3000);
    } catch (e: any) {
      useAppStore.getState().showToast('Tracking Start Failed', e.message, 'warn');
    }
  },
  stop: async () => {
    try {
      await IPCClient.invokeWithAck(IPCEventType.STOP_TRACKING, 'TRACKING_STOPPED', 3000);
    } catch (e: any) {
      useAppStore.getState().showToast('Tracking Stop Failed', e.message, 'warn');
    }
  }
};
