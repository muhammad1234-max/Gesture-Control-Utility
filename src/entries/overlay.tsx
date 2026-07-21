import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../index.css';
import { IPCClient } from '../ipc/client';
import { Activity, Camera, Cpu } from 'lucide-react';

function OverlayApp() {
  const [fps, setFps] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    IPCClient.connect();

    const unsubscribe = IPCClient.subscribe((data) => {
      if (data.type === 'CAMERA_TELEMETRY') {
        setActive(true);
        const testing = (data.payload as any)?.testing;
        if (testing?.fps) {
          setFps(testing.fps.current);
        }
      }
    });

    return () => {
      unsubscribe();
      IPCClient.disconnect();
    };
  }, []);

  return (
    <div className="w-full h-screen p-4 flex flex-col items-end justify-start font-sans select-none pointer-events-none">
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-2xl flex flex-col gap-2 w-48 pointer-events-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/70">Gesture Engine</span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${active ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">{fps} FPS</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white tracking-widest text-[10px]">TRACKING</span>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverlayApp />
  </StrictMode>,
);
