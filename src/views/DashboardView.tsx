import React, { useEffect, useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { useEngineStore } from '@stores/engineStore';
import { IPCClient } from '@ipc/client';
import { HandVisualizer } from '@components/HandVisualizer';
import { Crosshair, HandMetal, AlertTriangle, Activity, ShieldCheck, RefreshCw, Loader2, CheckCircle2, Circle, Cpu, Camera, Radio } from 'lucide-react';
import { EmptyState } from '@components/EmptyState';

export default function DashboardView() {
  const setCalibrationOpen = useAppStore(state => state.setCalibrationOpen);
  const config = useAppStore(state => state.config);
  
  const engineState = useEngineStore(state => state.engineState);
  const statusMessage = useEngineStore(state => state.statusMessage);
  const health = useEngineStore(state => state.health);
  const subsystems = useEngineStore(state => state.subsystems);
  const milestones = useEngineStore(state => state.milestones);
  const trackingQuality = useEngineStore(state => state.trackingQuality);

  const [telemetry, setTelemetry] = useState<{x: number, y: number, landmarks?: {x: number, y: number}[]} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = IPCClient.subscribe((data) => {
      if (data.type === 'TELEMETRY' && data.payload) {
         setTelemetry(data.payload);
         setErrorMsg(null);
      } else if (data.type === 'ERROR' && data.payload) {
         setErrorMsg(data.payload);
         setTelemetry(null);
      }
    });
    return () => { unsubscribe(); };
  }, []);

  const isReady = engineState === 'READY';
  const isInitializing = ['STARTING', 'INITIALIZING', 'WAITING_CAMERA'].includes(engineState);

  const getHealthBadgeColor = () => {
    switch (health.badge) {
      case 'HEALTHY': return 'text-green-400 border-green-500/40 bg-green-500/10';
      case 'WARNING': return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'RECOVERING': return 'text-orange-400 border-orange-500/40 bg-orange-500/10';
      default: return 'text-red-400 border-red-500/40 bg-red-500/10';
    }
  };

  const getSubsystemColor = (state: string) => {
    switch (state) {
      case 'READY':
      case 'TRACKING': return 'text-green-400';
      case 'STARTING':
      case 'CONNECTING':
      case 'WARMING_UP':
      case 'DETECTING': return 'text-amber-400';
      case 'ERROR':
      case 'LOST': return 'text-red-400';
      default: return 'text-white/40';
    }
  };

  const getQualityColor = () => {
    switch (trackingQuality.label) {
      case 'EXCELLENT': return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'GOOD': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'FAIR': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      default: return 'text-red-400 border-red-500/30 bg-red-500/10';
    }
  };

  return (
    <div className="space-y-6 animate-[var(--animate-native-fade)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h1">Dashboard</h2>
          <p className="text-body mt-1">System status and live tracking feed.</p>
        </div>

        {/* Health Score Gauge Badge */}
        <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 backdrop-blur-xl ${getHealthBadgeColor()}`}>
          <ShieldCheck className="w-5 h-5" />
          <div>
            <div className="flex items-center gap-2 font-mono font-bold text-xs">
              <span>HEALTH: {health.score}/100</span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-white/10">{health.badge}</span>
            </div>
            <p className="text-[10px] opacity-70">
              {isReady ? 'All subsystems operational' : statusMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Subsystem Status Badges (Item #1) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 flex items-center gap-3">
          <Cpu className={`w-4 h-4 ${getSubsystemColor(subsystems.engine)}`} />
          <div>
            <span className="text-[10px] text-white/50 uppercase tracking-widest">Engine</span>
            <p className={`text-xs font-mono font-bold ${getSubsystemColor(subsystems.engine)}`}>{subsystems.engine}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <Camera className={`w-4 h-4 ${getSubsystemColor(subsystems.camera)}`} />
          <div>
            <span className="text-[10px] text-white/50 uppercase tracking-widest">Camera</span>
            <p className={`text-xs font-mono font-bold ${getSubsystemColor(subsystems.camera)}`}>{subsystems.camera}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <Radio className={`w-4 h-4 ${getSubsystemColor(subsystems.tracking)}`} />
          <div>
            <span className="text-[10px] text-white/50 uppercase tracking-widest">Tracking</span>
            <p className={`text-xs font-mono font-bold ${getSubsystemColor(subsystems.tracking)}`}>{subsystems.tracking}</p>
          </div>
        </div>
      </div>

      {isInitializing ? (
        /* Milestone Stepper (Item #2) */
        <div className="p-8 rounded-2xl bg-black/60 border border-white/10 min-h-[300px]">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            Initializing System
          </h3>
          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                {m.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                ) : i === milestones.findIndex(ms => !ms.completed) ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-white/20 shrink-0" />
                )}
                <span className={`text-sm font-mono ${m.completed ? 'text-green-400' : i === milestones.findIndex(ms => !ms.completed) ? 'text-amber-400' : 'text-white/30'}`}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : !isReady ? (
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
            
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-mono text-white/70 uppercase tracking-widest">Live Hand Feed</span>
            </div>

            <div className="absolute top-4 right-4 z-10">
               <button onClick={() => setCalibrationOpen(true)} className="btn-secondary text-xs py-1.5 px-3">
                 Recalibrate Workspace
               </button>
            </div>

            <div className="flex-1 relative z-1 flex items-center justify-center pt-8">
               {telemetry && telemetry.landmarks ? (
                  <div className="w-64 h-64 relative border border-white/10 rounded-2xl bg-black/80 overflow-hidden shadow-2xl">
                    <HandVisualizer landmarks={telemetry.landmarks} />
                  </div>
               ) : (
                  <div className="text-center">
                    <Crosshair className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Awaiting Hand In Workspace</span>
                  </div>
               )}
            </div>
          </div>

          {/* Sidebar: Health, Quality, Subsystems */}
          <div className="col-span-1 flex flex-col gap-4">
             {/* Health Score */}
             <div className="card p-5 flex-1 flex flex-col justify-center items-center text-center">
               <Activity className="w-8 h-8 text-purple-400 mb-2 opacity-80" />
               <h3 className="text-2xl font-bold text-white">{health.score}/100</h3>
               <span className="text-xs text-white/50 uppercase tracking-widest mt-1">Health Score</span>
             </div>
             
             {/* Tracking Quality Indicator (Item #4) */}
             <div className={`card p-5 flex-1 flex flex-col justify-center items-center text-center border ${getQualityColor()}`}>
               <h3 className="text-xl font-bold">{trackingQuality.label}</h3>
               <span className="text-xs opacity-70 uppercase tracking-widest mt-1">Tracking Quality</span>
               <span className="text-[10px] font-mono opacity-50 mt-0.5">Score: {trackingQuality.score}/100</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
