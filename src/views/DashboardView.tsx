import React, { useEffect, useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { IPCClient } from '@ipc/client';
import { HandVisualizer } from '@components/HandVisualizer';
import { Crosshair, HandMetal, AlertTriangle } from 'lucide-react';
import { useTelemetryStore } from '@stores/telemetryStore';
import { EmptyState } from '@components/EmptyState';

export default function DashboardView() {
  const setCalibrationOpen = useAppStore(state => state.setCalibrationOpen);
  const config = useAppStore(state => state.config);
  const engineActive = useTelemetryStore(state => state.engineActive);

  // For the dashboard, we want to show the live skeleton whenever a hand is visible.
  // In normal mode, daemon doesn't emit full landmarks in TELEMETRY unless calibration_mode is true.
  // Actually, we modified daemon to emit landmarks in TELEMETRY in calibration mode. 
  // Let's enable calibration_mode in the background while dashboard is open just to get the visualizer feed, 
  // OR we can just instruct the backend to emit it always if the engine is active.
  
  const [telemetry, setTelemetry] = useState<{x: number, y: number, landmarks?: {x: number, y: number}[]} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // If we want the skeleton to be live on the dashboard without breaking cursor movement, 
    // the daemon needs to send landmarks during normal operation. 
    // For now, we will rely on IPC 'CAMERA_TELEMETRY' or broadcast events.
    const unsubscribe = IPCClient.subscribe((data) => {
      // In a real scenario, we'd have the daemon always send landmarks in a separate event 
      // or modify the Python script. For now, we listen to whatever it broadcasts.
      if (data.type === 'TELEMETRY' && data.payload) {
         setTelemetry(data.payload);
         setErrorMsg(null); // Clear any previous errors on successful telemetry
      } else if (data.type === 'ERROR' && data.payload) {
         setErrorMsg(data.payload);
         setTelemetry(null);
      }
    });
    
    // To get live data without hijacking the cursor (since CALIBRATION_MODE disables cursor),
    // we assume the daemon was updated, or we just show a static placeholder if no data.
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6 animate-[var(--animate-native-fade)]">
      <div>
        <h2 className="text-h1">Dashboard</h2>
        <p className="text-body mt-1">System status and live tracking feed.</p>
      </div>

      {!engineActive ? (
        <EmptyState
          icon={AlertTriangle}
          title="Engine Suspended"
          description="The tracking engine is currently stopped. Toggle the master switch in the header to resume gesture control."
        />
      ) : errorMsg ? (
        <EmptyState
          icon={AlertTriangle}
          title="Hardware Error"
          description={errorMsg}
        />
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Main Visualizer Panel */}
          <div className="col-span-2 card p-1 flex flex-col relative overflow-hidden min-h-[300px] group">
            <div className="absolute inset-0 bg-[#0a0a0a] z-0 opacity-80" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
            
            <h2 className="text-xl font-bold text-gray-100 mb-6 flex items-center gap-3">
              Dashboard
            </h2>
            
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
              <span className="text-xs font-mono text-white/70 uppercase tracking-widest">Live Feed</span>
            </div>

            <div className="absolute top-4 right-4 z-10">
               <button onClick={() => setCalibrationOpen(true)} className="btn-secondary text-xs py-1.5 px-3">
                 Recalibrate Workspace
               </button>
            </div>

            <div className="flex-1 relative z-1 flex items-center justify-center">
               {telemetry && telemetry.landmarks ? (
                  <div className="w-64 h-64 relative border border-[#333] rounded-xl bg-[#111] overflow-hidden">
                    <HandVisualizer landmarks={telemetry.landmarks} />
                  </div>
               ) : (
                  <div className="text-center">
                    <Crosshair className="w-8 h-8 text-[#333] mx-auto mb-2" />
                    <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">Awaiting Hand</span>
                  </div>
               )}
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="col-span-1 flex flex-col gap-4">
             <div className="card p-5 flex-1 flex flex-col justify-center items-center text-center">
               <HandMetal className="w-8 h-8 text-[var(--color-primary)] mb-3 opacity-80" />
               <h3 className="text-2xl font-semibold text-white">Active</h3>
               <span className="text-xs text-white/50 uppercase tracking-widest mt-1">Sensor State</span>
             </div>
             
             <div className="card p-5 flex-1 flex flex-col justify-center items-center text-center">
               <h3 className="text-2xl font-semibold text-white">{config?.gestureMap?.scrollEnabled ? 'ON' : 'OFF'}</h3>
               <span className="text-xs text-white/50 uppercase tracking-widest mt-1">Smart Scroll</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
