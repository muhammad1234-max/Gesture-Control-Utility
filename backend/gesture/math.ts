import { Vector3D } from '@shared/types/gesture';

/**
 * Zero-allocation math utilities.
 * All functions write results into a provided `out` vector.
 */
export class MathUtils {
  // Static working vectors to avoid inline allocations
  private static v1: Vector3D = { x: 0, y: 0, z: 0 };
  private static v2: Vector3D = { x: 0, y: 0, z: 0 };

  public static sub(a: Vector3D, b: Vector3D, out: Vector3D) {
    out.x = a.x - b.x;
    out.y = a.y - b.y;
    out.z = a.z - b.z;
  }

  public static magnitude(v: Vector3D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  public static distance(a: Vector3D, b: Vector3D): number {
    this.sub(a, b, this.v1);
    return this.magnitude(this.v1);
  }

  public static dot(a: Vector3D, b: Vector3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  public static normalize(v: Vector3D, out: Vector3D) {
    const mag = this.magnitude(v);
    if (mag === 0) {
      out.x = 0; out.y = 0; out.z = 0;
      return;
    }
    out.x = v.x / mag;
    out.y = v.y / mag;
    out.z = v.z / mag;
  }

  /**
   * Calculates the angle in radians between three points (A, B, C) where B is the vertex.
   */
  public static angleBetweenPoints(a: Vector3D, b: Vector3D, c: Vector3D): number {
    this.sub(a, b, this.v1);
    this.sub(c, b, this.v2);
    
    this.normalize(this.v1, this.v1);
    this.normalize(this.v2, this.v2);
    
    let dotProd = this.dot(this.v1, this.v2);
    // Clamp to prevent NaN due to floating point inaccuracies
    if (dotProd > 1.0) dotProd = 1.0;
    if (dotProd < -1.0) dotProd = -1.0;
    
    return Math.acos(dotProd);
  }
}
