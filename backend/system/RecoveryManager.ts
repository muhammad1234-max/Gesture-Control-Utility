import { Logger } from './Logger';
import { NativeBridge } from '../executor/native/NativeBridge';
import { RollbackManager } from '../release/RollbackManager';
import fs from 'fs';
import path from 'path';

export interface RecoveryReport {
  timestamp: string;
  component: string;
  reason: string;
  recovered: boolean;
}

export enum CorruptionType {
  INSTALLATION = 'INSTALLATION',
  RUNTIME = 'RUNTIME'
}

export class RecoveryManager {
  private static instance: RecoveryManager;
  private reports: RecoveryReport[] = [];
  
  private constructor() {
    this.startWatchdog();
  }

  public static getInstance(): RecoveryManager {
    if (!RecoveryManager.instance) {
      RecoveryManager.instance = new RecoveryManager();
    }
    return RecoveryManager.instance;
  }

  public async handleStartupCorruption(type: CorruptionType, details: string) {
    Logger.error(`STARTUP VERIFICATION FAILED: ${type} CORRUPTION`, { details });
    
    if (type === CorruptionType.INSTALLATION) {
      // Missing Node, Python, or Models. Cannot be fixed by software.
      Logger.error('Installation is corrupted. Please run the installer to repair the application.');
      // In a real desktop app, this might trigger a msgbox before exiting.
      process.exit(1);
    } else if (type === CorruptionType.RUNTIME) {
      // Corrupted Config, Cache, or Profiles. Try to rollback.
      Logger.warn('Runtime data is corrupted. Attempting automatic rollback...');
      const success = await RollbackManager.getInstance().executeRollback();
      if (!success) {
        Logger.error('Rollback failed or no backups available. Resetting config to factory defaults.');
        // Wipe localappdata/config and localappdata/profiles
        const { PathManager } = require('./PathManager');
        const pm = PathManager.getInstance();
        fs.rmSync(pm.configDir, { recursive: true, force: true });
        fs.rmSync(pm.profilesDir, { recursive: true, force: true });
        Logger.info('Factory reset complete. Please restart the application.');
        process.exit(1);
      } else {
        Logger.info('Rollback successful. Please restart the application.');
        process.exit(0);
      }
    }
  }

  private startWatchdog() {
    setInterval(() => {
      this.checkNativeBridge();
    }, 10000);
  }

  private checkNativeBridge() {
    try {
      NativeBridge.getInstance();
    } catch (e: any) {
      this.logRecovery('NativeBridge', e.message, false);
    }
  }

  public handleCrash(component: string, error: Error) {
    Logger.error(`Crash detected in ${component}`, { error: error.message, stack: error.stack });
    const recovered = this.attemptRecovery(component);
    this.logRecovery(component, error.message, recovered);
  }

  private attemptRecovery(component: string): boolean {
    return false; // Delegated to RuntimeManager Health Poller in Phase 8.1
  }

  private logRecovery(component: string, reason: string, recovered: boolean) {
    const report = { timestamp: new Date().toISOString(), component, reason, recovered };
    this.reports.push(report);
    if (this.reports.length > 100) this.reports.shift();
    Logger.warn('Recovery Report Generated', report);
  }
}

