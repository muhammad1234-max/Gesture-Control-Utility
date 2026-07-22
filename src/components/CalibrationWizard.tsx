import React, { useState, useEffect } from 'react';
import { useAppStore } from '@stores/appStore';
import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { Crosshair, Move, CheckCircle, Hand, X } from 'lucide-react';
import { HandVisualizer } from '@components/HandVisualizer';
import { CalibrationController } from '@controllers';

export default function CalibrationWizard() {
  const config = useAppStore(state => state.config);
  const updateConfig = useAppStore(state => state.updateConfig);
  const showToast = useAppStore(state => state.showToast);
  const setCalibrationOpen = useAppStore(state => state.setCalibrationOpen);

  const [step, setStep] = useState(0);
  const [telemetry, setTelemetry] = useState<{x: number, y: number, dist_l: number, dist_r: number, dist_s: number, landmarks?: {x: number, y: number}[]} | null>(null);

  const [waMinX, setWaMinX] = useState(config?.calibration?.workingArea?.minX || 0.2);
  const [waMaxX, setWaMaxX] = useState(config?.calibration?.workingArea?.maxX || 0.8);
  const [waMinY, setWaMinY] = useState(config?.calibration?.workingArea?.minY || 0.2);
  const [waMaxY, setWaMaxY] = useState(config?.calibration?.workingArea?.maxY || 0.8);
  const [pinchL, setPinchL] = useState(config?.calibration?.pinchThresholds?.left || 0.05);
  const [pinchR, setPinchR] = useState(config?.calibration?.pinchThresholds?.right || 0.05);

  useEffect(() => {
    CalibrationController.begin();
    const unsubscribe = IPCClient.subscribe((data) => {
      if (data.type === 'TELEMETRY' && data.payload) {
        setTelemetry(data.payload);
      }
    });
    return () => {
      CalibrationController.end();
      unsubscribe();
    };
  }, []);

  const saveBounds = (corner: 'top-left' | 'bottom-right') => {
    if (!telemetry) return;
    if (corner === 'top-left') {
      setWaMinX(telemetry.x);
      setWaMinY(telemetry.y);
      showToast('Corner Saved', 'Top-left boundary recorded.', 'success');
    } else {
      setWaMaxX(telemetry.x);
      setWaMaxY(telemetry.y);
      showToast('Corner Saved', 'Bottom-right boundary recorded.', 'success');
    }
  };

  const savePinch = (finger: 'left' | 'right') => {
    if (!telemetry) return;
    if (finger === 'left') {
      setPinchL(telemetry.dist_l * 1.2); 
      showToast('Pinch Recorded', 'Primary click calibrated.', 'success');
    } else {
      setPinchR(telemetry.dist_r * 1.2);
      showToast('Pinch Recorded', 'Secondary click calibrated.', 'success');
    }
  };

  const applyCalibration = () => {
    updateConfig({
      calibration: {
        workingArea: { minX: waMinX, maxX: waMaxX, minY: waMinY, maxY: waMaxY },
        pinchThresholds: { left: pinchL, right: pinchR, scroll: pinchL }
      }
    });
    setStep(4);
    showToast('Calibration Applied', 'Your personalized settings have been saved.', 'success');
    CalibrationController.end();
  };

  const closeWizard = () => {
    setCalibrationOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[var(--animate-native-fade)]">
      <div className="bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded-2xl w-[800px] max-w-[90vw] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-[#0a0a0a]">
          <h2 className="font-semibold text-white">Sensor Calibration</h2>
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
                  <Crosshair className="w-6 h-6" />
                </div>
                <h3 className="text-h2">Step 1: Workspace</h3>
                <p className="text-body text-sm">
                  We'll map your comfortable arm reach to the edges of the screen, so you don't have to reach uncomfortably far to move the cursor.
                </p>
                <button onClick={() => setStep(1)} className="btn-primary mt-4">
                  Start Calibration
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="animate-[var(--animate-native-fade)] space-y-4">
                <div className="w-12 h-12 bg-white/5 text-[var(--color-text-secondary)] rounded-xl flex items-center justify-center">
                  <Move className="w-6 h-6" />
                </div>
                <h3 className="text-h2">Workspace Bounds</h3>
                <p className="text-body text-sm">
                  Point your index finger where you want the <b>TOP-LEFT</b> corner of your screen to be, then click Save. Do the same for the <b>BOTTOM-RIGHT</b>.
                </p>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => saveBounds('top-left')} className="btn-secondary flex-1">
                    Top-Left
                  </button>
                  <button onClick={() => saveBounds('bottom-right')} className="btn-secondary flex-1">
                    Bottom-Right
                  </button>
                </div>
                <button onClick={() => setStep(2)} className="btn-primary w-full mt-4">
                  Next
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-[var(--animate-native-fade)] space-y-4">
                <div className="w-12 h-12 bg-white/5 text-[var(--color-text-secondary)] rounded-xl flex items-center justify-center">
                  <Hand className="w-6 h-6" />
                </div>
                <h3 className="text-h2">Step 2: Pinch Sensitivity</h3>
                <p className="text-body text-sm">
                  Hold your Index + Thumb in a click position and click Index Pinch. Repeat for Middle + Thumb for Right Click.
                </p>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => savePinch('left')} className="btn-secondary flex-1">
                    Index Pinch (Left Click)
                  </button>
                  <button onClick={() => savePinch('right')} className="btn-secondary flex-1">
                    Middle Pinch (Right Click)
                  </button>
                </div>
                <button onClick={() => setStep(3)} className="btn-primary w-full mt-4">
                  Next: Scroll & Zoom
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="animate-[var(--animate-native-fade)] space-y-4">
                <div className="w-12 h-12 bg-white/5 text-[var(--color-text-secondary)] rounded-xl flex items-center justify-center">
                  <Move className="w-6 h-6" />
                </div>
                <h3 className="text-h2">Step 3: Scroll & Zoom Mode</h3>
                <p className="text-body text-sm">
                  Extend your Index and Middle fingers together (Ring/Pinky folded) to engage <b>Smart Scroll</b>. Pinch Thumb toward Index to engage <b>Analog Zoom</b>.
                </p>
                <button onClick={applyCalibration} className="btn-primary w-full mt-4">
                  Apply & Finish Calibration
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="animate-[var(--animate-native-fade)] space-y-4">
                <div className="w-12 h-12 bg-[var(--color-primary)] text-white rounded-xl flex items-center justify-center shadow-[0_0_15px_var(--color-primary)] opacity-80">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-h2">Calibration Complete</h3>
                <p className="text-body text-sm">
                  Your single-handed gesture mapping, workspace reach, and pinch thresholds have been calibrated.
                </p>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setStep(0); CalibrationController.begin(); }} className="btn-secondary flex-1">
                    Restart
                  </button>
                  <button onClick={closeWizard} className="btn-primary flex-1">
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
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Sensor Active</span>
                </div>
                <div className="relative w-full aspect-square border border-[#333] rounded-lg mt-4 bg-[#111] overflow-hidden">
                  <HandVisualizer landmarks={telemetry.landmarks} />
                  
                  {/* Keep abstract cursor for bounds tracking */}
                  <div 
                    className="absolute w-4 h-4 rounded-full border-2 border-[var(--color-primary)]/50 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 pointer-events-none"
                    style={{ left: `${Math.min(Math.max(telemetry.x * 100, 0), 100)}%`, top: `${Math.min(Math.max(telemetry.y * 100, 0), 100)}%` }}
                  >
                    <div className="absolute inset-0 m-auto w-1 h-1 bg-[var(--color-primary)] rounded-full"></div>
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
