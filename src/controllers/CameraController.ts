import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { useAppStore } from '@stores/appStore';

export const CameraController = {
  open: async () => {
    try {
      await IPCClient.invokeWithAck(IPCEventType.OPEN_CAMERA, 'CAMERA_OPENED', 6000);
    } catch (e: any) {
      useAppStore.getState().showToast('Camera Open Failed', e.message, 'warn');
    }
  },
  close: async () => {
    try {
      await IPCClient.invokeWithAck(IPCEventType.CLOSE_CAMERA, 'CAMERA_CLOSED', 4000);
    } catch (e: any) {
      useAppStore.getState().showToast('Camera Close Failed', e.message, 'warn');
    }
  },
  restart: async () => {
    try {
      await IPCClient.invokeWithAck(IPCEventType.CLOSE_CAMERA, 'CAMERA_CLOSED', 4000);
      setTimeout(async () => {
        try {
          await IPCClient.invokeWithAck(IPCEventType.OPEN_CAMERA, 'CAMERA_OPENED', 6000);
        } catch (e: any) {
          useAppStore.getState().showToast('Camera Restart Failed', e.message, 'warn');
        }
      }, 500);
    } catch (e: any) {
      useAppStore.getState().showToast('Camera Restart Failed', e.message, 'warn');
    }
  }
};
