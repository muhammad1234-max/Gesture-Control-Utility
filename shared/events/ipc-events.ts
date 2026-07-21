export enum IPCEventType {
  SIMULATE_GESTURE = 'simulate_gesture',
  ENGINE_STATUS = 'engine_status',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  
  // Camera specific events
  CAMERA_TELEMETRY = 'camera_telemetry',
  
  // Tracking specific
  TRACKING_LANDMARKS = 'tracking_landmarks',

  // Config
  CONFIG_UPDATE = 'config_update',
  CALIBRATION_MODE = 'CALIBRATION_MODE',

  // Subsystem Control Commands
  START_ENGINE = 'START_ENGINE',
  STOP_ENGINE = 'STOP_ENGINE',
  RESTART_ENGINE = 'RESTART_ENGINE',
  
  OPEN_CAMERA = 'OPEN_CAMERA',
  CLOSE_CAMERA = 'CLOSE_CAMERA',
  RESTART_CAMERA = 'RESTART_CAMERA',
  
  START_TRACKING = 'START_TRACKING',
  STOP_TRACKING = 'STOP_TRACKING',
  
  RELOAD_CONFIG = 'RELOAD_CONFIG',
  QUIT_APPLICATION = 'QUIT_APPLICATION',
  GET_STATUS = 'GET_STATUS',

  // Benchmark
  START_RECORDING = 'START_RECORDING',
  STOP_RECORDING = 'STOP_RECORDING',
  START_REPLAY = 'START_REPLAY',
  STOP_REPLAY = 'STOP_REPLAY'
}

export interface IPCMessage<T = any> {
  action?: string;
  type?: string;
  message?: string;
  payload?: T;
}
