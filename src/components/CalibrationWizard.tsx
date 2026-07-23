import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@stores/appStore';
import { IPCClient } from '@ipc/client';
import { Crosshair, CheckCircle, X, Activity, RefreshCw } from 'lucide-react';
import { HandVisualizer } from '@components/HandVisualizer';
import { CalibrationController } from '@controllers';

export default function CalibrationWizard() {
  const config = useAppStore(state => state.config);
  const updateConfig = useAppStore(state => state.updateConfig);
  const showToast = useAppStore(state => state.showToast);
  const setCalibrationOpen = useAppStore(state => state.setCalibrationOpen);

  const [step, setStep] = useState(0);
  const [telemetry, setTelemetry] = useState<{x: number, y: number, dist_l: number, dist_r: number, pose_peace: boolean, pose_fist: boolean, landmarks?: {x: number, y: number}[]} | null>(null);

  const [calibrating, setCalibrating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  
  const measurements = useRef<{
    xPoints: number[],
    yPoints: number[],
    velocities: number[],
    lastX: number,
    lastY: number,
    lastTime: number
  }>({
    xPoints: [], yPoints: [], velocities: [], lastX: 0, lastY: 0, lastTime: 0
  });

  useEffect(() => {
    CalibrationController.begin();
    const unsubscribe = IPCClient.subscribe((data) => {
      if (data.type === 'TELEMETRY' && data.payload) {
        setTelemetry(data.payload);
        
        if (calibrating) {
            const { x, y } = data.payload;
            const now = performance.now();
            
            measurements.current.xPoints.push(x);
            measurements.current.yPoints.push(y);
            
            if (measurements.current.lastTime > 0) {
                const dt = (now - measurements.current.lastTime) / 1000.0;
                const dx = x - measurements.current.lastX;
                const dy = y - measurements.current.lastY;
                const v = Math.sqrt(dx*dx + dy*dy) / dt;
                measurements.current.velocities.push(v);
            }
            
            measurements.current.lastX = x;
            measurements.current.lastY = y;
            measurements.current.lastTime = now;
        }
      }
    });
    return () => {
      CalibrationController.end();
      unsubscribe();
    };
  }, [calibrating]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (calibrating && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (calibrating && timeLeft === 0) {
      finishCalibration();
    }
    return () => clearTimeout(timer);
  }, [calibrating, timeLeft]);

  const startCalibration = () => {
    measurements.current = { xPoints: [], yPoints: [], velocities: [], lastX: 0, lastY: 0, lastTime: 0 };
    setTimeLeft(5);
    setCalibrating(true);
  };

  const finishCalibration = () => {
    setCalibrating(false);
    
    const { xPoints, yPoints, velocities } = measurements.current;
    
    if (xPoints.length < 10) {
        showToast('Calibration Failed', 'Not enough data collected. Please ensure your hand is visible.', 'warn');
        setStep(0);
        return;
    }
    
    // Calculate Working Area with generous padding
    let minX = Math.min(...xPoints) - 0.15;
    let maxX = Math.max(...xPoints) + 0.15;
    let minY = Math.min(...yPoints) - 0.15;
    let maxY = Math.max(...yPoints) + 0.15;
    
    // Enforce safe minimum bounds (at least 40% of the camera width/height)
    if (maxX - minX < 0.4) {
        const cx = (minX + maxX) / 2;
        minX = cx - 0.2;
        maxX = cx + 0.2;
    }
    
    if (maxY - minY < 0.4) {
        const cy = (minY + maxY) / 2;
        minY = cy - 0.2;
        maxY = cy + 0.2;
    }
    
    // Estimate Velocity/Jitter
    const avgVelocity = velocities.length > 0 ? velocities.reduce((a,b)=>a+b, 0) / velocities.length : 0;
    
    // If high velocity -> lower smoothing needed. If low velocity (jittery) -> higher smoothing.
    const smoothing = avgVelocity > 1.5 ? 0.3 : 0.6;
    const deadzone = avgVelocity > 1.5 ? 1.5 : 3.0;

    updateConfig({
      calibration: {
        ...config.calibration,
        workingArea: { 
            minX: Math.max(0, minX), 
            maxX: Math.min(1, maxX), 
            minY: Math.max(0, minY), 
            maxY: Math.min(1, maxY) 
        }
      },
      adaptive: {
        ...config.adaptive,
        engineParams: {
            ...config.adaptive.engineParams,
            deadzone_px: deadzone,
            mincutoff: 1.0 - smoothing,
            beta: smoothing * 0.2,
            dcutoff: 2.0
        }
      }
    });
    
    setStep(1);
    showToast('Calibration Complete', 'Personalized profile generated.', 'success');
  };

  const closeWizard = () => {
    setCalibrationOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[var(--animate-native-fade)]">
      <div className="bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded-2xl w-[800px] max-w-[90vw] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-[#0a0a0a]">
          <h2 className="font-semibold text-white">Auto Calibration</h2>
          <button onClick={closeWizard} className="text-[#a1a1aa] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex gap-12 bg-[#09090b]">
          <div className="flex-1 space-y-6">
            {step === 0 && (
              <div className="animate-[var(--animate-native-fade)] space-y-4">
                <div className="w-12 h-12 bg-white/5 text-[var(--color-text-secondary)] rounded-xl flex items-center justify-center">
                  {calibrating ? <RefreshCw className="w-6 h-6 animate-spin text-purple-400" /> : <Activity className="w-6 h-6" />}
                </div>
                <h3 className="text-h2">{calibrating ? 'Calibrating...' : 'Personalized Profiling'}</h3>
                
                {calibrating ? (
                  <div className="flex flex-col items-center justify-center py-8">
                     <div className="text-6xl font-bold text-white mb-4">{timeLeft}</div>
                     <p className="text-sm text-white/60">Move your hand naturally across your screen.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-body text-sm">
                      We will observe your natural hand movement for 5 seconds to automatically estimate your comfortable reach, movement speed, and natural jitter.
                    </p>
                    <button onClick={startCalibration} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white w-full mt-4 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                      Start 5-Second Calibration
                    </button>
                  </>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="animate-[var(--animate-native-fade)] space-y-4">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-h2">Profile Generated</h3>
                <p className="text-body text-sm">
                  Your personalized profile has been built and applied. You can always fine-tune these settings later in the Settings panel.
                </p>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setStep(0)} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white flex-1 transition-all">
                    Recalibrate
                  </button>
                  <button onClick={closeWizard} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-white flex-1 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sensor Visualizer */}
          <div className="w-64 bg-[#0a0a0a] rounded-xl border border-[var(--color-border)] p-4 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
            {telemetry ? (
              <>
                <div className="absolute top-2 right-3 flex items-center gap-2 z-10">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Tracking Active</span>
                </div>
                <div className="relative w-full aspect-square border border-[#333] rounded-lg mt-4 bg-[#111] overflow-hidden">
                  <HandVisualizer landmarks={telemetry.landmarks} />
                  
                  {/* Cursor */}
                  <div 
                    className="absolute w-4 h-4 rounded-full border-2 border-purple-500/50 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 pointer-events-none"
                    style={{ left: `${Math.min(Math.max(telemetry.x * 100, 0), 100)}%`, top: `${Math.min(Math.max(telemetry.y * 100, 0), 100)}%` }}
                  >
                    <div className="absolute inset-0 m-auto w-1 h-1 bg-purple-500 rounded-full"></div>
                  </div>
                </div>
              </>
            ) : (
               <div className="text-center z-10">
                 <Crosshair className="w-8 h-8 text-[#333] mx-auto mb-2" />
                 <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">Waiting for Hand</span>
               </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
