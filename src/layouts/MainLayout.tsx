import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import DashboardView from '@views/DashboardView';
import SettingsView from '@views/SettingsView';
import GesturesView from '@views/GesturesView';
import CalibrationWizard from '@components/CalibrationWizard';
import { GestureFeedbackOverlay } from '@components/GestureFeedbackOverlay';
import { DiagnosticsPanel } from '@components/DiagnosticsPanel';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { useAppStore } from '@stores/appStore';
import { useTelemetryStore } from '@stores/telemetryStore';
import { useEngineStore } from '@stores/engineStore';
import { IPCClient } from '@ipc/client';
import { EngineController, CameraController, TrackingController, ConfigurationController } from '@controllers';
import { RefreshCw, Play, Square, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export default function MainLayout() {
  const activeTab = useAppStore(state => state.activeTab);
  const initializeStore = useAppStore(state => state.initializeStore);
  const config = useAppStore(state => state.config);
  const calibrationOpen = useAppStore(state => state.calibrationOpen);
  const showToast = useAppStore(state => state.showToast);
  
  const setEngineActive = useTelemetryStore(state => state.setEngineActive);
  const setCameraOpen = useTelemetryStore(state => state.setCameraOpen);
  const setTrackingEnabled = useTelemetryStore(state => state.setTrackingEnabled);
  const setConfigApplied = useTelemetryStore(state => state.setConfigApplied);
  const resetState = useTelemetryStore(state => state.resetState);

  const engineState = useEngineStore(state => state.engineState);
  const statusMessage = useEngineStore(state => state.statusMessage);
  const milestones = useEngineStore(state => state.milestones);

  useEffect(() => {
    IPCClient.connect();
    initializeStore();

    const unsubscribe = IPCClient.subscribe((msg) => {
      if (msg.type === 'ENGINE_STARTED') {
        setEngineActive(true);
        CameraController.open();
      }
      else if (msg.type === 'CAMERA_OPENED') {
        setCameraOpen(true);
        setTimeout(() => {
          TrackingController.start();
        }, 600);
      }
      else if (msg.type === 'TRACKING_STARTED') {
        setTrackingEnabled(true);
        const currentConfig = useAppStore.getState().config;
        ConfigurationController.apply(currentConfig);
      }
      else if (msg.type === 'CONFIG_APPLIED') {
        setConfigApplied(true);
      }
      else if (msg.type === 'CAMERA_CLOSED') {
        setCameraOpen(false);
      }
      else if (msg.type === 'TRACKING_STOPPED') {
        setTrackingEnabled(false);
      }
      else if (msg.type === 'ENGINE_DIED') {
        resetState();
        showToast('Engine Stopped', 'Daemon process exited.', 'warn');
      }
    });

    return () => {
      unsubscribe();
      IPCClient.disconnect();
    };
  }, []);

  const handleToggleEngine = async () => {
    if (engineState === 'READY' || engineState === 'STARTING' || engineState === 'INITIALIZING' || engineState === 'WAITING_CAMERA') {
      await EngineController.stop();
      resetState();
    } else {
      await EngineController.start();
    }
  };

  const handleRestart = async () => {
    await EngineController.restart();
  };

  const accessibility = config?.accessibility || { highContrast: false, largeText: false, reducedMotion: false };

  const isTransitioning = ['STARTING', 'INITIALIZING', 'WAITING_CAMERA', 'STOPPING', 'RESTARTING'].includes(engineState);
  const isReady = engineState === 'READY';
  const isError = engineState === 'ERROR' || engineState === 'ENGINE_LOST';

  return (
    <div 
      id="gesture-app-shell" 
      className={`h-screen max-h-screen flex flex-col font-sans select-none overflow-hidden
        bg-[var(--color-bg-app)] text-[var(--color-text-primary)]
        ${accessibility.highContrast ? 'contrast-125' : ''}
        ${accessibility.largeText ? 'text-lg' : 'text-sm'}
        ${accessibility.reducedMotion ? 'motion-reduce' : ''}
      `}
    >
      {/* Windows 11 Native-like Title Bar */}
      <header className="h-[42px] flex items-center justify-between pl-4 pr-1 shrink-0 app-region-drag select-none bg-[#09090d]/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          <span className="text-[12px] font-bold text-white tracking-wide">Gesture Control Utility</span>
          
          {/* Progress Bar & Engine Status Badge */}
          <div className="flex items-center gap-2 pl-3 border-l border-white/10">
            {isTransitioning && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
            {isReady && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
            {isError && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
            
            <span className={`text-[11px] font-mono font-semibold ${
              isReady ? 'text-green-400' : isError ? 'text-red-400' : isTransitioning ? 'text-amber-400' : 'text-white/40'
            }`}>
              {statusMessage}
            </span>

            {/* Milestone Micro Progress */}
            {isTransitioning && (
              <div className="flex items-center gap-1">
                {milestones.map((m, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    m.completed ? 'bg-green-400' : 'bg-white/15'
                  }`} title={m.label} />
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center h-full app-region-no-drag">
          {/* Restart Engine Button */}
          <button 
            onClick={handleRestart}
            title="Restart Engine without closing app"
            className="flex items-center gap-1.5 px-2.5 py-1 mr-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${engineState === 'RESTARTING' ? 'animate-spin' : ''}`} />
            <span>Restart Engine</span>
          </button>

          {/* Engine Start/Stop Action Button */}
          <button
            onClick={handleToggleEngine}
            className={`flex items-center gap-1.5 px-3 py-1 mr-4 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-lg ${
              isReady 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40' 
                : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/50'
            }`}
          >
            {isReady ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isReady ? 'Stop Engine' : 'Start Engine'}</span>
          </button>

          <div className="w-px h-4 bg-white/10 mr-2"></div>
          
          <div onClick={() => IPCClient.invoke('window-minimize')} className="app-region-no-drag w-10 h-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-white/70">
            <svg width="10" height="10" viewBox="0 0 10 10"><path fill="currentColor" d="M0,4.5v1h10v-1H0z"/></svg>
          </div>
          <div onClick={() => IPCClient.invoke('window-maximize')} className="app-region-no-drag w-10 h-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-white/70">
            <svg width="10" height="10" viewBox="0 0 10 10"><path fill="currentColor" d="M1,1v8h8V1H1z M8,8H2V2h6V8z"/></svg>
          </div>
          <div onClick={() => IPCClient.invoke('window-close')} className="app-region-no-drag w-10 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors cursor-pointer text-white/70">
            <svg width="10" height="10" viewBox="0 0 10 10"><path fill="currentColor" d="M1.5,1.5l7,7M8.5,1.5l-7,7" stroke="currentColor" strokeWidth="1"/></svg>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto relative p-8">
          <div className="max-w-4xl mx-auto pb-12">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'gestures' && <GesturesView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
      
      {calibrationOpen && <CalibrationWizard />}
      <GestureFeedbackOverlay />
      <ErrorBoundary fallbackTitle="Diagnostics Panel Exception">
        <DiagnosticsPanel />
      </ErrorBoundary>
    </div>
  );
}
