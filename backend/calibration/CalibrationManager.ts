import { CalibrationStorage, CalibrationProfile } from './CalibrationStorage';
import { CalibrationMath, Point3D } from './CalibrationMath';
import { Logger } from '../system/Logger';

export class CalibrationManager {
  private static instance: CalibrationManager;
  private activeProfileId: string = 'default';
  private samplingMode: boolean = false;
  private currentSamples: Point3D[] = [];

  private constructor() {}

  public static getInstance(): CalibrationManager {
    if (!CalibrationManager.instance) {
      CalibrationManager.instance = new CalibrationManager();
    }
    return CalibrationManager.instance;
  }

  public setActiveProfile(id: string) {
    this.activeProfileId = id;
    Logger.info(`Switched calibration profile to ${id}`);
  }

  public getActiveProfile(): CalibrationProfile {
    return CalibrationStorage.getInstance().getProfile(this.activeProfileId);
  }

  // --- Guided Wizard Math Handlers ---

  public startSampling() {
    this.samplingMode = true;
    this.currentSamples = [];
    Logger.debug('Calibration sampling started.');
  }

  public addSample(point: Point3D) {
    if (this.samplingMode) {
      this.currentSamples.push(point);
    }
  }

  public finishWorkspaceSampling(): { min: Point3D; max: Point3D } {
    this.samplingMode = false;
    const workspace = CalibrationMath.calculateWorkspace(this.currentSamples);
    
    // Auto-save to active profile
    const profile = this.getActiveProfile();
    profile.workspace = workspace;
    CalibrationStorage.getInstance().setProfile(profile);
    
    Logger.info('Calibration workspace computed and saved.', workspace);
    return workspace;
  }

  /**
   * Called by the TrackingWorker to normalize coordinates in real-time
   * before sending to the GestureEngine.
   */
  public applyCalibration(rawPoint: Point3D): Point3D {
    const profile = this.getActiveProfile();
    return CalibrationMath.normalizeToWorkspace(rawPoint, profile.workspace);
  }
}
