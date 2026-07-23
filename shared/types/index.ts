export * from './models';
export * from './camera';
export * from './tracking';
export * from './gesture';
export * from './intent';
export * from './action';
export * from './execution';
export * from './testing';
export * from './config';

/** CalibrationProfile — persisted per-user calibration snapshot */
export interface CalibrationProfile {
  id: string;
  name: string;
  createdAt: string;
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
  engineParams?: Record<string, number>;
}

