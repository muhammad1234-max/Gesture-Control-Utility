import fs from 'fs';
import path from 'path';
import { Logger } from '../system/Logger';
import { PathManager } from '../system/PathManager';

export class BackupManager {
  private static instance: BackupManager;
  private backupRoot: string;

  private constructor() {
    this.backupRoot = PathManager.getInstance().backupsDir;
  }

  public static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  /**
   * Creates a backup of current configuration, profiles, and calibrations.
   * Returns the path to the backup directory if successful.
   */
  public async createBackup(reason: string = 'pre_update'): Promise<string | null> {
    const timestamp = Date.now().toString();
    const backupDir = path.join(this.backupRoot, `${reason}_${timestamp}`);
    
    try {
      fs.mkdirSync(backupDir, { recursive: true });

      const pm = PathManager.getInstance();
      const filesToBackup = [
        pm.getConfigPath(),
        pm.getCalibrationPath(),
        pm.profilesDir
      ];

      for (const itemPath of filesToBackup) {
        if (!fs.existsSync(itemPath)) continue;
        
        const stat = fs.statSync(itemPath);
        const destPath = path.join(backupDir, path.basename(itemPath));

        if (stat.isDirectory()) {
          this.copyDirectory(itemPath, destPath);
        } else {
          fs.copyFileSync(itemPath, destPath);
        }
      }

      Logger.info(`Backup created successfully at ${backupDir} (Reason: ${reason})`);
      this.cleanupOldBackups();
      
      return backupDir;
    } catch (err: any) {
      Logger.error(`Failed to create backup`, { error: err.message });
      return null;
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

  private cleanupOldBackups(maxBackups: number = 5) {
    try {
      const backups = fs.readdirSync(this.backupRoot)
        .map(name => ({ name, time: fs.statSync(path.join(this.backupRoot, name)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups);
        for (const backup of toDelete) {
          fs.rmSync(path.join(this.backupRoot, backup.name), { recursive: true, force: true });
          Logger.info(`Deleted old backup: ${backup.name}`);
        }
      }
    } catch (err: any) {
      Logger.warn(`Failed to cleanup old backups`, { error: err.message });
    }
  }
}
