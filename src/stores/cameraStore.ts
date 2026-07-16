import { create } from 'zustand';
import { CameraDeviceInfo, CameraTelemetry, TrackingDiagnostics, WorkerState, GestureDiagnosticsData, GestureFrame, IntentDiagnosticsData, IntentFrame, ActionDiagnosticsData, ExecutableAction, ExecutionDiagnosticsData, TestingDiagnosticsData } from '@shared/types';

interface TelemetryPayload {
  camera: CameraTelemetry;
  tracking: TrackingDiagnostics | null;
  gesture: GestureDiagnosticsData | null;
  intent: IntentDiagnosticsData | null;
  action: ActionDiagnosticsData | null;
  execution: ExecutionDiagnosticsData | null;
  testing: TestingDiagnosticsData | null;
}

interface CameraState {
  devices: CameraDeviceInfo[];
  activeDeviceId: string | null;
  telemetry: CameraTelemetry;
  tracking: TrackingDiagnostics | null;
  gestureMetrics: GestureDiagnosticsData | null;
  latestGestureFrame: GestureFrame | null;
  intentMetrics: IntentDiagnosticsData | null;
  latestIntentFrame: IntentFrame | null;
  actionMetrics: ActionDiagnosticsData | null;
  latestAction: ExecutableAction | null;
  executionMetrics: ExecutionDiagnosticsData | null;
  testingMetrics: TestingDiagnosticsData | null;
  previewFrameBase64: string | null;
  
  setDevices: (devices: CameraDeviceInfo[]) => void;
  setActiveDevice: (id: string | null) => void;
  updateTelemetry: (payload: TelemetryPayload) => void;
  setPreviewFrame: (base64: string | null) => void;
  setGestureFrame: (frame: GestureFrame | null) => void;
  setIntentFrame: (frame: IntentFrame | null) => void;
  setActionFrame: (frame: ExecutableAction | null) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  devices: [],
  activeDeviceId: null,
  telemetry: {
    fps: 0,
    droppedFrames: 0,
    active: false,
    resolution: { width: 0, height: 0 }
  },
  tracking: {
    state: WorkerState.STOPPED,
    cameraFps: 0,
    trackingFps: 0,
    latencyMs: 0,
    droppedFrames: 0,
    restarts: 0,
    queueDepth: 0,
    inferenceTimeMs: 0,
    handCount: 0
  },
  gestureMetrics: null,
  latestGestureFrame: null,
  intentMetrics: null,
  latestIntentFrame: null,
  actionMetrics: null,
  latestAction: null,
  executionMetrics: null,
  testingMetrics: null,
  previewFrameBase64: null,

  setDevices: (devices) => set({ devices }),
  setActiveDevice: (activeDeviceId) => set({ activeDeviceId }),
  updateTelemetry: (payload) => set((state) => ({ 
    telemetry: payload.camera ? { ...state.telemetry, ...payload.camera } : state.telemetry,
    tracking: payload.tracking !== undefined ? { ...state.tracking, ...payload.tracking } : state.tracking,
    gestureMetrics: payload.gesture !== undefined ? { ...state.gestureMetrics, ...payload.gesture } : state.gestureMetrics,
    intentMetrics: payload.intent !== undefined ? { ...state.intentMetrics, ...payload.intent } : state.intentMetrics,
    actionMetrics: payload.action !== undefined ? { ...state.actionMetrics, ...payload.action } : state.actionMetrics,
    executionMetrics: payload.execution !== undefined ? { ...state.executionMetrics, ...payload.execution } : state.executionMetrics,
    testingMetrics: payload.testing !== undefined ? { ...state.testingMetrics, ...payload.testing } : state.testingMetrics
  })),
  setPreviewFrame: (previewFrameBase64) => set({ previewFrameBase64 }),
  setGestureFrame: (frame) => set({ latestGestureFrame: frame }),
  setIntentFrame: (frame) => set({ latestIntentFrame: frame }),
  setActionFrame: (frame) => set({ latestAction: frame })
}));
