import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../system/Logger';
import { ShutdownManager } from '../runtime/ShutdownManager';

const execAsync = promisify(exec);

export class UpdateInstaller {
  /**
   * Executes the NSIS installer silently to apply the update.
   */
  public static async installUpdate(installerPath: string): Promise<boolean> {
    if (!fs.existsSync(installerPath)) {
      Logger.error(`UpdateInstaller failed: File not found at ${installerPath}`);
      return false;
    }

    try {
      Logger.info('Initiating silent installation...');
      
      // We must gracefully shutdown services before the installer overwrites files
      await ShutdownManager.getInstance().executeShutdown();

      // Launch the NSIS installer asynchronously with the /S (silent) flag.
      // We detach it so this Node process can safely terminate.
      const command = `Start-Process -FilePath "${installerPath}" -ArgumentList "/S" -NoNewWindow`;
      
      if (process.platform === 'win32') {
        Logger.info('Handing off to NSIS Installer and terminating Node process.');
        // We use powershell to start the process detached
        exec(`powershell -Command "${command}"`);
        
        // Give the shell command a moment to launch the installer before committing suicide
        setTimeout(() => process.exit(0), 1000);
      } else {
        Logger.warn('Silent installation is only supported on Windows.');
        return false;
      }
      
      return true;
    } catch (err: any) {
      Logger.error('Failed to execute silent installation', { error: err.message });
      return false;
    }
  }
}
