import React from 'react';
import { useCameraStore } from '@stores/cameraStore';
import { useTelemetryStore } from '@stores/telemetryStore';
import { useAppStore } from '@stores/appStore';
import { Play, Square, Camera, Sliders, Settings2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';

export default function DashboardView() {
  const { engineActive, setEngineActive } = useTelemetryStore();
  const activeDevice = useCameraStore(state => state.activeDevice);
  const config = useAppStore(state => state.config);
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const toggleEngine = () => {
    const newState = !engineActive;
    setEngineActive(newState);
    IPCClient.send(IPCEventType.ENGINE_STATUS, { 
      active: newState,
      deviceId: activeDevice?.deviceId || '0'
    });
  };

  const getSystemHealth = () => {
    if (!engineActive) return 'Offline';
    if (!activeDevice) return 'Warning: No Camera';
    return 'Optimal';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/80 border border-emerald-500/20 rounded-2xl p-8 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-semibold text-slate-100 mb-2">Ready to Control</h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Gesture Control Command Center is active. Your current profile is set to <span className="font-semibold text-emerald-400">"{config.activeProfileId}"</span>.
          </p>
          
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={toggleEngine}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm cursor-pointer ${
                engineActive 
                  ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20' 
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:shadow-emerald-500/25 border border-emerald-400'
              }`}
            >
              {engineActive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {engineActive ? 'Stop Tracking' : 'Start Tracking'}
            </button>
            
            {config.userMode !== 'beginner' && (
              <button 
                onClick={() => setActiveTab('calibration')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-slate-800/80 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                Calibrate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Core Systems Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Adaptive Intelligence Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Adaptive Intelligence</h3>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">Active</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Policy</span>
              <span className="font-medium text-purple-600 dark:text-purple-400 capitalize">Assisted</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Confidence</span>
              <span className="font-medium text-green-600 dark:text-green-400">92%</span>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">System Health</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-slate-100 mb-1">
            {getSystemHealth()}
          </div>
          <div className="text-xs text-slate-500">
            Node Backend v1.0.0
          </div>
        </div>

        {/* Camera Status */}
        <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Camera className="w-4 h-4" />
            <span className="text-sm font-medium">Camera</span>
          </div>
          <div className="text-2xl font-semibold text-slate-100 mb-1 truncate">
            {activeDevice ? activeDevice.label : 'None'}
          </div>
          <div className="text-xs text-slate-500">
            {activeDevice ? '720p @ 60fps' : 'Please connect a camera'}
          </div>
        </div>

        {/* Profile */}
        <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Settings2 className="w-4 h-4" />
            <span className="text-sm font-medium">Active Profile</span>
          </div>
          <div className="text-2xl font-semibold text-slate-100 mb-1 capitalize">
            {config.activeProfileId}
          </div>
          <div className="text-xs text-slate-500 capitalize">
            Mode: {config.userMode}
          </div>
        </div>

        {/* Action Required */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Updates</span>
          </div>
          <div className="text-xl font-semibold text-slate-100 mb-1">
            No Updates
          </div>
          <div className="text-xs text-slate-500">
            You are on the latest version.
          </div>
        </div>
      </div>
      
      {/* Recommended Actions */}
      <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-medium text-slate-300 mb-4 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setActiveTab('library')}
            className="text-left p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 transition-colors cursor-pointer"
          >
            <h4 className="font-medium text-slate-200 mb-1">View Gestures</h4>
            <p className="text-xs text-slate-500">Learn which hand gestures are available.</p>
          </button>
          <button 
            onClick={() => setActiveTab('profiles')}
            className="text-left p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 transition-colors cursor-pointer"
          >
            <h4 className="font-medium text-slate-200 mb-1">Change Sensitivity</h4>
            <p className="text-xs text-slate-500">Adjust how fast the cursor moves.</p>
          </button>
          <button className="text-left p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 transition-colors cursor-pointer">
            <h4 className="font-medium text-slate-200 mb-1 flex items-center justify-between">
              Interactive Tutorial
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">New</span>
            </h4>
            <p className="text-xs text-slate-500">Practice using gesture control safely.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
