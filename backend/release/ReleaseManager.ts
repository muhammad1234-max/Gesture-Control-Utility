import fs from 'fs';
import path from 'path';
import { Logger } from '../system/Logger';

export class ReleaseManager {
  private static instance: ReleaseManager;
  private currentVersion: string = '1.0.0';
  private releaseChannel: 'stable' | 'beta' | 'developer' = 'stable';

  private constructor() {
    this.loadVersionInfo();
  }

  public static getInstance(): ReleaseManager {
    if (!ReleaseManager.instance) {
      ReleaseManager.instance = new ReleaseManager();
    }
    return ReleaseManager.instance;
  }

  private loadVersionInfo() {
    try {
      const manifestPath = path.join(process.cwd(), 'release-manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        this.currentVersion = manifest.version || '1.0.0';
        this.releaseChannel = manifest.releaseChannel || 'stable';
      }
    } catch (e: any) {
      Logger.warn('Failed to load release manifest. Defaulting to 1.0.0', { error: e.message });
    }
  }

  public getVersion(): string {
    return this.currentVersion;
  }

  public getReleaseChannel(): string {
    return this.releaseChannel;
  }
}
