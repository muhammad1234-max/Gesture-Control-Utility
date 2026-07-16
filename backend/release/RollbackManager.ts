import fs from 'fs';
import path from 'path';
import { Logger } from '../system/Logger';
import { RestoreManager } from '../backup/RestoreManager';

export class RollbackManager {
  private static instance: RollbackManager;
  private backupRoot: string;

  private constructor() {
    this.backupRoot = path.join(process.cwd(), 'backups');
  }

  public static getInstance(): RollbackManager {
    if (!RollbackManager.instance) {
      RollbackManager.instance = new RollbackManager();
    }
    return RollbackManager.instance;
  }

  /**
   * Automatically attempts to find the most recent pre-update backup and restore it.
   */
  public async executeRollback(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.backupRoot)) {
        Logger.error('Rollback failed: No backups directory exists.');
        return false;
      }

      const backups = fs.readdirSync(this.backupRoot)
        .filter(name => name.startsWith('pre_update_'))
        .map(name => ({ name, time: fs.statSync(path.join(this.backupRoot, name)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (backups.length === 0) {
        Logger.error('Rollback failed: No pre-update backups found.');
        return false;
      }

      const latestBackup = backups[0].name;
      Logger.warn(`Initiating automatic rollback using backup: ${latestBackup}`);

      const success = await RestoreManager.getInstance().restoreFromBackup(latestBackup);
      
      if (success) {
        Logger.info('Rollback completed successfully. System must be restarted to apply restored binaries/config.');
        // If this was an installer update that corrupted binaries,
        // true rollback would involve re-running the old installer, but for user-data we just restore config.
        // In a full architecture, this would also write a flag file for the Installer to revert binaries.
      }
      return success;

    } catch (err: any) {
      Logger.error('Fatal error during rollback execution', { error: err.message });
      return false;
    }
  }
}
