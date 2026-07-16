export enum GestureType {
  NEUTRAL = 'NEUTRAL',
  OPEN_HAND = 'OPEN_HAND',
  CLOSED_FIST = 'CLOSED_FIST',
  INDEX_PINCH = 'INDEX_PINCH',
  MIDDLE_PINCH = 'MIDDLE_PINCH',
  RING_PINCH = 'RING_PINCH',
  PINKY_PINCH = 'PINKY_PINCH',
  THUMB_UP = 'THUMB_UP',
  THUMB_DOWN = 'THUMB_DOWN',
  VICTORY = 'VICTORY',
  POINTING = 'POINTING',
  SCROLL_POSE = 'SCROLL_POSE'
}

export enum FingerType {
  THUMB = 0,
  INDEX = 1,
  MIDDLE = 2,
  RING = 3,
  PINKY = 4
}

export enum FingerExtensionState {
  EXTENDED = 'EXTENDED',
  BENT = 'BENT',
  CURLED = 'CURLED',
  UNKNOWN = 'UNKNOWN'
}

export interface FingerState {
  finger: FingerType;
  extension: FingerExtensionState;
  curl: number;      // 0.0 to 1.0
  spread: number;    // angle relative to adjacent finger
  velocity: number;  // normalized speed
}

export interface PinchStrength {
  finger: FingerType; // Index, Middle, Ring, Pinky
  distance: number;
  strength: number;
  velocity: number; // positive = opening, negative = closing
  closingSpeed: number;
  confidence: number;
  isPinching: boolean;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface GestureFrame {
  frameId: number;
  captureTimestamp: number;
  trackingTimestamp: number;
  recognitionTimestamp: number;
  pipelineLatency: number;
  trackingConfidence: number;
  
  dominantHand: 'left' | 'right' | 'none';
  
  activeGestures: GestureType[];
  candidateGestures: GestureType[];
  gestureConfidences: Record<GestureType, number>;
  
  fingerStates: FingerState[];
  pinchStrengths: PinchStrength[];
  
  // Future proofing for cursor control / state machine
  handVelocity: Vector3D;
  handDirection: Vector3D;
  handRotation: Vector3D;
  handScale: number;
}

export interface GestureDiagnosticsData {
  recognitionFps: number;
  recognitionLatencyMs: number;
  framesReceived: number;
  framesProcessed: number;
  framesDropped: number;
  averageConfidence: number;
  gestureStability: number;
  falseRecognitions: number;
  transitionCount: number;
  queueDepth: number;
}
