import React, { useEffect, useState } from 'react';
import { IPCClient } from '@ipc/client';
import { Lock, MousePointer2, Move, ZoomIn, Hand, MousePointerClick } from 'lucide-react';

export const GestureFeedbackOverlay: React.FC = () => {
  const [activeGesture, setActiveGesture] = useState<string>('OPEN_HAND');
  const [confidence, setConfidence] = useState<number>(95);
  const [clickPulse, setClickPulse] = useState<boolean>(false);

  useEffect(() => {
    const unsub = IPCClient.subscribe((msg) => {
      if (msg.type === 'TELEMETRY' && msg.payload) {
        if (msg.payload.detected_pose) {
          const pose = msg.payload.detected_pose;
          setActiveGesture(pose);
          if (pose === 'LEFT_CLICK' || pose === 'RIGHT_CLICK') {
            setClickPulse(true);
            setTimeout(() => setClickPulse(false), 250);
          }
        }
        if (msg.payload.intent_matrix && msg.payload.detected_pose) {
          const intentData = msg.payload.intent_matrix[msg.payload.detected_pose];
          if (intentData?.confidence !== undefined) {
            setConfidence(intentData.confidence);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  if (activeGesture === 'NONE') return null;

  const isScroll = activeGesture === 'SCROLL';
  const isZoom = activeGesture === 'ZOOM';
  const isLocking = isScroll || isZoom;

  const getGestureMeta = () => {
    switch (activeGesture) {
      case 'LEFT_CLICK':
        return { title: 'Left Click & Drag', icon: MousePointerClick, color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' };
      case 'RIGHT_CLICK':
        return { title: 'Right Click', icon: MousePointer2, color: 'text-indigo-400', bg: 'bg-indigo-500/20 border-indigo-500/40' };
      case 'SCROLL':
        return { title: 'Touchpad Scroll Active', icon: Move, color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' };
      case 'ZOOM':
        return { title: 'Analog Zoom Active', icon: ZoomIn, color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' };
      default:
        return { title: 'Cursor Tracking', icon: Hand, color: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-500/40' };
    }
  };

  const meta = getGestureMeta();
  const Icon = meta.icon;
  const strokeDash = (confidence / 100) * 88; // 2 * PI * r (14) = ~88

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none transition-all duration-300">
      <div className={`px-4 py-2.5 rounded-2xl bg-[#09090d]/90 backdrop-blur-xl border shadow-2xl flex items-center gap-3.5 text-white ${
        isLocking ? 'border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)]' : 'border-white/10'
      } ${clickPulse ? 'scale-105 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : ''}`}>
        
        {/* Animated Confidence Ring */}
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
          <svg className="w-8 h-8 transform -rotate-90">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" className="text-white/10" fill="transparent" />
            <circle
              cx="16" cy="16" r="14"
              stroke="currentColor"
              strokeWidth="2.5"
              className={meta.color}
              fill="transparent"
              strokeDasharray="88"
              strokeDashoffset={88 - strokeDash}
              strokeLinecap="round"
            />
          </svg>
          <Icon className={`w-4 h-4 absolute ${meta.color}`} />
        </div>

        {/* Text Details */}
        <div>
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-white/60">
            {isLocking && <Lock className="w-3 h-3 text-amber-400" />}
            {isLocking ? 'CURSOR LOCKED' : 'GESTURE ACTIVE'}
          </div>
          <p className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
            {meta.title}
            <span className="text-[10px] font-mono text-white/50">({confidence.toFixed(0)}%)</span>
          </p>
        </div>
      </div>
    </div>
  );
};
