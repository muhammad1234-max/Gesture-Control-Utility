export class VersionManager {
  /**
   * Compares two semantic versions.
   * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
   */
  public static compareSemver(v1: string, v2: string): number {
    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10));
    const p1 = parse(v1);
    const p2 = parse(v2);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }

  /**
   * Validates if the current version meets the minimum required version.
   */
  public static isCompatible(currentVersion: string, minimumVersion: string): boolean {
    return this.compareSemver(currentVersion, minimumVersion) >= 0;
  }

  /**
   * Prevents installing an older version over a newer one.
   */
  public static isDowngrade(currentVersion: string, newVersion: string): boolean {
    return this.compareSemver(currentVersion, newVersion) > 0;
  }
}
