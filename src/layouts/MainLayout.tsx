import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import DashboardView from '@views/DashboardView';
import SettingsView from '@views/SettingsView';
import GesturesView from '@views/GesturesView';
import CalibrationWizard from '@components/CalibrationWizard';
import { DiagnosticsPanel } from '@components/DiagnosticsPanel';
import { useAppStore } from '@stores/appStore';
import { useTelemetryStore } from '@stores/telemetryStore';
import { IPCClient } from '@ipc/client';
import { IPCEventType } from '@shared/events';
import { EngineController, CameraController, TrackingController, ConfigurationController } from '@controllers';

export default function MainLayout() {
  const activeTab = useAppStore(state => state.activeTab);
  const initializeStore = useAppStore(state => state.initializeStore);
  const config = useAppStore(state => state.config);
  const calibrationOpen = useAppStore(state => state.calibrationOpen);
  const showToast = useAppStore(state => state.showToast);
  
  const engineActive = useTelemetryStore(state => state.engineActive);
  const setEngineActive = useTelemetryStore(state => state.setEngineActive);
  const setCameraOpen = useTelemetryStore(state => state.setCameraOpen);
  const setTrackingEnabled = useTelemetryStore(state => state.setTrackingEnabled);
  const setConfigApplied = useTelemetryStore(state => state.setConfigApplied);
  const resetState = useTelemetryStore(state => state.resetState);

  useEffect(() => {
    IPCClient.connect();
    initializeStore();

    const unsubscribe = IPCClient.subscribe((msg) => {
      // Deterministic State Machine Handlers
      if (msg.type === 'ENGINE_STARTED') {
        setEngineActive(true);
        CameraController.open(); // Transition to Open Camera
      }
      else if (msg.type === 'CAMERA_OPENED') {
        setCameraOpen(true);
        // Wait for hardware spin up before starting tracking
        setTimeout(() => {
          TrackingController.start(); // Transition to Tracking
        }, 800);
      }
      else if (msg.type === 'TRACKING_STARTED') {
        setTrackingEnabled(true);
        // Finally push the configuration
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
        showToast('Engine Crashed', 'The backend daemon terminated unexpectedly.', 'error');
      }
    });

    return () => {
      unsubscribe();
      IPCClient.disconnect();
    };
  }, []);

  const handleToggleEngine = async () => {
    if (engineActive) {
      await EngineController.stop();
      resetState();
    } else {
      await EngineController.start();
    }
  };

  const accessibility = config?.accessibility || { highContrast: false, largeText: false, reducedMotion: false };
  const theme = config?.theme || 'dark';

  return (
    <div 
      id="gesture-app-shell" 
      className={`min-h-screen flex flex-col font-sans select-none overflow-hidden
        bg-[var(--color-bg-app)] text-[var(--color-text-primary)]
        ${accessibility.highContrast ? 'contrast-125' : ''}
        ${accessibility.largeText ? 'text-lg' : 'text-sm'}
        ${accessibility.reducedMotion ? 'motion-reduce' : ''}
      `}
    >
      {/* Windows 11 Native-like Title Bar */}
      <header className="h-[40px] flex items-center justify-between pl-4 pr-1 shrink-0 app-region-drag select-none bg-[#0a0a0a] border-b border-[#222]">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)]">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span className="text-[12px] font-medium text-white/90 tracking-wide">Gesture Control Utility</span>
        </div>
        
        <div className="flex items-center h-full app-region-no-drag">
          <div className="flex items-center gap-3 mr-4">
             <span className="text-xs text-white/50">{engineActive ? 'Engine Running' : 'Engine Suspended'}</span>
             <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={engineActive} onChange={handleToggleEngine} />
                <div className="w-9 h-5 bg-[#333333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
          </div>
          <div className="w-px h-4 bg-[#333] mr-2"></div>
          <div onClick={() => IPCClient.invoke('window-minimize')} className="app-region-no-drag w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
            <svg width="10" height="10" viewBox="0 0 10 10"><path fill="currentColor" d="M0,4.5v1h10v-1H0z"/></svg>
          </div>
          <div onClick={() => IPCClient.invoke('window-maximize')} className="app-region-no-drag w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
            <svg width="10" height="10" viewBox="0 0 10 10"><path fill="currentColor" d="M1,1v8h8V1H1z M8,8H2V2h6V8z"/></svg>
          </div>
          <div onClick={() => IPCClient.invoke('window-close')} className="app-region-no-drag w-12 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors cursor-pointer">
            <svg width="10" height="10" viewBox="0 0 10 10"><path fill="currentColor" d="M1.5,1.5l7,7M8.5,1.5l-7,7" stroke="currentColor" strokeWidth="1"/></svg>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto no-scrollbar relative p-8">
          <div className="max-w-4xl mx-auto pb-12">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'gestures' && <GesturesView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
      
      {calibrationOpen && <CalibrationWizard />}
      <DiagnosticsPanel />
    </div>
  );
}
