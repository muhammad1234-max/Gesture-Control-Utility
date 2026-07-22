import { useEffect, useRef } from 'react';
import { IPCClient } from '@ipc/client';
import { useAppStore } from '@stores/appStore';

export const useSmartNotifications = () => {
  const showToast = useAppStore(state => state.showToast);
  
  const lastState = useRef({
    camera: 'DISCONNECTED',
    tracking: 'NO_HAND',
    lowLight: false
  });

  useEffect(() => {
    const unsub = IPCClient.subscribe((msg) => {
      if (msg.type === 'TELEMETRY' && msg.payload) {
        const payload = msg.payload;
        
        // Camera events
        if (payload.subsystems?.camera && payload.subsystems.camera !== lastState.current.camera) {
          if (payload.subsystems.camera === 'READY' && lastState.current.camera !== 'DISCONNECTED') {
            showToast('Camera Connected', 'Tracking is now ready.', 'success');
          } else if (payload.subsystems.camera === 'ERROR') {
            showToast('Camera Busy', 'Your camera is currently being used by another application.', 'warn');
          }
          lastState.current.camera = payload.subsystems.camera;
        }
        
        // Tracking events & Errors
        if (payload.subsystems?.tracking && payload.subsystems.tracking !== lastState.current.tracking) {
          if (payload.subsystems.tracking === 'DEGRADED_TRACKING') {
             // Subtle warning, wait for loss
          } else if (payload.subsystems.tracking === 'NO_HAND' && lastState.current.tracking === 'TRACKING') {
            showToast('Tracking Lost', 'Hand temporarily lost. Raise your hand into view.', 'warn');
          } else if (payload.subsystems.tracking === 'TRACKING' && lastState.current.tracking === 'NO_HAND') {
            showToast('Tracking Restored', 'Gesture engine is active.', 'success');
          }
          lastState.current.tracking = payload.subsystems.tracking;
        }

        // Low light warning
        const isLowLight = payload.reliability_flags?.includes('LOW_LIGHT') || false;
        if (isLowLight && !lastState.current.lowLight) {
          showToast('Poor Lighting', 'Lighting is too dim for reliable tracking.', 'warn');
        }
        lastState.current.lowLight = isLowLight;
      }
    });

    return () => unsub();
  }, [showToast]);
};
