import { create } from 'zustand';

// Independent subsystem states (Item #1)
export type EngineSubstate = 'OFF' | 'STARTING' | 'READY' | 'STOPPING' | 'ERROR';
export type CameraSubstate = 'DISCONNECTED' | 'CONNECTING' | 'READY' | 'ERROR';
export type TrackingSubstate = 'IDLE' | 'WARMING_UP' | 'DETECTING' | 'TRACKING' | 'LOST';

export type HealthBadge = 'HEALTHY' | 'WARNING' | 'RECOVERING' | 'FAILED';
export type TrackingQualityLabel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

// Legacy EngineState type kept for backward compatibility in MainLayout
export type EngineState = 
  | 'OFF'
  | 'STARTING'
  | 'INITIALIZING'
  | 'WAITING_CAMERA'
  | 'READY'
  | 'STOPPING'
  | 'ERROR'
  | 'RESTARTING'
  | 'ENGINE_LOST';

export interface Subsystems {
  engine: EngineSubstate;
  camera: CameraSubstate;
  tracking: TrackingSubstate;
}

export interface TrackingQuality {
  score: number;
  label: TrackingQualityLabel;
}

export interface HealthStatus {
  score: number;
  badge: HealthBadge;
  details: {
    heartbeatAlive: boolean;
    cameraActive: boolean;
    fpsStable: boolean;
    inferenceRunning: boolean;
    zeroExceptions: boolean;
  };
}

export interface HeartbeatData {
  cpu: number;
  ram_mb: number;
  fps: number;
  camera_open: boolean;
  tracking: boolean;
  uptime_sec: number;
  frame_latency_ms: number;
}

// Milestone Stepper (Item #2)
export interface Milestone {
  label: string;
  completed: boolean;
}

export interface EngineLog {
  timestamp: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  subsystem: string;
  message: string;
  metadata?: Record<string, any>;
}

interface EngineStoreState {
  // Legacy top-level state (derived from subsystems)
  engineState: EngineState;
  statusMessage: string;

  // Independent subsystem states
  subsystems: Subsystems;

  // Milestone stepper
  milestones: Milestone[];

  // Tracking quality
  trackingQuality: TrackingQuality;

  // Health monitoring
  heartbeat: HeartbeatData | null;
  health: HealthStatus;

  // Structured logs
  engineLogs: EngineLog[];

  // Actions
  setSubsystems: (subsystems: Partial<Subsystems>, milestone?: string) => void;
  setMilestoneCompleted: (label: string) => void;
  setTrackingQuality: (quality: TrackingQuality) => void;
  setEngineState: (state: EngineState, progress?: number, message?: string) => void;
  updateHeartbeat: (data: HeartbeatData) => void;
  setHealth: (health: HealthStatus) => void;
  addLog: (log: EngineLog) => void;
  clearLogs: () => void;
}

const DEFAULT_MILESTONES: Milestone[] = [
  { label: 'Starting Engine', completed: false },
  { label: 'Loading AI Models', completed: false },
  { label: 'Loading Gesture Modules', completed: false },
  { label: 'Initializing Motion Engine', completed: false },
  { label: 'Opening Camera', completed: false },
  { label: 'Warming Tracking Pipeline', completed: false },
  { label: 'Ready', completed: false },
];

function deriveHealth(heartbeat: HeartbeatData | null, subsystems: Subsystems): HealthStatus {
  if (!heartbeat) {
    return {
      score: 0,
      badge: 'FAILED',
      details: { heartbeatAlive: false, cameraActive: false, fpsStable: false, inferenceRunning: false, zeroExceptions: subsystems.engine !== 'ERROR' && subsystems.camera !== 'ERROR' }
    };
  }

  const fpsStable = heartbeat.fps >= 10;
  const cameraActive = heartbeat.camera_open || subsystems.camera === 'READY';
  const inferenceRunning = heartbeat.tracking;
  const zeroExceptions = subsystems.engine !== 'ERROR' && subsystems.camera !== 'ERROR';

  let score = 100;
  if (!fpsStable) score -= 20;
  if (!cameraActive) score -= 40;
  if (!inferenceRunning) score -= 20;
  if (!zeroExceptions) score -= 100;

  score = Math.max(0, Math.min(100, score));

  let badge: HealthBadge = 'HEALTHY';
  if (score >= 80) badge = 'HEALTHY';
  else if (score >= 50) badge = 'WARNING';
  else if (score > 0) badge = 'RECOVERING';
  else badge = 'FAILED';

  return {
    score,
    badge,
    details: {
      heartbeatAlive: true,
      cameraActive,
      fpsStable,
      inferenceRunning,
      zeroExceptions
    }
  };
}

