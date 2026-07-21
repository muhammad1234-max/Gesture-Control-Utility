import React, { useState, useEffect } from 'react';
import { useTelemetryStore } from '@stores/telemetryStore';
import { useAppStore } from '@stores/appStore';
import { useDiagnosticsStore } from '@stores/diagnosticsStore';
import { X, Activity } from 'lucide-react';
import { IPCClient } from '@ipc/client';

export const DiagnosticsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<any>({});
  
  const telemetry = useTelemetryStore();
  const config = useAppStore(state => state.config);
  const logs = useDiagnosticsStore(state => state.logs);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      interval = setInterval(async () => {
        try {
          const res = await IPCClient.invoke('GET_STATUS');
          // Actually daemon GET_STATUS emits ENGINE_STATUS broadcast
          // which is handled by a subscriber.
        } catch {}
      }, 1000);
      
      const unsub = IPCClient.subscribe(msg => {
        if (msg.type === 'ENGINE_STATUS') {
          setStatus(msg.payload || {});
        }
      });
      return () => { clearInterval(interval); unsub(); };
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg z-50 flex items-center gap-2 pr-4 transition-all"
      >
        <Activity className="w-5 h-5" />
        <span className="text-sm font-medium">Dev Diagnostics</span>
      </button>
    );
  }

  const lastLog = [...logs].reverse()[0];

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-black/90 border border-purple-500/30 backdrop-blur-md rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col font-mono text-[11px] text-purple-200">
      <div className="flex justify-between items-center p-3 border-b border-purple-500/30 bg-purple-900/20">
        <div className="flex items-center gap-2 text-purple-400 font-semibold uppercase tracking-wider">
          <Activity className="w-4 h-4" />
          Runtime Diagnostics
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          <h3 className="text-purple-400 font-bold mb-2">LIFECYCLE STATE</h3>
          <div className="grid grid-cols-2 gap-1">
            <span>Engine Active:</span> <span className={telemetry.engineActive ? 'text-green-400' : 'text-red-400'}>{String(telemetry.engineActive)}</span>
            <span>Camera Open:</span> <span className={telemetry.cameraOpen ? 'text-green-400' : 'text-red-400'}>{String(telemetry.cameraOpen)}</span>
            <span>Tracking Enabled:</span> <span className={telemetry.trackingEnabled ? 'text-green-400' : 'text-red-400'}>{String(telemetry.trackingEnabled)}</span>
            <span>Config Applied:</span> <span className={telemetry.configApplied ? 'text-green-400' : 'text-red-400'}>{String(telemetry.configApplied)}</span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-purple-400 font-bold mb-2">PYTHON DAEMON STATUS</h3>
          <div className="grid grid-cols-2 gap-1">
            <span>PID:</span> <span className="text-white">{status.pid || 'N/A'}</span>
            <span>Camera Open:</span> <span className="text-white">{String(status.camera_open)}</span>
            <span>Tracking:</span> <span className="text-white">{String(status.tracking)}</span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-purple-400 font-bold mb-2">SYSTEM CONFIG</h3>
          <div className="grid grid-cols-2 gap-1">
            <span>Camera ID:</span> <span className="text-white">{config.cameraId}</span>
            <span>Smoothing:</span> <span className="text-white">{config.adaptive.overrides.smoothing}</span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-purple-400 font-bold mb-2">LAST LOG TRACE</h3>
          <div className="bg-black/50 p-2 rounded border border-purple-500/20 text-white whitespace-pre-wrap break-words">
            {lastLog ? `[${lastLog.timestamp.toLocaleTimeString()}] [${lastLog.type.toUpperCase()}]\n${lastLog.message}` : 'No logs yet...'}
          </div>
        </div>
      </div>
    </div>
  );
};
