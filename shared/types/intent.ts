import { GestureFrame, GestureType, Vector3D } from './gesture';

export enum IntentState {
  IDLE = 'IDLE',
  TRACKING = 'TRACKING',
  CLICK_CANDIDATE = 'CLICK_CANDIDATE',
  CLICK_CONFIRMED = 'CLICK_CONFIRMED',
  DRAG_PENDING = 'DRAG_PENDING',
  DRAGGING = 'DRAGGING',
  DOUBLE_CLICK_PENDING = 'DOUBLE_CLICK_PENDING',
  SCROLL_PENDING = 'SCROLL_PENDING',
  SCROLLING = 'SCROLLING',
  HOLD_PENDING = 'HOLD_PENDING',
  HOLDING = 'HOLDING',
  CANCELLED = 'CANCELLED'
}

export enum IntentType {
  NONE = 'NONE',
  SINGLE_CLICK = 'SINGLE_CLICK',
  DOUBLE_CLICK = 'DOUBLE_CLICK',
  DRAG_START = 'DRAG_START',
  DRAG_UPDATE = 'DRAG_UPDATE',
  DRAG_END = 'DRAG_END',
  SCROLL = 'SCROLL',
  HOLD = 'HOLD',
  POINTING = 'POINTING'
}

export interface IntentConfig {
  doubleClickWindowMs: number;
  holdActivationTimeMs: number;
  dragActivationDistance: number;
  dragActivationTimeMs: number;
  scrollDeadzone: number;
  scrollSensitivity: number;
  scrollAcceleration: number;
  clickStabilityFrames: number;
  pinchActivationThreshold: number;
  pinchReleaseThreshold: number;
}

export const DEFAULT_INTENT_CONFIG: IntentConfig = {
  doubleClickWindowMs: 500,
  holdActivationTimeMs: 200,
  dragActivationDistance: 0.05,
  dragActivationTimeMs: 300,
  scrollDeadzone: 0.02,
  scrollSensitivity: 1.0,
  scrollAcceleration: 1.2,
  clickStabilityFrames: 3,
  pinchActivationThreshold: 0.04,
  pinchReleaseThreshold: 0.07
};

export interface IntentFrame {
  frameId: number;
  timestamp: number;
  trackingId: number; // Links back to GestureFrame frameId
  
  currentState: IntentState;
  previousState: IntentState;
  transitionReason: string;
  
  primaryIntent: IntentType;
  secondaryIntent: IntentType;
  confidence: number;
  
  elapsedTimeInStateMs: number;
  movementSinceStateStart: number; // Normalized distance
  averageVelocity: number;
  
  // No full object reference to prevent memory leaks/GC issues, just a snapshot if needed.
  // The user requested: "gestureHistory". To remain zero-allocation, we only keep the current active gesture names.
  activeGestures: GestureType[];
  
  pipelineLatencyMs: number;
}

export interface IntentDiagnosticsData {
  currentState: IntentState;
  previousState: IntentState;
  transitionReason: string;
  stateDurationMs: number;
  
  pipelineLatencyMs: number;
  
  primaryIntent: IntentType;
  candidateIntents: IntentType[];
  confidence: number;
  
  activeThresholds: Record<string, number>;
  movementDistance: number;
  averageVelocity: number;
  
  intentFps: number;
  engineFps: number; // Tracking/Gesture FPS reference
  
  transitionCount: number;
  confirmedClicks: number;
  cancelledClicks: number;
  dragConfirmations: number;
  scrollActivations: number;
  holdActivations: number;
  doubleClicks: number;
}
