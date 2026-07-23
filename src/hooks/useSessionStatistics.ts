import { useEffect, useRef } from 'react';
import { IPCClient } from '@ipc/client';

export const useSessionStatistics = () => {
  const stats = useRef({
    startTime: 0,
    trackingMs: 0,
    fpsSum: 0,
    reliabilitySum: 0,
    frameCount: 0,
    clicks: 0,
    drags: 0,
    scrollTicks: 0,
    zoomTicks: 0,
    trackingLosses: 0,
    lastTrackingState: 'NO_HAND',
    lastGesture: 'NONE'
  });

  useEffect(() => {
    const unsub = IPCClient.subscribe((msg) => {
      if (msg.type === 'ENGINE_STARTED') {
        stats.current = {
          startTime: performance.now(),
          trackingMs: 0,
          fpsSum: 0,
          reliabilitySum: 0,
          frameCount: 0,
          clicks: 0,
          drags: 0,
          scrollTicks: 0,
          zoomTicks: 0,
          trackingLosses: 0,
          lastTrackingState: 'NO_HAND',
          lastGesture: 'NONE'
        };
      } 
      else if (msg.type === 'TELEMETRY' && msg.payload) {
        const payload = msg.payload;
        
        // Track tracking time
        if (payload.subsystems?.tracking === 'TRACKING') {
            stats.current.trackingMs += 33.33; // Approx 1 frame
        }

        // Track tracking loss
        if (payload.subsystems?.tracking === 'NO_HAND' && stats.current.lastTrackingState === 'TRACKING') {
            stats.current.trackingLosses++;
        }
        if (payload.subsystems?.tracking) {
            stats.current.lastTrackingState = payload.subsystems.tracking;
        }

        // Track FPS and Reliability
        if (payload.fps) {
            stats.current.fpsSum += payload.fps;
            stats.current.reliabilitySum += (payload.tracking_quality || 0);
            stats.current.frameCount++;
        }

        // Track Gestures
        if (payload.active_intent && payload.active_intent !== stats.current.lastGesture) {
            if (payload.active_intent === 'LEFT_CLICK') stats.current.clicks++;
            if (payload.active_intent === 'DRAG') stats.current.drags++;
        }
        
        if (payload.active_intent === 'SCROLL') stats.current.scrollTicks++;
        if (payload.active_intent === 'ZOOM') stats.current.zoomTicks++;
        
        if (payload.active_intent) {
            stats.current.lastGesture = payload.active_intent;
        }
      }
      else if (msg.type === 'ENGINE_DIED' || msg.type === 'ENGINE_STOPPED') {
          // Finalize session
          if (stats.current.frameCount > 0) {
              const avgFps = stats.current.fpsSum / stats.current.frameCount;
              const avgReliability = stats.current.reliabilitySum / stats.current.frameCount;
              const trackingTimeSecs = stats.current.trackingMs / 1000;
              
              const sessionSummary = {
                  date: new Date().toISOString(),
                  trackingTimeSecs: trackingTimeSecs.toFixed(1),
                  avgFps: avgFps.toFixed(1),
                  avgReliability: avgReliability.toFixed(1),
                  clicks: stats.current.clicks,
                  drags: stats.current.drags,
                  trackingLosses: stats.current.trackingLosses
              };
              
              console.log("[Session Statistics]", sessionSummary);
              
              // Save to localStorage
              const existingStr = localStorage.getItem('gccc_session_stats');
              let existing = [];
              if (existingStr) {
                  try { existing = JSON.parse(existingStr); } catch (e) {}
              }
              existing.unshift(sessionSummary);
              localStorage.setItem('gccc_session_stats', JSON.stringify(existing.slice(0, 50)));
          }
      }
    });

    return () => { unsub(); };
  }, []);
};
