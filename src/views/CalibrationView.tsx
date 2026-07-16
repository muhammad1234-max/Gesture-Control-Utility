import React, { useState } from 'react';
import { useCameraStore } from '@stores/cameraStore';
import { Camera, Sun, Hand, Maximize, Target, MousePointer2, Settings2, Play, CheckCircle2 } from 'lucide-react';
import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';

type StepId = 'lighting' | 'camera' | 'workspace' | 'hand' | 'reach' | 'cursor' | 'gesture' | 'practice' | 'done';

const WIZARD_STEPS: { id: StepId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'lighting', label: 'Lighting Check', icon: Sun, description: 'Ensure your room has adequate lighting for hand tracking.' },
  { id: 'camera', label: 'Camera Position', icon: Camera, description: 'Position the camera at eye level, angled slightly down.' },
  { id: 'workspace', label: 'Workspace Detection', icon: Maximize, description: 'Define the physical area where you will move your hands.' },
  { id: 'hand', label: 'Hand Detection', icon: Hand, description: 'Place your dominant hand in the center of the frame.' },
  { id: 'reach', label: 'Reach Test', icon: Target, description: 'Move your hand to the four corners of your workspace.' },
  { id: 'cursor', label: 'Cursor Speed', icon: MousePointer2, description: 'Adjust how quickly the mouse responds to your movement.' },
  { id: 'gesture', label: 'Gesture Sensitivity', icon: Settings2, description: 'Calibrate the pinch and grab thresholds.' },
  { id: 'practice', label: 'Practice', icon: Play, description: 'Try out the gestures in a safe environment.' },
];

export default function CalibrationView() {
  const activeDevice = useCameraStore(state => state.activeDevice);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const activeStep = WIZARD_STEPS[activeStepIndex];

  const handleNext = () => {
    if (activeStep.id === 'workspace') {
      IPCClient.send(IPCEventType.CALIBRATION_FINISH, {});
    }

    if (activeStepIndex < WIZARD_STEPS.length - 1) {
      setActiveStepIndex(prev => prev + 1);
    } else {
      setActiveStepIndex(0); // Restart or close
    }
  };

  const handleBack = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex bg-[#14171d] rounded-2xl border border-slate-800/60 overflow-hidden shadow-sm">
      {/* Wizard Sidebar */}
      <div className="w-64 border-r border-slate-800/60 bg-slate-900/30 p-6 flex flex-col">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-6">Calibration Setup</h3>
        
        <div className="flex-1 space-y-4">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < activeStepIndex;
            const isActive = index === activeStepIndex;
            
            return (
              <div key={step.id} className="flex items-start gap-3">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                  isCompleted ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                  isActive ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' :
                  'bg-slate-800/50 border-slate-700 text-slate-500'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <div className={`text-sm ${isActive ? 'text-slate-200 font-medium' : isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-8 bg-[#0c0e12]">
        <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col justify-center">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-emerald-400 mb-6">
              <activeStep.icon className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-semibold text-slate-100 mb-3">{activeStep.label}</h2>
            <p className="text-slate-400 text-lg">{activeStep.description}</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 min-h-[300px] flex items-center justify-center shadow-inner">
            
            {activeStep.id === 'lighting' && (
              <div className="text-center space-y-4">
                <div className="text-emerald-400 text-sm font-medium bg-emerald-500/10 inline-block px-3 py-1 rounded-full border border-emerald-500/20">
                  Checking Exposure...
                </div>
                <p className="text-slate-300">Your room lighting looks good. Avoid placing bright windows directly behind you.</p>
              </div>
            )}

            {activeStep.id === 'camera' && (
              <div className="text-center space-y-4">
                {!activeDevice ? (
                  <p className="text-rose-400">No camera detected. Please connect a camera.</p>
                ) : (
                  <div>
                    <div className="w-64 h-48 bg-slate-800 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center mb-4 mx-auto">
                      <span className="text-slate-500 text-sm">Camera Feed Placeholder</span>
                    </div>
                    <p className="text-slate-300">Ensure you are visible from the waist up.</p>
                  </div>
                )}
              </div>
            )}

            {activeStep.id === 'workspace' && (
              <div className="text-center space-y-4">
                <p className="text-slate-300 mb-4">Click "Start Sampling" and trace a large rectangle in the air to define your screen bounds.</p>
                <button 
                  onClick={() => IPCClient.send(IPCEventType.CALIBRATION_START, {})}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Start Sampling
                </button>
              </div>
            )}

            {(activeStep.id === 'hand' || activeStep.id === 'reach' || activeStep.id === 'cursor' || activeStep.id === 'gesture' || activeStep.id === 'practice') && (
              <div className="text-center space-y-4 text-slate-400 italic">
                Interactive component rendering...
              </div>
            )}

          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800/60 max-w-4xl mx-auto w-full">
          <button 
            onClick={handleBack}
            disabled={activeStepIndex === 0}
            className={`px-6 py-2.5 font-medium rounded-lg transition-colors cursor-pointer ${
              activeStepIndex === 0 ? 'text-slate-600 bg-slate-900 cursor-not-allowed' : 'text-slate-300 bg-slate-800 hover:bg-slate-700'
            }`}
          >
            Back
          </button>

          <button 
            onClick={handleNext}
            className="px-8 py-2.5 font-medium rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {activeStepIndex === WIZARD_STEPS.length - 1 ? 'Finish Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
