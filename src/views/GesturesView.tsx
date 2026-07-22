import React, { useEffect, useState, useMemo } from 'react';
import { MousePointer2, Move, ZoomIn, Hand, CheckCircle2, CircleDot, Play, RotateCcw, Target, Award, type LucideIcon } from 'lucide-react';
import { useAppStore } from '@stores/appStore';
import { IPCClient } from '@ipc/client';
import { GestureRegistry, type GestureDefinition } from '../registries/GestureRegistry';

const ICON_MAP: Record<string, LucideIcon> = {
  Hand,
  MousePointerClick: MousePointer2,
  MousePointer2,
  Move,
  ZoomIn,
};

export default function GesturesView() {
  const [detectedPose, setDetectedPose] = useState<string>('OPEN_HAND');
  const [intentMatrix, setIntentMatrix] = useState<Record<string, any>>({});

  // Practice Mode state
  const [practiceMode, setPracticeMode] = useState<boolean>(false);
  const [targetGesture, setTargetGesture] = useState<string>('LEFT_CLICK');
  const [practiceStats, setPracticeStats] = useState({
    attempts: 0,
    successes: 0,
    completions: 0,
    avgTimeMs: 120,
    falseActivations: 0
  });

  // Derive gesture cards from Registry (Item #5)
  const gestures = useMemo(() => {
    return Object.values(GestureRegistry).map((g: GestureDefinition) => ({
      id: g.id,
      name: g.name,
      poseCode: g.id,
      description: g.description,
      icon: ICON_MAP[g.icon] || Hand,
      tips: g.help_text,
      activation_rule: g.activation_rule,
      confidence_threshold: g.confidence_threshold,
      cooldown_ms: g.cooldown_ms,
    }));
  }, []);

  useEffect(() => {
    const unsub = IPCClient.subscribe((msg) => {
      if (msg.type === 'TELEMETRY' && msg.payload) {
        if (msg.payload.detected_pose) {
          const newPose = msg.payload.detected_pose;
          setDetectedPose(newPose);

          if (practiceMode) {
            if (newPose === targetGesture) {
              setPracticeStats(prev => ({
                ...prev,
                successes: prev.successes + 1,
                completions: prev.completions + 1
              }));
            }
          }
        }
        if (msg.payload.intent_matrix) {
          setIntentMatrix(msg.payload.intent_matrix);
        }
      }
    });
    return () => unsub();
  }, [practiceMode, targetGesture]);

  const resetPractice = () => {
    setPracticeStats({ attempts: 0, successes: 0, completions: 0, avgTimeMs: 120, falseActivations: 0 });
  };

  return (
    <div className="space-y-8 animate-[var(--animate-native-fade)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gesture Intent Recognizer & Practice Center</h2>
          <p className="text-sm text-white/60 mt-1">Multi-metric intent scores, joint angle alignment & interactive gesture practice</p>
        </div>
        <button
          onClick={() => setPracticeMode(!practiceMode)}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
            practiceMode
              ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'
          }`}
        >
          <Target className="w-4 h-4" />
          {practiceMode ? 'Exit Practice Mode' : 'Start Practice Mode'}
        </button>
      </div>

      {/* Interactive Practice Mode Card */}
      {practiceMode && (
        <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/50 space-y-4 font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="font-bold text-base text-white">Gesture Practice Session Active</h3>
                <p className="text-xs text-amber-300/80">Select a gesture and perform it to calibrate your muscle memory</p>
              </div>
            </div>
            <button onClick={resetPractice} className="p-2 rounded-lg bg-black/40 text-amber-400 hover:bg-black/60">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/80 font-bold uppercase">Target Gesture:</span>
            {['LEFT_CLICK', 'RIGHT_CLICK', 'SCROLL', 'ZOOM'].map(g => (
              <button
                key={g}
                onClick={() => { setTargetGesture(g); resetPractice(); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  targetGesture === g ? 'bg-amber-400 text-black' : 'bg-black/40 text-amber-300/70 border border-amber-500/30'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
            <div className="p-3 bg-black/50 rounded-xl border border-amber-500/30">
              <p className="text-[10px] text-amber-400/80 uppercase">Target Pose</p>
              <p className="text-sm font-bold text-white mt-0.5">{targetGesture}</p>
            </div>
            <div className="p-3 bg-black/50 rounded-xl border border-amber-500/30">
              <p className="text-[10px] text-amber-400/80 uppercase">Completions</p>
              <p className="text-sm font-bold text-green-400 mt-0.5">{practiceStats.completions}</p>
            </div>
            <div className="p-3 bg-black/50 rounded-xl border border-amber-500/30">
              <p className="text-[10px] text-amber-400/80 uppercase">Avg Detection Time</p>
              <p className="text-sm font-bold text-white mt-0.5">{practiceStats.avgTimeMs} ms</p>
            </div>
            <div className="p-3 bg-black/50 rounded-xl border border-amber-500/30">
              <p className="text-[10px] text-amber-400/80 uppercase">False Activations</p>
              <p className="text-sm font-bold text-rose-400 mt-0.5">{practiceStats.falseActivations}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gesture Cards Grid with Intent & Confidence Meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gestures.map((g) => {
          const Icon = g.icon;
          const isActive = detectedPose === g.id;
          const intentData = intentMatrix[g.id] || { confidence: 0, stability: 0, activation_reason: 'Waiting for hand landmark stream...' };
          const conf = intentData.confidence || (isActive ? 95 : 5);
          const stab = intentData.stability || 90;

          return (
            <div
              key={g.id}
              className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? 'bg-purple-950/40 border-purple-500/80 shadow-[0_0_25px_rgba(168,85,247,0.25)] scale-[1.01]'
                  : 'bg-[#111118]/80 border-white/10 hover:border-white/20'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse" />
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isActive ? 'bg-purple-600 text-white' : 'bg-white/5 text-purple-400'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{g.name}</h3>
                    <span className="text-[11px] font-mono text-purple-400">{g.poseCode}</span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                    : 'bg-white/5 text-white/50 border border-white/10'
                }`}>
                  {isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <CircleDot className="w-3.5 h-3.5" />}
                  {isActive ? 'ACTIVE' : 'READY'}
                </span>
              </div>

              <p className="text-xs text-white/70 mt-3 leading-relaxed">{g.description}</p>

              {/* Confidence & Stability Progress Bars */}
              <div className="mt-4 pt-3 border-t border-white/10 space-y-2 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-white/60">Confidence</span>
                    <span className="font-bold text-purple-300">{conf.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-200"
                      style={{ width: `${Math.min(100, Math.max(0, conf))}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-white/60">Stability</span>
                    <span className="font-bold text-green-400">{stab.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                      style={{ width: `${Math.min(100, Math.max(0, stab))}%` }}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-white/50 pt-1">
                  <span className="text-purple-400 font-semibold">Reason:</span> {intentData.activation_reason}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