function deriveEngineState(subsystems: Subsystems): EngineState {
  if (subsystems.engine === 'ERROR' || subsystems.camera === 'ERROR') return 'ERROR';
  if (subsystems.engine === 'STOPPING') return 'STOPPING';
  if (subsystems.engine === 'OFF') return 'OFF';
  if (subsystems.engine === 'STARTING') return 'STARTING';
  
  if (subsystems.engine === 'READY') {
    if (subsystems.camera === 'DISCONNECTED' || subsystems.camera === 'CONNECTING') return 'WAITING_CAMERA';
    if (subsystems.tracking === 'WARMING_UP') return 'INITIALIZING';
    if (subsystems.camera === 'READY' && (subsystems.tracking === 'TRACKING' || subsystems.tracking === 'IDLE' || subsystems.tracking === 'DETECTING' || subsystems.tracking === 'LOST')) {
      return 'READY';
    }
    return 'INITIALIZING';
  }
  return 'OFF';
}

export const useEngineStore = create<EngineStoreState>((set) => ({
  engineState: 'OFF',
  statusMessage: 'Engine Stopped',

  subsystems: {
    engine: 'OFF',
    camera: 'DISCONNECTED',
    tracking: 'IDLE',
  },

  milestones: DEFAULT_MILESTONES.map(m => ({ ...m })),

  trackingQuality: { score: 0, label: 'POOR' },

  heartbeat: null,
  health: {
    score: 0,
    badge: 'FAILED',
    details: { heartbeatAlive: false, cameraActive: false, fpsStable: false, inferenceRunning: false, zeroExceptions: true }
  },
  engineLogs: [],

  setSubsystems: (partial, milestone) => set((prev) => {
    const merged: Subsystems = { ...prev.subsystems, ...partial };
    const derivedState = deriveEngineState(merged);
    const health = deriveHealth(prev.heartbeat, merged);

    // Advance milestone stepper if milestone string provided
    let updatedMilestones = prev.milestones;
    if (milestone) {
      updatedMilestones = prev.milestones.map(m => {
        // Match milestone by checking if the label appears in the milestone string
        if (milestone.includes(m.label) || milestone.includes('Ready') && m.label === 'Ready') {
          return { ...m, completed: true };
        }
        return m;
      });

      // Also mark all milestones up to and including the matched one
      const matchIdx = updatedMilestones.findIndex(m => milestone.includes(m.label));
      if (matchIdx >= 0) {
        updatedMilestones = updatedMilestones.map((m, i) => i <= matchIdx ? { ...m, completed: true } : m);
      }
    }

    // Reset milestones when engine goes OFF
    if (merged.engine === 'OFF') {
      updatedMilestones = DEFAULT_MILESTONES.map(m => ({ ...m }));
    }

    return {
      subsystems: merged,
      engineState: derivedState,
      statusMessage: milestone || derivedState,
      milestones: updatedMilestones,
      health,
    };
  }),

  setMilestoneCompleted: (label) => set((prev) => {
    const idx = prev.milestones.findIndex(m => m.label === label);
    if (idx < 0) return {};
    const updated = prev.milestones.map((m, i) => i <= idx ? { ...m, completed: true } : m);
    return { milestones: updated };
  }),

  setTrackingQuality: (quality) => set({ trackingQuality: quality }),

  // Legacy setter for backward compatibility
  setEngineState: (state, _progress = 0, message = '') => set((prev) => {
    // Map legacy state to milestone completion
    let milestoneLabel = '';
    if (state === 'STARTING') milestoneLabel = 'Starting Engine';
    else if (state === 'INITIALIZING') milestoneLabel = 'Loading AI Models';
    else if (state === 'WAITING_CAMERA') milestoneLabel = 'Opening Camera';
    else if (state === 'READY') milestoneLabel = 'Ready';

    let updatedMilestones = prev.milestones;
    if (milestoneLabel) {
      const idx = updatedMilestones.findIndex(m => m.label === milestoneLabel);
      if (idx >= 0) {
        updatedMilestones = updatedMilestones.map((m, i) => i <= idx ? { ...m, completed: true } : m);
      }
    }

    if (state === 'OFF') {
      updatedMilestones = DEFAULT_MILESTONES.map(m => ({ ...m }));
    }

    return {
      engineState: state,
      statusMessage: message || state,
      milestones: updatedMilestones,
      engineLogs: [
        { timestamp: new Date().toISOString().split('T')[1].slice(0, 8), severity: state === 'ERROR' ? 'ERROR' : 'INFO', subsystem: 'Engine', message: `State: ${state}: ${message}` },
        ...prev.engineLogs.slice(0, 99)
      ]
    };
  }),

  updateHeartbeat: (data) => set((prev) => {
    const nextSubsystems: Subsystems = {
      ...prev.subsystems,
      engine: 'READY',
      camera: data.camera_open ? 'READY' : prev.subsystems.camera,
      tracking: prev.subsystems.tracking,
    };
    const health = deriveHealth(data, nextSubsystems);
    
    return {
      heartbeat: data,
      engineState: prev.engineState === 'INITIALIZING' || prev.engineState === 'WAITING_CAMERA' || prev.engineState === 'STARTING' ? 'READY' : prev.engineState,
      subsystems: nextSubsystems,
      health,
    };
  }),

  setHealth: (health) => set({ health }),

  addLog: (log) => set((prev) => ({
    engineLogs: [log, ...prev.engineLogs.slice(0, 99)]
  })),

  clearLogs: () => set({ engineLogs: [] })
}));
