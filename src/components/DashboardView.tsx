/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  Zap, 
  ShieldAlert, 
  Trash2,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { DiagnosticLog, GestureMapping, AppProfile } from '../types';

interface DashboardViewProps {
  logs: DiagnosticLog[];
  clearLogs: () => void;
  activeProfile: AppProfile;
  gestures: GestureMapping[];
  engineActive: boolean;
  setEngineActive: (active: boolean) => void;
  onSimulateGesture: (trigger: string) => void;
  onSimulateWarning: (msg: string) => void;
}

export default function DashboardView({
  logs,
  clearLogs,
  activeProfile,
  gestures,
  engineActive,
  onSimulateGesture,
  onSimulateWarning
}: DashboardViewProps) {
  const [logFilter, setLogFilter] = useState<'all' | 'input' | 'system'>('all');

  const activeGestures = gestures.filter(g => g.isActive).length;
  const lastGestureLog = [...logs].reverse().find(l => l.type === 'input');

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'input') return log.type === 'input' || log.type === 'success';
    if (logFilter === 'system') return log.type === 'info' || log.type === 'warning' || log.type === 'error';
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold text-slate-100 tracking-tight">
            Dashboard
          </h2>
          <p className="text-[13px] text-slate-400 mt-1">
            Overview of your system performance and gesture inputs.
          </p>
        </div>
        
        {/* Quick Simulator Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSimulateGesture('swipe-up')}
            disabled={!engineActive}
            className="px-3 py-1.5 text-[12px] bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-300 font-medium cursor-pointer transition-colors shadow-sm"
          >
            Test Swipe
          </button>
          <button
            onClick={() => onSimulateWarning('Camera exposure too low')}
            disabled={!engineActive}
            className="px-3 py-1.5 text-[12px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium cursor-pointer transition-colors shadow-sm"
          >
            Test Warning
          </button>
        </div>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Profile Card */}
        <div className="bg-[#14171d] border border-slate-800/60 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
          <span className="text-[12px] font-medium text-slate-500 mb-4">Active Profile</span>
          <div>
            <span className="text-xl font-bold text-slate-100 block truncate">{activeProfile.name}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[13px] text-slate-400">{activeGestures} mappings active</span>
            </div>
          </div>
        </div>

        {/* Engine Status Card */}
        <div className="bg-[#14171d] border border-slate-800/60 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
          <span className="text-[12px] font-medium text-slate-500 mb-4">Tracking Status</span>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-bold ${engineActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                {engineActive ? 'Operational' : 'Paused'}
              </span>
            </div>
            <span className="text-[13px] text-slate-400 mt-1 block">Latency: 4.2ms</span>
          </div>
        </div>

        {/* Recent Gesture Card */}
        <div className="bg-[#14171d] border border-slate-800/60 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
          <span className="text-[12px] font-medium text-slate-500 mb-4">Last Input</span>
          <div>
            {lastGestureLog ? (
              <>
                <span className="text-lg font-bold text-slate-100 block truncate">
                  {lastGestureLog.message.replace('Gesture: ', '')}
                </span>
                <span className="text-[12px] text-slate-400 mt-1 block font-mono">
                  {lastGestureLog.timestamp}
                </span>
              </>
            ) : (
              <span className="text-[14px] text-slate-500 italic block mt-2">Waiting for input...</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Matrix */}
        <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[14px] font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            Performance
          </h3>
          
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-[13px] text-slate-400 mb-2">
                <span>CPU Usage</span>
                <span className="text-slate-200 font-medium">1.8%</span>
              </div>
              <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[1.8%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] text-slate-400 mb-2">
                <span>Memory</span>
                <span className="text-slate-200 font-medium">112 MB</span>
              </div>
              <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full w-[15%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] text-slate-400 mb-2">
                <span>Tracking Confidence</span>
                <span className="text-emerald-400 font-medium">96.4%</span>
              </div>
              <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full w-[96.4%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Events Log */}
        <div className="lg:col-span-2 bg-[#14171d] border border-slate-800/60 rounded-2xl flex flex-col shadow-sm min-h-[400px]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-slate-200">Recent Events</h3>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-800/50 rounded-lg p-1">
                {['all', 'input', 'system'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f as any)}
                    className={`px-3 py-1 text-[12px] font-medium rounded-md capitalize transition-colors ${
                      logFilter === f ? 'bg-slate-700 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button 
                onClick={clearLogs}
                className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Log List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => {
                let Icon = Info;
                let iconColor = 'text-slate-400';
                
                if (log.type === 'input') {
                  Icon = Zap;
                  iconColor = 'text-emerald-400';
                } else if (log.type === 'success') {
                  Icon = CheckCircle2;
                  iconColor = 'text-emerald-500';
                } else if (log.type === 'warning') {
                  Icon = AlertCircle;
                  iconColor = 'text-amber-500';
                } else if (log.type === 'error') {
                  Icon = ShieldAlert;
                  iconColor = 'text-rose-500';
                }

                return (
                  <div key={log.id} className="flex items-start gap-4 p-3 hover:bg-white/[0.02] rounded-xl transition-colors group">
                    <div className={`mt-0.5 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-[13px] ${log.type === 'error' ? 'text-rose-400' : 'text-slate-300'}`}>
                        {log.message}
                      </p>
                      <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                        {log.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <ListFilter className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-[13px]">No events to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
