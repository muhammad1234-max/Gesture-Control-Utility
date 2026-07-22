import React, { useEffect, useState, useRef } from 'react';
import { IPCClient } from '@ipc/client';
import { Lock, MousePointer2, Move, ZoomIn, Hand, MousePointerClick, Camera, Activity, Sun } from 'lucide-react';

export const GestureFeedbackOverlay: React.FC = () => {
  const [activeGesture, setActiveGesture] = useState<string>('NONE');
  const [reliability, setReliability] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [cameraState, setCameraState] = useState<string>('DISCONNECTED');
  const [trackingState, setTrackingState] = useState<string>('NO_HAND');
  const [isLowLight, setIsLowLight] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [clickPulse, setClickPulse] = useState<boolean>(false);
  
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = IPCClient.subscribe((msg) => {
      if (msg.type === 'TELEMETRY' && msg.payload) {
        const payload = msg.payload;
        
        let shouldShow = false;
        
        if (payload.active_intent && payload.active_intent !== activeGesture) {
          setActiveGesture(payload.active_intent);
          shouldShow = true;
          if (payload.active_intent === 'LEFT_CLICK' || payload.active_intent === 'RIGHT_CLICK') {
            setClickPulse(true);
            setTimeout(() => setClickPulse(false), 250);
          }
        }
        
        if (payload.tracking_quality !== undefined && Math.abs(payload.tracking_quality - reliability) > 5) {
          setReliability(payload.tracking_quality);
          shouldShow = true;
        }
        
        if (payload.fps) {
            setFps(payload.fps);
        }
        
        if (payload.subsystems?.camera && payload.subsystems.camera !== cameraState) {
          setCameraState(payload.subsystems.camera);
          shouldShow = true;
        }
        
        if (payload.subsystems?.tracking && payload.subsystems.tracking !== trackingState) {
          setTrackingState(payload.subsystems.tracking);
          shouldShow = true;
        }
        
        const lowLight = payload.reliability_flags?.includes('LOW_LIGHT') || false;
        if (lowLight !== isLowLight) {
          setIsLowLight(lowLight);
          shouldShow = true;
        }
        
        if (shouldShow) {
          setVisible(true);
          if (hideTimeout.current) clearTimeout(hideTimeout.current);
          hideTimeout.current = setTimeout(() => setVisible(false), 2000);
        }
      }
    });
    return () => {
      unsub();
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [activeGesture, reliability, cameraState, trackingState, isLowLight]);

  const isLocking = activeGesture === 'SCROLL' || activeGesture === 'ZOOM';

  const getGestureMeta = () => {
    switch (activeGesture) {
      case 'LEFT_CLICK':
        return { title: 'Left Click', icon: MousePointerClick, color: 'text-purple-400' };
      case 'RIGHT_CLICK':
        return { title: 'Right Click', icon: MousePointer2, color: 'text-indigo-400' };
      case 'SCROLL':
        return { title: 'Scroll Active', icon: Move, color: 'text-amber-400' };
      case 'ZOOM':
        return { title: 'Zoom Active', icon: ZoomIn, color: 'text-emerald-400' };
      case 'MOVE_CURSOR':
      case 'DRAG':
        return { title: 'Move Cursor', icon: Hand, color: 'text-sky-400' };
      default:
        return { title: 'Idle', icon: Hand, color: 'text-white/40' };
    }
  };

  const meta = getGestureMeta();
  const Icon = meta.icon;

  return (
    <div className={`fixed bottom-6 right-6 z-50 pointer-events-none transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className={`p-4 rounded-2xl bg-[#09090d]/95 backdrop-blur-xl border shadow-2xl flex flex-col gap-3 text-white w-64 ${
        isLocking ? 'border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'border-white/10'
      } ${clickPulse ? 'scale-105 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : ''}`}>
        
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
             <Activity className={`w-4 h-4 ${trackingState === 'TRACKING' ? 'text-emerald-400' : trackingState === 'DEGRADED_TRACKING' ? 'text-amber-400' : 'text-red-400'}`} />
             <span className="text-xs font-bold uppercase tracking-wider">{trackingState.replace('_', ' ')}</span>
          </div>
          <span className="text-[10px] font-mono text-white/50">{fps} FPS</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0 bg-white/5 rounded-full">
            <Icon className={`w-4 h-4 ${meta.color}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{meta.title}</p>
            <p className="text-[10px] font-mono text-white/50">Reliability: {reliability.toFixed(0)}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-white/50 font-bold uppercase">
           <div className="flex items-center gap-1">
             <Camera className={`w-3 h-3 ${cameraState === 'READY' ? 'text-emerald-400' : 'text-red-400'}`} />
             {cameraState === 'READY' ? 'Connected' : 'Offline'}
           </div>
           <div className="flex items-center gap-1">
             <Sun className={`w-3 h-3 ${isLowLight ? 'text-amber-400' : 'text-emerald-400'}`} />
             {isLowLight ? 'Low Light' : 'Good'}
           </div>
        </div>
        
      </div>
    </div>
  );
};
