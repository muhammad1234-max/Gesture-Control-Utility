export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence: number;
}

export enum Handedness {
  LEFT = 0,
  RIGHT = 1
}

export interface HandDetection {
  handedness: Handedness;
  score: number;
  landmarks: NormalizedLandmark[]; // Always 21
}

export interface TrackingFrame {
  timestamp: number;
  inferenceTimeMs: number;
  hands: HandDetection[];
}

export enum WorkerState {
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  ERROR = 'ERROR',
  RESTARTING = 'RESTARTING'
}

export interface TrackingDiagnostics {
  state: WorkerState;
  cameraFps: number;
  trackingFps: number;
  latencyMs: number;
  droppedFrames: number;
  restarts: number;
  queueDepth: number;
  inferenceTimeMs: number;
  handCount: number;
}
