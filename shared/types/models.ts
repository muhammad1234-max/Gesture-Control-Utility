/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GestureMappingActionType = 'keystroke' | 'launch-app' | 'volume-control' | 'media-control' | 'system';

export interface GestureMapping {
  id: string;
  name: string;
  trigger: string; // 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'circle' | 'tap' | 'double-tap' | 'pinch'
  actionType: GestureMappingActionType;
  targetAction: string; // e.g. "Ctrl+Shift+Z", "C:\Windows\System32\calc.exe", "volume-up", "media-play"
  isActive: boolean;
  confidenceThreshold: number; // 0 to 100
  isSystemDefault?: boolean;
}

export type LogType = 'info' | 'input' | 'success' | 'warning' | 'error';

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  message: string;
  type: LogType;
}

export interface CalibrationSettings {
  deadZone: number; // in pixels (e.g., 20)
  smoothing: number; // 1 to 10 (filter strength)
  minConfidence: number; // 0 to 100
  accelerationCurve: [number, number, number, number]; // Cubic Bezier points [x1, y1, x2, y2]
  webcamResolution: '640x480' | '1280x720' | '1920x1080';
  trackingFPS: number; // 30 | 60
}

export interface AppProfile {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  gestures: GestureMapping[];
  calibration: CalibrationSettings;
}
