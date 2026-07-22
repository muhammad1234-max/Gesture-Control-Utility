import React, { useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { Camera, Hand, MousePointerClick, Move, ZoomIn, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { IPCClient } from '@ipc/client';

export const OnboardingWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const setOnboardingOpen = useAppStore(state => state.setOnboardingOpen);
  const updateConfig = useAppStore(state => state.updateConfig);
  const config = useAppStore(state => state.config);

  const completeOnboarding = () => {
    updateConfig({ onboardingCompleted: true });
    IPCClient.storeSet('appConfig', { ...config, onboardingCompleted: true });
    setOnboardingOpen(false);
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const steps = [
    {
      title: "Camera Detected",
      description: "Welcome to Gesture Control Utility. We'll use your webcam to track your hand and control your cursor without touching your mouse.",
      icon: <Camera className="w-16 h-16 text-purple-400 mb-4" />
    },
    {
      title: "Raise Your Hand",
      description: "Hold your hand up with your palm facing the camera. Ensure your room is well-lit for the best tracking performance.",
      icon: <Hand className="w-16 h-16 text-sky-400 mb-4" />
    },
    {
      title: "Move Cursor",
      description: "Move your open hand around to move the cursor. The system translates your physical hand movement to the screen.",
      icon: <Move className="w-16 h-16 text-emerald-400 mb-4" />
    },
    {
      title: "Pinch to Click & Drag",
      description: "Pinch your index finger and thumb together to Left Click. Hold the pinch to Drag items across your screen.",
      icon: <MousePointerClick className="w-16 h-16 text-indigo-400 mb-4" />
    },
    {
      title: "Peace Sign to Scroll",
      description: "Hold up two fingers (Index and Middle) like a peace sign to activate Scroll Mode. Move your hand up and down to scroll.",
      icon: <CheckCircle2 className="w-16 h-16 text-amber-400 mb-4" />
    },
    {
      title: "Closed Fist to Zoom",
      description: "Close your hand into a fist to activate Zoom Mode. Move your hand up to zoom in, and down to zoom out.",
      icon: <ZoomIn className="w-16 h-16 text-rose-400 mb-4" />
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-8">
      <div className="bg-[#09090d] border border-white/10 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <h2 className="text-sm font-bold text-white tracking-wide">Setup Tutorial</h2>
          </div>
          <button onClick={skipOnboarding} className="text-white/40 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
            Skip
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center">
            {currentStep.icon}
            <h1 className="text-3xl font-bold text-white mb-4">{currentStep.title}</h1>
            <p className="text-lg text-white/60 max-w-md leading-relaxed">{currentStep.description}</p>
          </div>
        </div>

        {/* Footer / Controls */}
        <div className="p-6 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i + 1 ? 'w-6 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'w-2 bg-white/20'}`} />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white/70 hover:bg-white/10 transition-all">
                Back
              </button>
            )}
            
            {step < steps.length ? (
              <button onClick={() => setStep(s => s + 1)} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={completeOnboarding} className="px-8 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-white flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                Finish <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
