import fs from 'fs';
import path from 'path';
import { Logger } from '../system/Logger';
import { PathManager } from '../system/PathManager';

export class RestoreManager {
  private static instance: RestoreManager;

  private constructor() {}

  public static getInstance(): RestoreManager {
    if (!RestoreManager.instance) {
      RestoreManager.instance = new RestoreManager();
    }
    return RestoreManager.instance;
  }

  /**
   * Restores configuration, profiles, and calibrations from a specific backup directory.
   */
  public async restoreFromBackup(backupDirName: string): Promise<boolean> {
    const pm = PathManager.getInstance();
    const backupDir = path.join(pm.backupsDir, backupDirName);
    
    if (!fs.existsSync(backupDir)) {
      Logger.error(`Cannot restore: Backup directory ${backupDirName} does not exist.`);
      return false;
    }

    try {
      Logger.warn(`Initiating system restore from backup: ${backupDirName}`);

      const itemsToRestore = [
        { name: 'config.json', target: pm.getConfigPath() },
        { name: 'calibrations.json', target: pm.getCalibrationPath() },
        { name: 'profiles', target: pm.profilesDir }
      ];

      for (const item of itemsToRestore) {
        const sourcePath = path.join(backupDir, item.name);
        if (!fs.existsSync(sourcePath)) continue;

        const stat = fs.statSync(sourcePath);

        // Remove current version first to ensure clean restore
        if (fs.existsSync(item.target)) {
          fs.rmSync(item.target, { recursive: true, force: true });
        }

        if (stat.isDirectory()) {
          this.copyDirectory(sourcePath, item.target);
        } else {
          fs.copyFileSync(sourcePath, item.target);
        }
        Logger.info(`Restored ${item.name}`);
      }

      Logger.info(`System restore completed successfully from ${backupDirName}`);
      return true;
    } catch (err: any) {
      Logger.error(`Failed to restore system from backup`, { error: err.message });
      return false;
    }
  }

  private copyDirectory(src: string, dest: string) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      entry.isDirectory() ? this.copyDirectory(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
    }
  }
}
