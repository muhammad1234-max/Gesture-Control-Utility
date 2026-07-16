export enum IPCEventType {
  SIMULATE_GESTURE = 'simulate_gesture',
  ENGINE_STATUS = 'engine_status',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  
  // Camera specific events
  CAMERA_LIST_REQUEST = 'camera_list_request',
  CAMERA_LIST_RESPONSE = 'camera_list_response',
  CAMERA_START = 'camera_start',
  CAMERA_STOP = 'camera_stop',
  CAMERA_TELEMETRY = 'camera_telemetry',
  CAMERA_PREVIEW_FRAME = 'camera_preview_frame',
  
  // Tracking specific
  TRACKING_LANDMARKS = 'tracking_landmarks'
}

export interface IPCMessage<T = any> {
  action?: string;
  type?: string;
  message?: string;
  payload?: T;
}
