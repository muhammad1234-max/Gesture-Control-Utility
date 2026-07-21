import { IPCClient } from '@ipc/client';
import { useAppStore } from '@stores/appStore';

export const CalibrationController = {
  begin: async () => {
    try {
      await IPCClient.invokeWithAck('CALIBRATION_MODE', 'CALIBRATION_MODE_ENABLED', 3000, true);
    } catch (e: any) {
      useAppStore.getState().showToast('Calibration Mode Failed', e.message, 'warn');
    }
  },
  end: async () => {
    try {
      await IPCClient.invokeWithAck('CALIBRATION_MODE', 'CALIBRATION_MODE_DISABLED', 3000, false);
    } catch (e: any) {
      useAppStore.getState().showToast('Calibration Exit Failed', e.message, 'warn');
    }
  }
};
