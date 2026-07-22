import React, { useState, useEffect } from 'react';
import { useTelemetryStore } from '@stores/telemetryStore';
import { useAppStore } from '@stores/appStore';
import { useDiagnosticsStore } from '@stores/diagnosticsStore';
import { X, Activity, History } from 'lucide-react';
import { IPCClient } from '@ipc/client';

export const DiagnosticsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const [engineStatus, setEngineStatus] = useState<any>({});
  const [telemetry, setTelemetry] = useState<any>(null);
  const [interactionHistory, setInteractionHistory] = useState<any[]>([]);

  const config = useAppStore(state => state.config);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      interval = setInterval(() => {
        IPCClient.invoke('GET_STATUS');
      }, 1000);
      
      const unsub = IPCClient.subscribe(msg => {
        if (msg.type === 'ENGINE_STATUS') {
          setEngineStatus(msg.payload || {});
        } else if (msg.type === 'TELEMETRY' && msg.payload) {
          setTelemetry(msg.payload);
          
          // Track Interaction History
          if (msg.payload.active_intent) {
              setInteractionHistory(prev => {
                  if (prev.length === 0 || prev[0].gesture !== msg.payload.active_intent) {
                      const newHistory = [{
                          gesture: msg.payload.active_intent,
                          reliability: msg.payload.tracking_quality || 0,
                          timestamp: new Date().toLocaleTimeString(),
                          start_ms: performance.now(),
                          duration: '0ms'
                      }, ...prev].slice(0, 10); // Keep last 10
                      
                      // Finalize previous duration
                      if (prev.length > 0) {
                          newHistory[1].duration = `${(performance.now() - prev[0].start_ms).toFixed(0)}ms`;
                      }
                      
                      return newHistory;
                  } else {
                      // Update current reliability if fluctuating
                      const updated = [...prev];
                      updated[0].reliability = Math.round((updated[0].reliability + (msg.payload.tracking_quality || 0)) / 2);
                      updated[0].duration = `${(performance.now() - updated[0].start_ms).toFixed(0)}ms`;
                      return updated;
                  }
              });
          }
        }
      });
      return () => { clearInterval(interval); unsub(); };
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg z-50 flex items-center gap-2 pr-4 transition-all"
      >
        <Activity className="w-5 h-5" />
        <span className="text-sm font-medium">Dev Diagnostics</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[450px] bg-black/95 border border-purple-500/30 backdrop-blur-xl rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col font-mono text-[11px] text-purple-200">
      <div className="flex justify-between items-center p-3 border-b border-purple-500/30 bg-purple-900/20">
        <div className="flex items-center gap-2 text-purple-400 font-semibold uppercase tracking-wider">
          <Activity className="w-4 h-4" />
          Runtime Diagnostics
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 space-y-5 max-h-[75vh] overflow-y-auto no-scrollbar">
        
        {/* Phase 12 Telemetry */}
        <div className="space-y-1">
          <h3 className="text-purple-400 font-bold mb-2">TRACKING TELEMETRY</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-white/5 p-3 rounded-lg">
            <span>Tracking State:</span> <span className="text-emerald-400">{telemetry?.subsystems?.tracking || 'OFFLINE'}</span>
            <span>Active Gesture:</span> <span className="text-white font-bold">{telemetry?.active_intent || 'NONE'}</span>
            <span>Reliability Score:</span> <span className="text-white">{telemetry?.tracking_quality?.toFixed(1) ?? '0.0'}%</span>
            <span>Frame Quality:</span> <span className="text-white">{telemetry?.frame_quality?.toFixed(1) ?? '0.0'}%</span>
            <span>Current FPS:</span> <span className="text-white">{telemetry?.fps ?? 0}</span>
            <span>Inference Time:</span> <span className="text-white">{telemetry?.metrics?.t_inference_ms?.toFixed(1) ?? 0} ms</span>
            <span>Camera State:</span> <span className={telemetry?.subsystems?.camera === 'READY' ? 'text-emerald-400' : 'text-red-400'}>{telemetry?.subsystems?.camera || 'OFFLINE'}</span>
            <span>Lighting:</span> <span className="text-white">{telemetry?.reliability_flags?.includes('LOW_LIGHT') ? 'Poor (LOW_LIGHT)' : 'Good'}</span>
          </div>
          {telemetry?.reliability_flags && telemetry.reliability_flags.length > 0 && (
             <div className="mt-2 text-red-400 bg-red-500/10 p-2 rounded text-[10px]">
               Flags: {telemetry.reliability_flags.join(', ')}
             </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-400 font-bold mb-2">
            <History className="w-3.5 h-3.5" />
            INTERACTION HISTORY
          </div>
          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="grid grid-cols-4 gap-2 p-2 border-b border-white/5 text-purple-300 font-semibold bg-white/5">
              <span>Gesture</span>
              <span>Duration</span>
              <span>Reliability</span>
              <span>Time</span>
            </div>
            {interactionHistory.length === 0 && (
              <div className="p-4 text-center text-white/40">No interactions recorded yet.</div>
            )}
            {interactionHistory.map((h, i) => (
               <div key={i} className="grid grid-cols-4 gap-2 p-2 border-b border-white/5 last:border-0 text-white/80">
                 <span className="truncate">{h.gesture}</span>
                 <span>{h.duration}</span>
                 <span>{h.reliability}%</span>
                 <span className="text-white/50">{h.timestamp}</span>
               </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
