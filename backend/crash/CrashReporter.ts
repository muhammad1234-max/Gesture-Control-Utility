import fs from 'fs';
import path from 'path';
import { Logger } from '../system/Logger';
import { RuntimeManager } from '../runtime/RuntimeManager';
import { DiagnosticBundle } from './DiagnosticBundle';

export class CrashReporter {
  private static instance: CrashReporter;
  private crashDir: string;

  private constructor() {
    this.crashDir = path.join(process.cwd(), 'crashes');
    if (!fs.existsSync(this.crashDir)) {
      fs.mkdirSync(this.crashDir, { recursive: true });
    }
  }

  public static getInstance(): CrashReporter {
    if (!CrashReporter.instance) {
      CrashReporter.instance = new CrashReporter();
    }
    return CrashReporter.instance;
  }

  public startListening() {
    process.on('uncaughtException', async (error: Error) => {
      await this.handleFatalError('uncaughtException', error);
    });

    process.on('unhandledRejection', async (reason: any) => {
      await this.handleFatalError('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
    });

    // Hook into RuntimeManager for critical service failures
    RuntimeManager.getInstance().onCriticalFailure.push(async (serviceName, errorStr) => {
      await this.handleFatalError(`serviceFailure:${serviceName}`, new Error(errorStr));
    });

    Logger.info('CrashReporter initialized and listening for fatal errors.');
  }

  private async handleFatalError(type: string, error: Error) {
    const timestamp = Date.now();
    Logger.error(`FATAL CRASH DETECTED (${type})`, { 
      message: error.message, 
      stack: error.stack 
    });

    // 1. Generate Runtime Snapshot
    let snapshot = {};
    try {
      const { ServiceManager } = require('../system/ServiceManager');
      const { PluginManager } = require('../plugins/PluginManager');
      const { ExecutionQueue } = require('../executor/ExecutionQueue');
      
      snapshot = {
        services: ServiceManager.getInstance().getAllServices().map((s: any) => ({
          name: s.name,
          state: s.state,
          health: s.health,
          uptime: s.metrics?.uptimeMs
        })),
        executionQueueDepth: ExecutionQueue.getInstance().length,
        loadedPlugins: Array.from(PluginManager.getInstance()['activePlugins'].keys()),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
    } catch (snapErr) {
      Logger.error('Failed to capture runtime snapshot');
    }

    // 2. Write immediate crash dump file
    const dumpData = {
      type,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      snapshot
    };
    
    const dumpPath = path.join(this.crashDir, `crash_${timestamp}.json`);
    fs.writeFileSync(dumpPath, JSON.stringify(dumpData, null, 2));

    // 3. Generate full diagnostic bundle
    try {
      await DiagnosticBundle.generate(timestamp.toString());
    } catch (bundleErr: any) {
      Logger.error('Failed to generate diagnostic bundle during crash', { error: bundleErr.message });
    }

    // Do NOT exit here if it's a service failure, RuntimeManager handles recovery.
    // Only exit on true uncaught exceptions that bypass standard recovery.
    if (type === 'uncaughtException' || type === 'unhandledRejection') {
      Logger.error('Forcing process exit due to unrecoverable exception.');
      process.exit(1);
    }
  }
}
