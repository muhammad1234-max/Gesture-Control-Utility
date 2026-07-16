/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  CameraOff, 
  Activity, 
  Volume2,
  VolumeX,
  Video,
  MonitorPlay,
  Settings2,
  Scan
} from 'lucide-react';
import { GestureMapping } from '../types';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';

interface SandboxViewProps {
  gestures: GestureMapping[];
  onTriggerGesture: (trigger: string, confidence: number) => void;
  engineActive: boolean;
}

export default function SandboxView({
  gestures,
  onTriggerGesture,
  engineActive
}: SandboxViewProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [useWebcam, setUseWebcam] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastEvent, setLastEvent] = useState<{ trigger: string; action: string; time: string } | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [fps, setFps] = useState(0);
  
  // Webcam elements refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const trackingCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const fpsTimeRef = useRef<number>(performance.now());
  const framesRef = useRef<number>(0);
  const gestureStateRef = useRef({
    lastGesture: '',
    lastGestureTime: 0,
    palmHistory: [] as {x: number, y: number, time: number}[],
  });

  const playBeep = (freq: number, type: 'sine' | 'square' | 'triangle' = 'sine', duration: number = 0.15) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  };

  const triggerGesture = (gesture: string, confidence: number) => {
    const now = Date.now();
    if (now - gestureStateRef.current.lastGestureTime < 800) return;

    gestureStateRef.current.lastGestureTime = now;
    gestureStateRef.current.lastGesture = gesture;

    const mapped = gestures.find((g) => g.trigger === gesture && g.isActive);
    const actionName = mapped ? mapped.targetAction : 'No mapped action';
    
    onTriggerGesture(gesture, confidence);
    setLastEvent({
      trigger: gesture,
      action: actionName,
      time: new Date().toLocaleTimeString()
    });

    playBeep(mapped ? 587.33 : 329.63, mapped ? 'triangle' : 'sine', mapped ? 0.18 : 0.12);
  };

  const analyzeHandGestures = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return;
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];
    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    if (dist(thumbTip, indexTip) < 0.05) {
      triggerGesture('pinch', Math.floor(100 - dist(thumbTip, indexTip) * 1000));
      return;
    }

    const isExtended = (tip: any, mcp: any) => tip.y < mcp.y;
    const palmExtended = isExtended(indexTip, landmarks[5]) && 
                         isExtended(middleTip, landmarks[9]) && 
                         isExtended(ringTip, landmarks[13]) && 
                         isExtended(pinkyTip, landmarks[17]);
    
    if (palmExtended && dist(thumbTip, indexTip) > 0.2) {
      const now = Date.now();
      gestureStateRef.current.palmHistory.push({ x: wrist.x, y: wrist.y, time: now });
      gestureStateRef.current.palmHistory = gestureStateRef.current.palmHistory.filter(h => now - h.time < 500);
      
      const history = gestureStateRef.current.palmHistory;
      if (history.length > 5) {
        const dx = history[history.length - 1].x - history[0].x;
        const dy = history[history.length - 1].y - history[0].y;
        
        if (dx < -0.3) { triggerGesture('swipe-right', 92); gestureStateRef.current.palmHistory = []; }
        else if (dx > 0.3) { triggerGesture('swipe-left', 92); gestureStateRef.current.palmHistory = []; }
        else if (dy < -0.3) { triggerGesture('swipe-up', 95); gestureStateRef.current.palmHistory = []; }
        else if (dy > 0.3) { triggerGesture('swipe-down', 95); gestureStateRef.current.palmHistory = []; }
      }
    }
  };

  useEffect(() => {
    let active = true;
    const initVision = async () => {
      setModelLoading(true);
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.7,
          minHandPresenceConfidence: 0.7,
          minTrackingConfidence: 0.7
        });
        if (active) {
          handLandmarkerRef.current = landmarker;
          setModelLoading(false);
        }
      } catch (err) {
        if (active) setModelLoading(false);
      }
    };
    initVision();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!useWebcam || !engineActive) { stopCamera(); return; }
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        videoStreamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        setCameraActive(true);
      } catch (err) {
        setUseWebcam(false);
        setCameraActive(false);
      }
    };
    startCamera();
    return () => stopCamera();
  }, [useWebcam, engineActive]);

  const stopCamera = () => {
    if (videoStreamRef.current) { videoStreamRef.current.getTracks().forEach(track => track.stop()); videoStreamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    const canvas = trackingCanvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !handLandmarkerRef.current || !engineActive) return;
    const video = videoRef.current;
    const canvas = trackingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const renderLoop = () => {
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        framesRef.current++;
        const now = performance.now();
        if (now - fpsTimeRef.current >= 1000) { setFps(framesRef.current); framesRef.current = 0; fpsTimeRef.current = now; }

        const results = handLandmarkerRef.current?.detectForVideo(video, performance.now());
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (results && results.landmarks && results.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(ctx);
          for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#10b981", lineWidth: 3 });
            drawingUtils.drawLandmarks(landmarks, { color: "#34d399", lineWidth: 1, radius: 4 });
            analyzeHandGestures(landmarks);
          }
        }
        ctx.restore();
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    video.addEventListener('loadeddata', () => { animationFrameRef.current = requestAnimationFrame(renderLoop); });
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [cameraActive, engineActive]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold text-slate-100 tracking-tight">
            Live CV Engine
          </h2>
          <p className="text-[13px] text-slate-400 mt-1">
            Real-time hand landmark detection and gesture classification.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer shadow-sm ${
              soundEnabled 
                ? 'bg-[#14171d] border-slate-700/50 text-slate-300 hover:bg-slate-800' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
            }`}
            title={soundEnabled ? "Mute Feedback Sounds" : "Enable Feedback Sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setUseWebcam(!useWebcam)}
            disabled={modelLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[13px] border transition-all cursor-pointer shadow-sm disabled:opacity-50 ${
              useWebcam 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-[#14171d] border-slate-700/50 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {useWebcam ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            {modelLoading ? 'Loading AI...' : useWebcam ? 'Stop Feed' : 'Start Feed'}
          </button>
        </div>
      </div>

      <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Status Bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/60 bg-[#14171d]">
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-emerald-500" />
            <h3 className="text-[13px] font-semibold text-slate-200">
              Viewport
            </h3>
          </div>
          
          <div className="flex gap-4 items-center">
            {cameraActive && (
              <span className="flex items-center gap-2 text-[12px] text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {fps} FPS
              </span>
            )}
            <span className="text-[12px] text-slate-500 font-medium">
              {useWebcam ? 'MediaPipe Tasks Vision' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative aspect-video w-full bg-[#0c0e12] overflow-hidden flex items-center justify-center">
          
          {!engineActive && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0c0e12]/80 backdrop-blur-sm text-center p-6 text-slate-400 select-none">
              <span className="text-rose-400 font-bold uppercase tracking-wider text-[11px] border border-rose-500/20 px-3 py-1 rounded-full mb-3">
                Service Paused
              </span>
              <p className="text-[14px]">Start Tracking in the sidebar to enable the CV Engine.</p>
            </div>
          )}

          {modelLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0c0e12]/80 backdrop-blur-sm text-center p-6 text-slate-300 select-none">
              <MonitorPlay className="w-8 h-8 text-emerald-500 mb-4 animate-pulse" />
              <p className="text-[15px] font-medium text-slate-200">Initializing MediaPipe...</p>
            </div>
          )}

          {useWebcam && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ transform: 'scaleX(-1)' }}
              className="absolute w-full h-full object-cover"
            />
          )}

          {!useWebcam && !modelLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none z-0">
              <div className="w-16 h-16 rounded-full bg-slate-800/40 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-[15px] font-medium text-slate-300">Camera feed offline</p>
              <p className="text-[13px] text-slate-500 mt-1 max-w-[320px]">
                Start the feed to begin spatial tracking.
              </p>
            </div>
          )}

          {/* Wireframe Canvas */}
          <canvas
            ref={trackingCanvasRef}
            style={{ transform: 'scaleX(-1)' }}
            className="absolute w-full h-full z-10 pointer-events-none object-cover"
          />
        </div>

        {/* Telemetry Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800/60 border-t border-slate-800/60 bg-[#14171d]">
          <div className="p-5 flex flex-col justify-center">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">Model Parameters</span>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[12px] text-slate-400 block mb-1">Smoothing</span>
                <span className="text-[13px] text-emerald-400 font-medium">Active</span>
              </div>
              <div>
                <span className="text-[12px] text-slate-400 block mb-1">Backend</span>
                <span className="text-[13px] text-slate-200 font-medium">WASM (GPU)</span>
              </div>
              <div>
                <span className="text-[12px] text-slate-400 block mb-1">Hands</span>
                <span className="text-[13px] text-slate-200 font-medium">Max 2</span>
              </div>
            </div>
          </div>

          <div className="p-5 flex flex-col justify-center bg-slate-900/20">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Last Recognized Gesture</span>
            {lastEvent ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-slate-100 uppercase tracking-tight block">
                    {lastEvent.trigger.replace('-', ' ')}
                  </span>
                  <span className="text-[12px] text-slate-400 mt-0.5 block">
                    Mapped to: <span className="text-slate-300 font-medium">{lastEvent.action}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[12px] font-mono text-slate-500">
                    {lastEvent.time}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-[44px] flex items-center">
                <span className="text-slate-500 italic text-[13px]">Waiting for input...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
