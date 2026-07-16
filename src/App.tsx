/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import GestureLibraryView from './components/GestureLibraryView';
import SandboxView from './components/SandboxView';
import CalibrationView from './components/CalibrationView';
import ProfileView from './components/ProfileView';

import { 
  GestureMapping, 
  DiagnosticLog, 
  CalibrationSettings, 
  AppProfile 
} from './types';
import { Sparkles, Terminal, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';

const DEFAULT_GESTURES: GestureMapping[] = [
  { id: 'g1', name: 'Volume Booster', trigger: 'swipe-up', actionType: 'volume-control', targetAction: 'volume-up', isActive: true, confidenceThreshold: 80, isSystemDefault: true },
  { id: 'g2', name: 'Volume Quieter', trigger: 'swipe-down', actionType: 'volume-control', targetAction: 'volume-down', isActive: true, confidenceThreshold: 80, isSystemDefault: true },
  { id: 'g3', name: 'Music Backtrack', trigger: 'swipe-left', actionType: 'media-control', targetAction: 'media-prev', isActive: true, confidenceThreshold: 85, isSystemDefault: true },
  { id: 'g4', name: 'Music Skip Ahead', trigger: 'swipe-right', actionType: 'media-control', targetAction: 'media-next', isActive: true, confidenceThreshold: 85, isSystemDefault: true },
  { id: 'g5', name: 'Reveal Desktop Canvas', trigger: 'circle', actionType: 'keystroke', targetAction: 'Win + D', isActive: true, confidenceThreshold: 90, isSystemDefault: true },
  { id: 'g6', name: 'Instant Music Play', trigger: 'tap', actionType: 'media-control', targetAction: 'media-play', isActive: true, confidenceThreshold: 80, isSystemDefault: true },
  { id: 'g7', name: 'Toggle Sound Audio', trigger: 'double-tap', actionType: 'volume-control', targetAction: 'volume-mute', isActive: false, confidenceThreshold: 85, isSystemDefault: true },
  { id: 'g8', name: 'Trigger App Launcher', trigger: 'pinch', actionType: 'launch-app', targetAction: 'C:\\Windows\\System32\\calc.exe', isActive: true, confidenceThreshold: 90, isSystemDefault: true }
];

const DEFAULT_CALIBRATION: CalibrationSettings = {
  deadZone: 25,
  smoothing: 5,
  minConfidence: 80,
  accelerationCurve: [0.25, 0.1, 0.25, 1.0], // Ease-out standard curve
  webcamResolution: '1280x720',
  trackingFPS: 60
};

const DEFAULT_PROFILES: AppProfile[] = [
  {
    id: 'p1',
    name: 'Media & Comfort Mode',
    description: 'Optimal triggers configured for Netflix, Spotify, and system volume controls.',
    isDefault: true,
    gestures: [...DEFAULT_GESTURES],
    calibration: { ...DEFAULT_CALIBRATION }
  },
  {
    id: 'p2',
    name: 'Hands-Free Photoshop',
    description: 'Tailored mappings for canvas rotation, zooming, brush changes, and command history.',
    isDefault: false,
    gestures: [
      { id: 'ps1', name: 'Undo Stroke', trigger: 'swipe-left', actionType: 'keystroke', targetAction: 'Ctrl + Z', isActive: true, confidenceThreshold: 85 },
      { id: 'ps2', name: 'Redo Stroke', trigger: 'swipe-right', actionType: 'keystroke', targetAction: 'Ctrl + Shift + Z', isActive: true, confidenceThreshold: 85 },
      { id: 'ps3', name: 'Increase Brush Size', trigger: 'swipe-up', actionType: 'keystroke', targetAction: ']', isActive: true, confidenceThreshold: 80 },
      { id: 'ps4', name: 'Decrease Brush Size', trigger: 'swipe-down', actionType: 'keystroke', targetAction: '[', isActive: true, confidenceThreshold: 80 },
      { id: 'ps5', name: 'Fit Canvas to Screen', trigger: 'circle', actionType: 'keystroke', targetAction: 'Ctrl + 0', isActive: true, confidenceThreshold: 90 }
    ],
    calibration: {
      ...DEFAULT_CALIBRATION,
      deadZone: 15,
      smoothing: 7,
      accelerationCurve: [0.1, 0.9, 0.2, 1.0]
    }
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [engineActive, setEngineActive] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);
  
  // Custom Toast notification states
  const [toast, setToast] = useState<{ id: string; title: string; message: string; type: 'success' | 'warn' } | null>(null);

  // Profiles and active profile config states
  const [profiles, setProfiles] = useState<AppProfile[]>(() => {
    const cached = localStorage.getItem('gccc_profiles');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    return DEFAULT_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    const cachedId = localStorage.getItem('gccc_active_profile_id');
    return cachedId || 'p1';
  });

  // Diagnostic log system states
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  // Helper: Persist profiles
  const saveProfilesToStorage = (updatedProfiles: AppProfile[]) => {
    setProfiles(updatedProfiles);
    localStorage.setItem('gccc_profiles', JSON.stringify(updatedProfiles));
  };

  // Helper: append logs
  const addLog = (message: string, type: DiagnosticLog['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: DiagnosticLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      message,
      type
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 150)); // Max 150 logs in trace buffer
  };

  const ws = useRef<WebSocket | null>(null);

  // Initialize startup diagnostics and IPC connection
  useEffect(() => {
    addLog('Skeletal Pipeline Engine initialized.', 'info');
    addLog('Host OS: Windows 11 x64 (CLR Native CLI Host)', 'info');
    addLog('Hardware backend: DirectX12 DirectCompute shaders loaded.', 'info');
    addLog(`Active profile loaded: '${activeProfile.name}'`, 'success');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}/api/ws`;
    const socket = new WebSocket(socketUrl);
    
    socket.onopen = () => {
      console.log('IPC Connected');
      addLog('IPC Bridge Connected to backend daemon.', 'success');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'info') addLog(data.message, 'info');
        if (data.type === 'success') addLog(data.message, 'success');
        if (data.type === 'warning') addLog(data.message, 'warning');
      } catch (err) {
        console.error(err);
      }
    };

    socket.onclose = () => {
      addLog('IPC Bridge Disconnected from backend daemon.', 'error');
    };

    ws.current = socket;

    return () => socket.close();
  }, []);

  // Sync active profile selection
  const handleSelectProfile = (id: string) => {
    setActiveProfileId(id);
    localStorage.setItem('gccc_active_profile_id', id);
    const prof = profiles.find(p => p.id === id);
    if (prof) {
      addLog(`Configuration swapped to profile: '${prof.name}'`, 'success');
      showToast(`Profile Active: ${prof.name}`, `Loaded ${prof.gestures.length} gesture maps.`, 'success');
    }
  };

  // Trigger Toast notifications
  const showToast = (title: string, message: string, type: 'success' | 'warn') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ id, title, message, type });
    setTimeout(() => {
      setToast(prev => prev?.id === id ? null : prev);
    }, 4500);
  };

  // Telemetry loop - simulates background CPU/tracking engine work
  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'engine_status', payload: { active: engineActive } }));
    }

    if (!engineActive) {
      setFps(0);
      addLog('Skeletal Tracking Service disabled locally.', 'warning');
      return;
    }

    addLog('Skeletal Tracking Service initialized local telemetry.', 'info');
    setFps(60);

    const interval = setInterval(() => {
      // Small FPS jitter for realism
      setFps(Math.floor(Math.random() * 5) + 57);

      // Random background checks/logs 
      const checkChance = Math.random();
      if (checkChance < 0.15) {
        addLog('Tracking pipeline confidence check: stable (96.4% confidence)', 'info');
      } else if (checkChance < 0.22) {
        addLog('DirectX buffers synchronized. Pipeline render latency: 4.1ms', 'info');
      }
    }, 12000);

    return () => {
      clearInterval(interval);
    };
  }, [engineActive]);

  // Gestures CRUD mapping operations
  const handleAddGesture = (data: Omit<GestureMapping, 'id'>) => {
    const newGesture: GestureMapping = {
      ...data,
      id: 'g_' + Math.random().toString(36).substring(2, 9)
    };

    const updated = profiles.map(p => {
      if (p.id === activeProfileId) {
        return { ...p, gestures: [newGesture, ...p.gestures] };
      }
      return p;
    });

    saveProfilesToStorage(updated);
    addLog(`Created custom gesture mapping rule: '${data.name}'`, 'success');
    showToast('Mapping Saved', `'${data.name}' registered to '${data.trigger}'.`, 'success');
  };

  const handleUpdateGesture = (id: string, updatedFields: Partial<GestureMapping>) => {
    const updated = profiles.map(p => {
      if (p.id === activeProfileId) {
        const gestures = p.gestures.map(g => {
          if (g.id === id) {
            return { ...g, ...updatedFields };
          }
          return g;
        });
        return { ...p, gestures };
      }
      return p;
    });

    saveProfilesToStorage(updated);

    if (updatedFields.isActive !== undefined) {
      const g = activeProfile.gestures.find(i => i.id === id);
      if (g) {
        addLog(`Gesture rule '${g.name}' ${updatedFields.isActive ? 'activated' : 'deactivated'}.`, 'info');
      }
    } else {
      addLog('Skeletal mapping configurations updated.', 'info');
    }
  };

  const handleDeleteGesture = (id: string) => {
    const rule = activeProfile.gestures.find(g => g.id === id);
    if (!rule) return;

    const updated = profiles.map(p => {
      if (p.id === activeProfileId) {
        return { ...p, gestures: p.gestures.filter(g => g.id !== id) };
      }
      return p;
    });

    saveProfilesToStorage(updated);
    addLog(`Deleted gesture mapping rule: '${rule.name}'`, 'warning');
    showToast('Mapping Deleted', `Removed '${rule.name}' from pipeline rules.`, 'warn');
  };

  const handleResetToDefaults = () => {
    const updated = profiles.map(p => {
      if (p.id === activeProfileId) {
        if (p.id === 'p1') {
          return { ...p, gestures: [...DEFAULT_GESTURES], calibration: { ...DEFAULT_CALIBRATION } };
        } else {
          return { ...p, gestures: [] };
        }
      }
      return p;
    });

    saveProfilesToStorage(updated);
    addLog('Reset current profile configurations to standard system defaults.', 'warning');
    showToast('Profile Reset', 'Mappings reverted to default specifications.', 'warn');
  };

  // Calibration settings changes
  const handleUpdateCalibration = (fields: Partial<CalibrationSettings>) => {
    const updated = profiles.map(p => {
      if (p.id === activeProfileId) {
        return { ...p, calibration: { ...p.calibration, ...fields } };
      }
      return p;
    });

    saveProfilesToStorage(updated);
    addLog(`Calibration modified: ${Object.keys(fields).join(', ')} updated.`, 'info');
  };

  // Profile management
  const handleCreateProfile = (name: string, description: string) => {
    const newProfile: AppProfile = {
      id: 'p_' + Math.random().toString(36).substring(2, 9),
      name,
      description,
      isDefault: false,
      gestures: [],
      calibration: { ...DEFAULT_CALIBRATION }
    };

    const nextProfiles = [...profiles, newProfile];
    saveProfilesToStorage(nextProfiles);
    addLog(`Created new environment profile: '${name}'`, 'success');
    showToast('Profile Registered', `Profile '${name}' is now customizable.`, 'success');
  };

  const handleDeleteProfile = (id: string) => {
    if (id === activeProfileId) {
      setActiveProfileId('p1');
    }
    const nextProfiles = profiles.filter(p => p.id !== id);
    saveProfilesToStorage(nextProfiles);
    addLog('Custom profile deleted from library.', 'warning');
  };

  // Config mapping parser
  const handleImportProfile = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.name || !Array.isArray(parsed.gestures)) return false;

      const importedProfile: AppProfile = {
        id: 'p_' + Math.random().toString(36).substring(2, 9),
        name: parsed.name,
        description: parsed.description || 'Imported custom profile configuration.',
        isDefault: false,
        gestures: parsed.gestures.map((g: any, idx: number) => ({
          id: `g_imp_${idx}_` + Math.random().toString(36).substring(2, 5),
          name: g.name || 'Imported Command',
          trigger: g.trigger || 'swipe-left',
          actionType: g.actionType || 'keystroke',
          targetAction: g.targetAction || 'Unassigned',
          isActive: g.isActive !== undefined ? g.isActive : true,
          confidenceThreshold: g.confidenceThreshold || 80
        })),
        calibration: parsed.calibration ? { ...DEFAULT_CALIBRATION, ...parsed.calibration } : { ...DEFAULT_CALIBRATION }
      };

      const nextProfiles = [...profiles, importedProfile];
      saveProfilesToStorage(nextProfiles);
      setActiveProfileId(importedProfile.id);
      addLog(`Imported profile successfully: '${importedProfile.name}'`, 'success');
      showToast('Profile Synced', `Imported ${importedProfile.gestures.length} gesture maps.`, 'success');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleExportProfile = (profile: AppProfile): string => {
    const exportSchema = {
      name: profile.name,
      description: profile.description,
      gestures: profile.gestures.map(({ name, trigger, actionType, targetAction, isActive, confidenceThreshold }) => ({
        name, trigger, actionType, targetAction, isActive, confidenceThreshold
      })),
      calibration: {
        deadZone: profile.calibration.deadZone,
        smoothing: profile.calibration.smoothing,
        minConfidence: profile.calibration.minConfidence,
        accelerationCurve: profile.calibration.accelerationCurve,
        webcamResolution: profile.calibration.webcamResolution,
        trackingFPS: profile.calibration.trackingFPS
      }
    };
    return JSON.stringify(exportSchema, null, 2);
  };

  // Real gesture simulator
  const handleTriggerGesture = (trigger: string, confidence: number) => {
    if (!engineActive) return;

    // Search active profile mappings
    const mapped = activeProfile.gestures.find(g => g.trigger === trigger && g.isActive);
    if (mapped) {
      addLog(`Gesture recognized: Swipe direction [${trigger.toUpperCase()}] (${confidence}% conf.)`, 'input');
      
      // Dispatch via IPC
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          action: 'simulate_gesture',
          payload: { trigger, targetAction: mapped.targetAction, name: mapped.name }
        }));
      } else {
        addLog(`MAPPED KEYSTROKE FIRED: sending Windows command -> '${mapped.targetAction}'`, 'success');
      }
      
      showToast(
        `Action Recognized: ${mapped.name}`, 
        `Triggered mapped action: ${mapped.targetAction}`, 
        'success'
      );
    } else {
      addLog(`Gesture recognized: [${trigger.toUpperCase()}] (${confidence}% conf.) - No active mapping configured.`, 'warning');
      showToast(
        `Gesture Tracked`, 
        `Recognized [${trigger.toUpperCase()}], but no action mapped.`, 
        'warn'
      );
    }
  };

  const handleSimulateWarning = (msg: string) => {
    if (!engineActive) return;
    addLog(`Pipeline warning check: ${msg}`, 'warning');
    showToast('Tracking Degraded', msg, 'warn');
  };

  return (
    <div id="gesture-app-shell" className="min-h-screen bg-[#0c0e12] text-slate-200 flex flex-col font-sans select-none antialiased overflow-hidden">
      {/* Windows 11 Native-like Title Bar */}
      <header className="h-10 flex items-center justify-between px-4 shrink-0 app-region-drag select-none border-b border-slate-800/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          <span className="text-[11px] font-medium text-slate-400 tracking-wide">Gesture Control</span>
        </div>
        
        {/* Fake Window Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
            <div className="w-3 h-px bg-slate-400"></div>
            <div className="w-3 h-3 border border-slate-400 rounded-[2px]"></div>
            <div className="w-3 h-3 relative before:absolute before:inset-0 before:rotate-45 before:bg-slate-400 before:h-px before:top-1.5 after:absolute after:inset-0 after:-rotate-45 after:bg-slate-400 after:h-px after:top-1.5"></div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          engineActive={engineActive} 
          setEngineActive={setEngineActive}
          fps={fps} 
        />

        <main className="flex-1 overflow-y-auto no-scrollbar relative p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView 
                logs={logs}
                clearLogs={() => setLogs([])}
                activeProfile={activeProfile}
                gestures={activeProfile.gestures}
                engineActive={engineActive}
                setEngineActive={setEngineActive}
                onSimulateGesture={(trig) => handleTriggerGesture(trig, 97)}
                onSimulateWarning={handleSimulateWarning}
              />
            )}

            {activeTab === 'library' && (
              <GestureLibraryView 
                gestures={activeProfile.gestures}
                onAddGesture={handleAddGesture}
                onUpdateGesture={handleUpdateGesture}
                onDeleteGesture={handleDeleteGesture}
                onResetToDefaults={handleResetToDefaults}
              />
            )}

            {activeTab === 'sandbox' && (
              <SandboxView 
                gestures={activeProfile.gestures}
                onTriggerGesture={handleTriggerGesture}
                engineActive={engineActive}
              />
            )}

            {activeTab === 'calibration' && (
              <CalibrationView 
                settings={activeProfile.calibration}
                onUpdateSettings={handleUpdateCalibration}
              />
            )}

            {activeTab === 'profiles' && (
              <ProfileView 
                profiles={profiles}
                activeProfileId={activeProfileId}
                onSelectProfile={handleSelectProfile}
                onCreateProfile={handleCreateProfile}
                onDeleteProfile={handleDeleteProfile}
                onImportProfile={handleImportProfile}
                onExportProfile={handleExportProfile}
              />
            )}
          </div>

          {/* Floating Toast Notification */}
          {toast && (
            <div 
              className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl max-w-sm z-50 flex items-start gap-3 transition-all duration-300 transform translate-y-0 scale-100 ${
                toast.type === 'success' 
                  ? 'bg-[#181a20] border border-emerald-500/10 text-slate-200' 
                  : 'bg-[#181a20] border border-amber-500/10 text-slate-200'
              }`}
            >
              <div className="mt-0.5">
                {toast.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[13px] font-medium text-slate-100">
                  {toast.title}
                </h4>
                <p className="text-[12px] text-slate-400">
                  {toast.message}
                </p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
