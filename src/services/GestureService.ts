import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { useDiagnosticsStore } from '@stores/diagnosticsStore';
import { useAppStore } from '@stores/appStore';
import { useProfileStore } from '@stores/profileStore';

export class GestureService {
  static simulateGesture(trigger: string) {
    const { activeProfile } = useProfileStore.getState();
    const mapped = activeProfile.gestures.find(g => g.trigger === trigger && g.isActive);
    
    if (mapped) {
      useDiagnosticsStore.getState().addLog(`Gesture recognized: Swipe direction [${trigger.toUpperCase()}] (simulated)`, 'input');
      
      IPCClient.send(IPCEventType.SIMULATE_GESTURE, { trigger, targetAction: mapped.targetAction, name: mapped.name });
      
      useAppStore.getState().showToast(
        `Action Recognized: ${mapped.name}`, 
        `Triggered mapped action: ${mapped.targetAction}`, 
        'success'
      );
    } else {
      useDiagnosticsStore.getState().addLog(`Gesture recognized: [${trigger.toUpperCase()}] - No active mapping configured.`, 'warning');
      useAppStore.getState().showToast(
        `Gesture Tracked`, 
        `Recognized [${trigger.toUpperCase()}], but no action mapped.`, 
        'warn'
      );
    }
  }
  
  static simulateWarning(msg: string) {
    useDiagnosticsStore.getState().addLog(`Pipeline warning check: ${msg}`, 'warning');
    useAppStore.getState().showToast('Tracking Degraded', msg, 'warn');
  }
}
