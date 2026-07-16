export interface CameraDeviceInfo {
  id: string; // The OS device ID or index
  name: string; // Human readable name
}

export interface CameraTelemetry {
  fps: number;
  droppedFrames: number;
  active: boolean;
  resolution: { width: number; height: number };
}

export interface CameraFramePayload {
  base64Data: string;
  width: number;
  height: number;
  timestamp: number;
}
