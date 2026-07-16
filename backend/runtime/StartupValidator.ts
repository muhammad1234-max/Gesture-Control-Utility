import fs from 'fs';
import path from 'path';
import { Logger } from '../system/Logger';
import { PathManager } from '../system/PathManager';
import { RecoveryManager, CorruptionType } from '../system/RecoveryManager';

export class StartupValidator {
  /**
   * Performs critical pre-flight checks before RuntimeManager boots.
   */
  public static async verifySystem(): Promise<boolean> {
    Logger.info('Initiating Startup Verification...');
    const pm = PathManager.getInstance();

    // 1. Verify Installation Dependencies (Immutable binaries & models)
    // We assume server.js runs from Program Files/GestureControl/app/backend/
    const appDir = path.resolve(process.cwd(), '..', '..');
    
    const requiredInstallationFiles = [
      path.join(appDir, 'runtime', 'node', 'node.exe'),
      path.join(appDir, 'runtime', 'python', 'python.exe'),
      path.join(appDir, 'app', 'models', 'hand_landmarker.task')
    ];

    for (const req of requiredInstallationFiles) {
      if (!fs.existsSync(req)) {
        // In local dev, these paths won't exist because we're not inside the installed directory.
        // We'll skip forcing a crash if we detect development mode.
        if (process.env.NODE_ENV === 'production') {
          await RecoveryManager.getInstance().handleStartupCorruption(
            CorruptionType.INSTALLATION, 
            `Missing installation file: ${req}`
          );
          return false;
        } else {
          Logger.warn(`[DEV MODE] Skipping missing installation file check: ${req}`);
        }
      }
    }

    // 2. Verify Runtime Data Integrity (Mutable config & profiles)
    try {
      // Test write permissions
      const testFile = path.join(pm.tempDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.rmSync(testFile);
    } catch (e: any) {
       await RecoveryManager.getInstance().handleStartupCorruption(
         CorruptionType.RUNTIME, 
         `Missing write permissions to %LOCALAPPDATA%: ${e.message}`
       );
       return false;
    }

    // Check config validity if it exists
    if (fs.existsSync(pm.getConfigPath())) {
      try {
        JSON.parse(fs.readFileSync(pm.getConfigPath(), 'utf8'));
      } catch (e: any) {
        await RecoveryManager.getInstance().handleStartupCorruption(
          CorruptionType.RUNTIME, 
          `Corrupted config.json: ${e.message}`
        );
        return false;
      }
    }

    Logger.info('Startup Verification Passed.');
    return true;
  }
}
