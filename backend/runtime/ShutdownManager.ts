import { ServiceManager } from '../system/ServiceManager';
import { Logger } from '../system/Logger';

export class ShutdownManager {
  private static instance: ShutdownManager;

  private constructor() {}

  public static getInstance(): ShutdownManager {
    if (!ShutdownManager.instance) {
      ShutdownManager.instance = new ShutdownManager();
    }
    return ShutdownManager.instance;
  }

  public async executeShutdown() {
    Logger.info('Initiating graceful shutdown sequence...');

    const services = ServiceManager.getInstance().getAllServices();
    // 1. Flush Execution Queues
    try {
      const { ExecutionQueue } = require('../executor/ExecutionQueue');
      const { MovementQueue } = require('../executor/MovementQueue');
      
      Logger.info('Flushing execution queues before shutdown...');
      while(ExecutionQueue.getInstance().length > 0) {
         // Pause briefly to let worker drain
         await new Promise(r => setTimeout(r, 50));
      }
      MovementQueue.getInstance().clear(); // Drop stale movements immediately
    } catch (e: any) {
      Logger.warn('Failed to cleanly flush execution queues', { error: e.message });
    }

    // 2. Stop services in reverse order of dependencies
    for (let i = services.length - 1; i >= 0; i--) {
      const service = services[i];
      try {
        Logger.info(`Stopping service: ${service.name}...`);
        await ServiceManager.getInstance().stopService(service.name);
      } catch (err: any) {
        Logger.error(`Failed to stop service: ${service.name}`, { error: err.message });
      }
    }

    for (let i = services.length - 1; i >= 0; i--) {
      const service = services[i];
      try {
        Logger.info(`Disposing service: ${service.name}...`);
        await service.dispose();
      } catch (err: any) {
        Logger.error(`Failed to dispose service: ${service.name}`, { error: err.message });
      }
    }

    Logger.info('Graceful shutdown completed.');
  }
}
