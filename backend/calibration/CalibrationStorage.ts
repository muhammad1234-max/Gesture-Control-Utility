import fs from 'fs';
import path from 'path';
import { Logger } from '../system/Logger';
import { Point3D } from './CalibrationMath';

export interface CalibrationProfile {
  id: string;
  name: string;
  workspace: { min: Point3D; max: Point3D };
  cursorSpeedX: number;
  cursorSpeedY: number;
  smoothingFactor: number;
  gestureThresholds: {
    pinchActivation: number;
    pinchRelease: number;
    scrollDeadzone: number;
  };
}

const DEFAULT_PROFILE: CalibrationProfile = {
  id: 'default',
  name: 'Default Calibration',
  workspace: {
    min: { x: 0.2, y: 0.2, z: -0.5 },
    max: { x: 0.8, y: 0.8, z: 0.5 }
  },
  cursorSpeedX: 1.0,
  cursorSpeedY: 1.0,
  smoothingFactor: 0.5,
  gestureThresholds: {
    pinchActivation: 0.05,
    pinchRelease: 0.08,
    scrollDeadzone: 0.02
  }
};

export class CalibrationStorage {
  private static instance: CalibrationStorage;
  private filePath: string;
  private profiles: Map<string, CalibrationProfile> = new Map();

  private constructor() {
    this.filePath = path.join(process.cwd(), 'calibrations.json');
    this.load();
  }

  public static getInstance(): CalibrationStorage {
    if (!CalibrationStorage.instance) {
      CalibrationStorage.instance = new CalibrationStorage();
    }
    return CalibrationStorage.instance;
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (Array.isArray(data)) {
          for (const p of data) {
            this.profiles.set(p.id, p);
          }
        }
      } catch (e: any) {
        Logger.error('Failed to load calibrations.json', { error: e.message });
      }
    }
    
    // Ensure default exists
    if (!this.profiles.has('default')) {
      this.profiles.set('default', DEFAULT_PROFILE);
      this.save();
    }
  }

  public save() {
    try {
      const data = Array.from(this.profiles.values());
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      Logger.debug('Calibration profiles saved');
    } catch (e: any) {
      Logger.error('Failed to save calibrations.json', { error: e.message });
    }
  }

  public getProfile(id: string): CalibrationProfile {
    return this.profiles.get(id) || this.profiles.get('default')!;
  }

  public setProfile(profile: CalibrationProfile) {
    this.profiles.set(profile.id, profile);
    this.save();
  }

  public getAllProfiles(): CalibrationProfile[] {
    return Array.from(this.profiles.values());
  }
}
