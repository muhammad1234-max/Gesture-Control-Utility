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
  onboardingCompleted: boolean;
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
    engineParams?: {
      deadzone_px: number;
      mincutoff: number;    // canonical name used in Python backend
      min_cutoff: number;   // alias used by DeveloperPanel slider
      beta: number;
      dcutoff: number;
      pred_threshold: number;
      sensitivity: number;
      vel_cap: number;
    };
  };
  calibration: {
    workingArea: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    };
    pinchThresholds: {
      left: number;
      right: number;
      scroll: number;
    };
  };
  gestures?: Record<string, any>;  // optional gesture config map
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
  onboardingCompleted: false,
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
    overrides: {},
    engineParams: {
      deadzone_px: 2.5,
      mincutoff: 0.5,
      min_cutoff: 0.5,
      beta: 0.1,
      dcutoff: 2.0,
      pred_threshold: 50.0,
      sensitivity: 1.0,
      vel_cap: 3000.0,
    }
  },
  calibration: {
    workingArea: {
      minX: 0.3,
      maxX: 0.7,
      minY: 0.3,
      maxY: 0.7,
    },
    pinchThresholds: {
      left: 0.05,
      right: 0.05,
      scroll: 0.05,
    }
  },
  activeProfileId: 'default'
};
