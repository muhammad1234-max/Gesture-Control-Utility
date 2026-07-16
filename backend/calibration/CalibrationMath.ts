export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export class CalibrationMath {
  /**
   * Calculates a bounding box (workspace) from a series of sampled points.
   */
  public static calculateWorkspace(samples: Point3D[]): { min: Point3D; max: Point3D } {
    if (samples.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
    }

    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };

    for (const p of samples) {
      if (p.x < min.x) min.x = p.x;
      if (p.y < min.y) min.y = p.y;
      if (p.z < min.z) min.z = p.z;
      
      if (p.x > max.x) max.x = p.x;
      if (p.y > max.y) max.y = p.y;
      if (p.z > max.z) max.z = p.z;
    }

    // Add 10% padding to avoid hitting the very edge
    const padX = (max.x - min.x) * 0.1;
    const padY = (max.y - min.y) * 0.1;
    const padZ = (max.z - min.z) * 0.1;

    return {
      min: { x: min.x - padX, y: min.y - padY, z: min.z - padZ },
      max: { x: max.x + padX, y: max.y + padY, z: max.z + padZ }
    };
  }

  /**
   * Normalizes a raw point into the calibrated workspace [0, 1]
   */
  public static normalizeToWorkspace(raw: Point3D, workspace: { min: Point3D; max: Point3D }): Point3D {
    const rangeX = workspace.max.x - workspace.min.x;
    const rangeY = workspace.max.y - workspace.min.y;
    const rangeZ = workspace.max.z - workspace.min.z;

    const nx = Math.max(0, Math.min(1, (raw.x - workspace.min.x) / (rangeX || 1)));
    const ny = Math.max(0, Math.min(1, (raw.y - workspace.min.y) / (rangeY || 1)));
    const nz = Math.max(0, Math.min(1, (raw.z - workspace.min.z) / (rangeZ || 1)));

    return { x: nx, y: ny, z: nz };
  }

  /**
   * Applies an exponential smoothing curve for cursor movement
   */
  public static applySmoothingCurve(value: number, smoothingFactor: number): number {
    // smoothingFactor: 0 (no smoothing) to 1 (max smoothing)
    // A simple exponential moving average would be applied frame-over-frame,
    // but this curve modifies the delta intensity.
    return Math.pow(value, 1 + smoothingFactor);
  }
}
