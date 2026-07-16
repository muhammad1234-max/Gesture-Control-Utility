export type AdaptiveMode = 'manual' | 'assisted' | 'automatic' | 'disabled';

export interface AdaptiveOverrides {
  [key: string]: any; // Flat map of overridden values (e.g. 'tracking.minDetectionConfidence': 0.6)
}

export interface AppConfig {
  userMode: 'beginner' | 'advanced' | 'developer';
  theme: 'light' | 'dark' | 'system';
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
  };
  startup: {
    autoStart: boolean;
    startMinimized: boolean;
  };
  camera: {
    deviceId: string | null;
    resolution: '720p' | '1080p';
    fps: number;
  };
  tracking: {
    modelComplexity: 0 | 1 | 2;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  };
  adaptive: {
    mode: AdaptiveMode;
    overrides: AdaptiveOverrides;
  };
  activeProfileId: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  userMode: 'beginner',
  theme: 'system',
  accessibility: {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
  },
  startup: {
    autoStart: false,
    startMinimized: false,
  },
  camera: {
    deviceId: null,
    resolution: '720p',
    fps: 60,
  },
  tracking: {
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },
  adaptive: {
    mode: 'assisted',
    overrides: {}
  },
  activeProfileId: 'default'
};
