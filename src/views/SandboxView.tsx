import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, MonitorPlay, Scan, Video, Cpu, Activity, AlertTriangle, Hand } from 'lucide-react';
import { IPCClient } from '@ipc/client';
import { IPCEventType, GestureEventType, IntentEventType, ActionEventType } from '@shared/events';
import { TrackingFrame, Handedness, WorkerState, GestureFrame, GestureType, FingerType, FingerExtensionState, IntentFrame, IntentState, IntentType, ExecutableAction } from '@shared/types';
import { useCameraStore } from '@stores/cameraStore';

// MediaPipe standard hand connections
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4], // Thumb
  [0,5],[5,6],[6,7],[7,8], // Index
  [5,9],[9,10],[10,11],[11,12], // Middle
  [9,13],[13,14],[14,15],[15,16], // Ring
  [13,17],[17,18],[18,19],[19,20], // Pinky
  [0,17] // Palm base
];

export default function SandboxView() {
  const devices = useCameraStore(state => state.devices);
  const activeDeviceId = useCameraStore(state => state.activeDeviceId);
  const telemetry = useCameraStore(state => state.telemetry);
  const tracking = useCameraStore(state => state.tracking);
  const gestureMetrics = useCameraStore(state => state.gestureMetrics);
  const latestGestureFrame = useCameraStore(state => state.latestGestureFrame);
  const intentMetrics = useCameraStore(state => state.intentMetrics);
  const latestIntentFrame = useCameraStore(state => state.latestIntentFrame);
  const actionMetrics = useCameraStore(state => state.actionMetrics);
  const latestAction = useCameraStore(state => state.latestAction);
  const executionMetrics = useCameraStore(state => state.executionMetrics);
  
  const setDevices = useCameraStore(state => state.setDevices);
  const setActiveDevice = useCameraStore(state => state.setActiveDevice);
  const updateTelemetry = useCameraStore(state => state.updateTelemetry);
  const setGestureFrame = useCameraStore(state => state.setGestureFrame);
  const setIntentFrame = useCameraStore(state => state.setIntentFrame);
  const setActionFrame = useCameraStore(state => state.setActionFrame);

  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [targetWidth, setTargetWidth] = useState(640);
  const [targetHeight, setTargetHeight] = useState(480);
  const [targetFps, setTargetFps] = useState(30);

  useEffect(() => {
    IPCClient.send(IPCEventType.CAMERA_LIST_REQUEST, {});

    const unsubscribeJson = IPCClient.subscribe((msg) => {
      if (msg.type === IPCEventType.CAMERA_LIST_RESPONSE && msg.payload) {
        setDevices(msg.payload);
      } else if (msg.type === IPCEventType.CAMERA_TELEMETRY && msg.payload) {
        updateTelemetry(msg.payload);
      } else if (msg.type === (IPCEventType as any).TRACKING_LANDMARKS && msg.payload) {
        drawSkeleton(msg.payload as TrackingFrame);
      } else if (msg.type === (GestureEventType as any).GESTURE_FRAME && msg.payload) {
        setGestureFrame(msg.payload as GestureFrame);
      } else if (msg.type === (IntentEventType as any).INTENT_FRAME && msg.payload) {
        setIntentFrame(msg.payload as IntentFrame);
      } else if (msg.type === (ActionEventType as any).ACTION_FRAME && msg.payload) {
        setActionFrame(msg.payload as ExecutableAction);
      }
    });

    const unsubscribeBinary = IPCClient.subscribeBinary((buffer) => {
      const view = new DataView(buffer);
      const width = view.getUint32(0, true);
      const height = view.getUint32(4, true);
      const rgbData = new Uint8Array(buffer, 8);
      
      const canvas = videoCanvasRef.current;
      if (!canvas) return;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        // Sync overlay canvas size
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = width;
          overlayCanvasRef.current.height = height;
        }
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgData = ctx.createImageData(width, height);
      let j = 0;
      for (let i = 0; i < rgbData.length; i += 3) {
        imgData.data[j++] = rgbData[i];     // R
        imgData.data[j++] = rgbData[i+1];   // G
        imgData.data[j++] = rgbData[i+2];   // B
        imgData.data[j++] = 255;            // A
      }
      ctx.putImageData(imgData, 0, 0);
    });

    return () => {
      unsubscribeJson();
      unsubscribeBinary();
    };
  }, [setDevices, updateTelemetry, setGestureFrame]);

  const drawSkeleton = (frame: TrackingFrame) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const hand of frame.hands) {
      const color = hand.handedness === Handedness.LEFT ? '#38bdf8' : '#f59e0b';
      
      // Draw Connections
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
        const start = hand.landmarks[startIdx];
        const end = hand.landmarks[endIdx];
        
        ctx.beginPath();
        // X is flipped via CSS scaleX(-1), so we draw normally here
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      }

      // Draw Landmarks
      ctx.fillStyle = '#ffffff';
      for (const lm of hand.landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  const toggleCamera = () => {
    if (telemetry.active) {
      IPCClient.send(IPCEventType.CAMERA_STOP, {});
      updateTelemetry({ camera: { ...telemetry, active: false }, tracking: null, gesture: null, intent: null, action: null, execution: null });
      setGestureFrame(null);
      setIntentFrame(null);
      setActionFrame(null);
    } else {
      if (!activeDeviceId && devices.length > 0) {
        setActiveDevice(devices[0].id);
      }
      const idToStart = activeDeviceId || (devices.length > 0 ? devices[0].id : null);
      if (idToStart !== null) {
        IPCClient.send(IPCEventType.CAMERA_START, { 
          id: idToStart, width: targetWidth, height: targetHeight, fps: targetFps 
        });
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold text-slate-100 tracking-tight">
            Production Gesture Engine
          </h2>
          <p className="text-[13px] text-slate-400 mt-1">
            Zero-allocation Pure ML Perception Layer + FSM Overlay
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            className="bg-[#14171d] border border-slate-700/50 text-slate-300 text-[13px] rounded-xl px-3 py-2"
            value={activeDeviceId || ''}
            onChange={(e) => setActiveDevice(e.target.value)}
            disabled={telemetry.active}
          >
            {devices.length === 0 && <option value="">Scanning for cameras...</option>}
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <button
            onClick={toggleCamera}
            disabled={devices.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[13px] border transition-all shadow-sm disabled:opacity-50 ${
              telemetry.active 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-[#14171d] border-slate-700/50 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {telemetry.active ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            {telemetry.active ? 'Stop Engine' : 'Start Engine'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visualizer */}
        <div className="lg:col-span-2 bg-[#14171d] border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
          <div className="px-5 py-3 flex items-center justify-between border-b border-slate-800/60 bg-[#14171d]">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-500" />
              <h3 className="text-[13px] font-semibold text-slate-200">Live Visualizer</h3>
            </div>
            
            <div className="flex gap-4 items-center">
              {tracking?.state === WorkerState.ERROR && (
                <span className="flex items-center gap-2 text-[12px] text-red-400 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Tracker Error
                </span>
              )}
              {telemetry.active && tracking?.state === WorkerState.RUNNING && (
                <span className="flex items-center gap-2 text-[12px] text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Tracker & Gesture Engines Online
                </span>
              )}
            </div>
          </div>

          <div className="relative aspect-video w-full bg-[#0c0e12] overflow-hidden flex items-center justify-center border-b border-slate-800/60">
            {!telemetry.active && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-0">
                <div className="w-16 h-16 rounded-full bg-slate-800/40 flex items-center justify-center mb-4">
                  <Video className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-[15px] font-medium text-slate-300">Engine Offline</p>
                <p className="text-[13px] text-slate-500 mt-1 max-w-[320px]">
                  Start the engine to initialize the Python tracking pipeline and zero-allocation gesture FSM.
                </p>
              </div>
            )}

            <canvas
              ref={videoCanvasRef}
              className={`absolute w-full h-full object-contain ${telemetry.active ? 'opacity-100' : 'opacity-0'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={overlayCanvasRef}
              className={`absolute w-full h-full object-contain pointer-events-none ${telemetry.active ? 'opacity-100' : 'opacity-0'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>

          {/* Core Hardware & ML Telemetry */}
          <div className="grid grid-cols-3 divide-x divide-slate-800/60 bg-[#14171d]">
            <div className="p-4 flex flex-col">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Camera FPS</span>
              <span className="text-xl text-emerald-400 font-mono font-medium">{telemetry.fps}</span>
            </div>
            <div className="p-4 flex flex-col">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Tracking (Py) FPS</span>
              <span className="text-xl text-sky-400 font-mono font-medium">{tracking?.trackingFps || 0}</span>
              <span className="text-[11px] text-slate-500 mt-1">Lat: {tracking?.latencyMs?.toFixed(1) || 0}ms</span>
            </div>
            <div className="p-4 flex flex-col">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Gesture (Node) FPS</span>
              <span className="text-xl text-fuchsia-400 font-mono font-medium">{gestureMetrics?.recognitionFps || 0}</span>
              <span className="text-[11px] text-slate-500 mt-1">Lat: {gestureMetrics?.recognitionLatencyMs?.toFixed(1) || 0}ms</span>
            </div>
          </div>
        </div>

        {/* Right Column: Gesture FSM Diagnostics */}
        <div className="flex flex-col gap-6">
          
          {/* Active Gesture Card */}
          <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Hand className="w-4 h-4 text-fuchsia-500" />
              <h3 className="text-[13px] font-semibold text-slate-200">Active Gesture</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {latestGestureFrame?.activeGestures.length ? (
                latestGestureFrame.activeGestures.map(g => (
                  <div key={g} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex flex-col gap-2">
                    <span className="text-lg font-medium text-emerald-400">{g.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${(latestGestureFrame.gestureConfidences[g] || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                        {Math.round((latestGestureFrame.gestureConfidences[g] || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-800/20 rounded-xl p-4 border border-slate-800 border-dashed flex items-center justify-center text-slate-500 text-[13px]">
                  No active gestures detected
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-slate-400">Dominant Hand</span>
                <span className="text-[12px] text-slate-200 font-medium capitalize">{latestGestureFrame?.dominantHand || 'None'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-slate-400">Gesture Stability</span>
                <span className="text-[12px] text-slate-200 font-medium">{gestureMetrics?.gestureStability.toFixed(1) || 0}%</span>
              </div>
            </div>
          </div>

          {/* Finger States Card */}
          <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm flex-1">
            <h3 className="text-[13px] font-semibold text-slate-200 mb-4">Finger States Solver</h3>
            
            <div className="space-y-3">
              {latestGestureFrame?.fingerStates?.map(f => (
                <div key={f.finger} className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-400 capitalize w-16">
                    {FingerType[f.finger].toLowerCase()}
                  </span>
                  
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    f.extension === FingerExtensionState.EXTENDED ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    f.extension === FingerExtensionState.CURLED ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' :
                    'bg-slate-700/50 text-slate-300'
                  }`}>
                    {f.extension}
                  </span>
                  
                  <div className="flex items-center gap-2 w-24">
                    <span className="text-[10px] text-slate-500">Curl</span>
                    <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${f.curl * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Intent Resolution Dashboard */}
      <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm mt-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-sky-500" />
          <h3 className="text-lg font-semibold text-slate-200">Intent Resolution FSM</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Current Intent</span>
            <span className="text-xl font-medium text-emerald-400">
              {latestIntentFrame?.primaryIntent || IntentType.NONE}
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Secondary: {latestIntentFrame?.secondaryIntent || IntentType.NONE}
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">FSM State</span>
            <span className="text-lg font-mono text-sky-400">
              {latestIntentFrame?.currentState || IntentState.IDLE}
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Time in state: {latestIntentFrame?.elapsedTimeInStateMs.toFixed(0) || 0}ms
            </span>
          </div>
          
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Last Transition</span>
            <span className="text-sm font-medium text-amber-400 truncate">
              {latestIntentFrame?.transitionReason || 'None'}
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Transitions: {intentMetrics?.transitionCount || 0}
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Engine Performance</span>
            <span className="text-sm font-medium text-slate-200">
              FPS: {intentMetrics?.intentFps || 0}
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Latency: {intentMetrics?.pipelineLatencyMs.toFixed(2) || 0}ms
            </span>
          </div>
        </div>
      </div>

      {/* Action Mapping Dashboard */}
      <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm mt-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-semibold text-slate-200">Action Mapping Engine</h3>
        </div>
        
        {/* Pipeline Vis */}
        <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700/50 rounded-xl px-6 py-4 mb-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 uppercase">Gesture</span>
            <span className="text-[13px] font-medium text-slate-300">{latestGestureFrame?.activeGestures[0]?.replace('_', ' ') || 'None'}</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 uppercase">Intent</span>
            <span className="text-[13px] font-medium text-emerald-400">{latestIntentFrame?.primaryIntent || 'NONE'}</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 uppercase">Action Mapping</span>
            <span className="text-[13px] font-medium text-indigo-400">{latestAction?.id || 'Unmapped'}</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 uppercase">OS Executor</span>
            <span className="text-[13px] font-medium text-amber-400">Windows</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Active Profile</span>
            <span className="text-xl font-medium text-indigo-400">
              {actionMetrics?.currentActiveProfile || 'None'}
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Registry Size: {actionMetrics?.currentRegistrySize || 0} bounds
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Executable Action</span>
            <span className="text-lg font-mono text-sky-400 truncate">
              {latestAction?.type || 'NONE'}
            </span>
            <span className="text-[12px] text-slate-400 mt-1 truncate">
              Payload: {latestAction ? JSON.stringify(latestAction.payload) : '{}'}
            </span>
          </div>
          
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Mapping Stats</span>
            <span className="text-sm font-medium text-emerald-400">
              Mapped: {actionMetrics?.mappedActions || 0}
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Rejected: {actionMetrics?.rejectedActions || 0}
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Mapping Performance</span>
            <span className="text-sm font-medium text-slate-200">
              Lookup: {actionMetrics?.averageLookupTimeMs.toFixed(3) || 0}ms
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Validation: {actionMetrics?.averageValidationTimeMs.toFixed(3) || 0}ms
            </span>
          </div>
        </div>
      </div>

      {/* Native Windows Execution Dashboard */}
      <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm mt-6">
        <div className="flex items-center gap-2 mb-6">
          <MonitorPlay className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-200">Native Windows Execution</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Latest Execution</span>
            <span className="text-xl font-medium text-amber-400">
              {executionMetrics?.lastExecutedAction || 'None'}
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Successful: {executionMetrics?.successfulExecutions || 0}
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Queue Depth</span>
            <span className="text-lg font-mono text-sky-400 truncate">
              Main: {executionMetrics?.queueDepth || 0}
            </span>
            <span className="text-[12px] text-slate-400 mt-1 truncate">
              Movement: {executionMetrics?.movementQueueDepth || 0}
            </span>
          </div>
          
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">End-to-End Latency</span>
            <span className="text-sm font-medium text-emerald-400">
              Avg: {executionMetrics?.averageEndToEndLatencyMs.toFixed(3) || 0} ms
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Wait: {executionMetrics?.averageQueueWaitTimeMs.toFixed(3) || 0} ms | RTT: {executionMetrics?.averageBridgeRttMs.toFixed(3) || 0} ms
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Bridge Diagnostics</span>
            <span className="text-sm font-medium text-slate-200">
              Python: {executionMetrics?.averagePythonTimeMs.toFixed(3) || 0} ms
            </span>
            <span className="text-[12px] text-slate-400 mt-1">
              Win32 Call: {executionMetrics?.averageWin32TimeMs.toFixed(3) || 0} ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
