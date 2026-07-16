import { exec } from 'child_process';
import { Logger } from './Logger';
import path from 'path';

export class AutoStartManager {
  private static readonly APP_NAME = 'GestureControlUtility';
  private static readonly REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';

  public static async enable(): Promise<boolean> {
    if (process.platform !== 'win32') {
      Logger.warn('AutoStart is only supported on Windows currently.');
      return false;
    }

    // In a packaged app, process.execPath points to the .exe. 
    // In dev, it points to node.exe. We build a command to launch this script silently.
    const execPath = process.execPath;
    const scriptPath = path.resolve(process.argv[1] || process.cwd());
    const command = `"${execPath}" "${scriptPath}"`;

    return new Promise((resolve) => {
      const regCmd = `reg add "${this.REG_KEY}" /v "${this.APP_NAME}" /t REG_SZ /d "${command.replace(/"/g, '\\"')}" /f`;
      exec(regCmd, (error) => {
        if (error) {
          Logger.error('Failed to enable AutoStart', { error: error.message });
          resolve(false);
        } else {
          Logger.info('AutoStart enabled successfully');
          resolve(true);
        }
      });
    });
  }

  public static async disable(): Promise<boolean> {
    if (process.platform !== 'win32') return false;

    return new Promise((resolve) => {
      const regCmd = `reg delete "${this.REG_KEY}" /v "${this.APP_NAME}" /f`;
      exec(regCmd, (error) => {
        if (error) {
          // It might fail if the key doesn't exist, which is fine
          Logger.info('AutoStart already disabled or failed to disable', { error: error.message });
          resolve(false);
        } else {
          Logger.info('AutoStart disabled successfully');
          resolve(true);
        }
      });
    });
  }

  public static async getStatus(): Promise<boolean> {
    if (process.platform !== 'win32') return false;

    return new Promise((resolve) => {
      const regCmd = `reg query "${this.REG_KEY}" /v "${this.APP_NAME}"`;
      exec(regCmd, (error) => {
        resolve(!error);
      });
    });
  }
}
