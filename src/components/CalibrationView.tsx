/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sliders, 
  RefreshCw, 
  TrendingUp,
  MousePointer2,
  Video,
  Activity
} from 'lucide-react';
import { CalibrationSettings } from '../types';

interface CalibrationViewProps {
  settings: CalibrationSettings;
  onUpdateSettings: (settings: Partial<CalibrationSettings>) => void;
}

export default function CalibrationView({
  settings,
  onUpdateSettings
}: CalibrationViewProps) {
  const [testVelocity, setTestVelocity] = useState(50);
  const [x1, y1, x2, y2] = settings.accelerationCurve;

  const handleCurveChange = (idx: number, val: number) => {
    const nextCurve = [...settings.accelerationCurve] as [number, number, number, number];
    nextCurve[idx] = parseFloat(val.toFixed(2));
    onUpdateSettings({ accelerationCurve: nextCurve });
  };

  const getSvgCoordinates = () => {
    const startX = 0;
    const startY = 200;
    const endX = 200;
    const endY = 0;
    const cx1 = x1 * 200;
    const cy1 = 200 - (y1 * 200);
    const cx2 = x2 * 200;
    const cy2 = 200 - (y2 * 200);
    return { startX, startY, endX, endY, cx1, cy1, cx2, cy2 };
  };

  const svg = getSvgCoordinates();

  const getAccelerationMultiplier = (v: number) => {
    const t = v / 100;
    const y = 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
    return (y * 2).toFixed(2);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-semibold text-slate-100 tracking-tight">
          Tracking Calibration
        </h2>
        <p className="text-[13px] text-slate-400 mt-1">
          Fine-tune the gesture tracking pipeline, dead zones, and motion acceleration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Acceleration Editor */}
        <div className="lg:col-span-2 bg-[#14171d] border border-slate-800/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/60 bg-[#14171d]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-[13px] font-semibold text-slate-200">
                Speed Acceleration Curve
              </h3>
            </div>
            <button
              onClick={() => onUpdateSettings({ accelerationCurve: [0.25, 0.1, 0.25, 1.0] })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Reset to defaults"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#0c0e12]">
            {/* SVG Graph */}
            <div className="flex flex-col items-center">
              <div className="relative bg-[#14171d] border border-slate-800/60 p-4 rounded-2xl w-[240px] h-[240px] shadow-sm">
                <div className="absolute inset-4 border-l border-b border-slate-700/50 flex flex-col justify-between">
                  <div className="w-full border-t border-dashed border-slate-800 h-0"></div>
                  <div className="w-full border-t border-dashed border-slate-800 h-0"></div>
                  <div className="w-full border-t border-dashed border-slate-800 h-0"></div>
                </div>

                <svg width="200" height="200" className="absolute top-4 left-4 overflow-visible select-none">
                  <line x1="0" y1="200" x2="200" y2="0" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="200" x2={svg.cx1} y2={svg.cy1} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3" />
                  <line x1="200" y1="0" x2={svg.cx2} y2={svg.cy2} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3" />

                  <path
                    d={`M ${svg.startX} ${svg.startY} C ${svg.cx1} ${svg.cy1}, ${svg.cx2} ${svg.cy2}, ${svg.endX} ${svg.endY}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  <circle cx={svg.cx1} cy={svg.cy1} r="6" fill="#ef4444" className="cursor-pointer shadow-sm drop-shadow-md" />
                  <circle cx={svg.cx2} cy={svg.cy2} r="6" fill="#38bdf8" className="cursor-pointer shadow-sm drop-shadow-md" />
                </svg>

                <span className="absolute top-1 left-2 text-[10px] font-medium text-slate-500">INPUT</span>
                <span className="absolute bottom-1 right-2 text-[10px] font-medium text-slate-500">OUTPUT</span>
              </div>
              <div className="mt-4 px-3 py-1 bg-[#14171d] border border-slate-800 rounded-lg shadow-sm">
                <span className="text-[11px] font-mono text-slate-400">
                  cubic-bezier(<span className="text-emerald-400">{x1}, {y1}, {x2}, {y2}</span>)
                </span>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-5">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Curve Anchors</h4>
              
              <div className="space-y-4">
                {[
                  { label: "Anchor 1 X", value: x1, setter: (v: number) => handleCurveChange(0, v), color: "accent-rose-500", text: "text-rose-400" },
                  { label: "Anchor 1 Y", value: y1, setter: (v: number) => handleCurveChange(1, v), color: "accent-rose-500", text: "text-rose-400" },
                  { label: "Anchor 2 X", value: x2, setter: (v: number) => handleCurveChange(2, v), color: "accent-sky-400", text: "text-sky-400" },
                  { label: "Anchor 2 Y", value: y2, setter: (v: number) => handleCurveChange(3, v), color: "accent-sky-400", text: "text-sky-400" }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-[12px] font-medium">
                      <span className={item.text}>{item.label}</span>
                      <span className="text-slate-300 font-mono bg-slate-800/50 px-1.5 py-0.5 rounded">{item.value.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={item.value}
                      onChange={(e) => item.setter(Number(e.target.value))}
                      className={`w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer ${item.color}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Simulator Footer */}
          <div className="p-6 bg-[#14171d] border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex-1">
              <h4 className="text-[12px] font-semibold text-slate-300 mb-1">Live Multiplier Simulator</h4>
              <p className="text-[12px] text-slate-500">Adjust test input velocity below to see the resulting acceleration multiplier.</p>
              <div className="mt-4 max-w-xs space-y-2">
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={testVelocity}
                  onChange={(e) => setTestVelocity(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] font-medium text-slate-500">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>
            
            <div className="shrink-0 flex items-center justify-center w-24 h-24 bg-[#0c0e12] border border-slate-800 rounded-2xl shadow-inner">
              <div className="text-center">
                <span className="text-[11px] font-medium text-slate-500 block mb-1 uppercase tracking-wider">Output</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono">{getAccelerationMultiplier(testVelocity)}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters */}
        <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-4 flex items-center gap-2 border-b border-slate-800/60 bg-[#14171d]">
            <Sliders className="w-4 h-4 text-emerald-500" />
            <h3 className="text-[13px] font-semibold text-slate-200">
              Control Constraints
            </h3>
          </div>

          <div className="p-6 space-y-8 bg-[#0c0e12] flex-1">
            {/* Deadzone */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-[13px] font-semibold text-slate-200 flex items-center gap-1.5">
                    <MousePointer2 className="w-3.5 h-3.5 text-slate-400" /> Dead Zone Radius
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">Disregards micro-jitters to ensure a stable anchor.</p>
                </div>
                <span className="text-[13px] font-semibold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{settings.deadZone}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={settings.deadZone}
                onChange={(e) => onUpdateSettings({ deadZone: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Smoothing */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-[13px] font-semibold text-slate-200 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-slate-400" /> Coordinate Smoothing
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">Reduces tremor but adds input latency (2-6ms).</p>
                </div>
                <span className="text-[13px] font-semibold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Lvl {settings.smoothing}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.smoothing}
                onChange={(e) => onUpdateSettings({ smoothing: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <hr className="border-slate-800" />

            {/* Camera */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-semibold text-slate-200 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-slate-400" /> Capture Resolution
              </h4>
              <select
                value={settings.webcamResolution}
                onChange={(e) => onUpdateSettings({ webcamResolution: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#14171d] border border-slate-800 rounded-xl text-[12px] text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
              >
                <option value="640x480">640x480 (Performance)</option>
                <option value="1280x720">1280x720 (Balanced)</option>
                <option value="1920x1080">1920x1080 (High Fidelity)</option>
              </select>
            </div>

            {/* FPS */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-semibold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" /> Pipeline Framerate
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ trackingFPS: 30 })}
                  className={`py-2 px-3 text-[12px] font-medium rounded-xl border transition-all cursor-pointer shadow-sm ${
                    settings.trackingFPS === 30 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-[#14171d] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  30 FPS
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ trackingFPS: 60 })}
                  className={`py-2 px-3 text-[12px] font-medium rounded-xl border transition-all cursor-pointer shadow-sm ${
                    settings.trackingFPS === 60 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-[#14171d] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  60 FPS (Smooth)
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
