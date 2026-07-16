import path from 'path';
import os from 'os';
import fs from 'fs';

export class PathManager {
  private static instance: PathManager;

  public readonly appDataRoot: string;
  public readonly configDir: string;
  public readonly profilesDir: string;
  public readonly logsDir: string;
  public readonly reportsDir: string;
  public readonly cacheDir: string;
  public readonly updatesDir: string;
  public readonly backupsDir: string;
  public readonly pluginsDir: string;
  public readonly tempDir: string;

  private constructor() {
    // Determine %LOCALAPPDATA%. Fallback to ~ / .local / share if on *nix for testing.
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share');
    this.appDataRoot = path.join(localAppData, 'GestureControl');

    this.configDir = path.join(this.appDataRoot, 'config');
    this.profilesDir = path.join(this.appDataRoot, 'profiles');
    this.logsDir = path.join(this.appDataRoot, 'logs');
    this.reportsDir = path.join(this.appDataRoot, 'reports');
    this.cacheDir = path.join(this.appDataRoot, 'cache');
    this.updatesDir = path.join(this.appDataRoot, 'updates');
    this.backupsDir = path.join(this.appDataRoot, 'backups');
    this.pluginsDir = path.join(this.appDataRoot, 'plugins');
    this.tempDir = path.join(this.appDataRoot, 'temp');

    this.ensureDirectories();
  }

  public static getInstance(): PathManager {
    if (!PathManager.instance) {
      PathManager.instance = new PathManager();
    }
    return PathManager.instance;
  }

  private ensureDirectories() {
    const dirs = [
      this.appDataRoot,
      this.configDir,
      this.profilesDir,
      this.logsDir,
      this.reportsDir,
      this.cacheDir,
      this.updatesDir,
      this.backupsDir,
      this.pluginsDir,
      this.tempDir
    ];

    dirs.forEach(d => {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
      }
    });
  }

  // Common file paths
  public getConfigPath(): string {
    return path.join(this.configDir, 'config.json');
  }

  public getCalibrationPath(): string {
    return path.join(this.configDir, 'calibrations.json');
  }
}
