import { ServiceManager } from '../system/ServiceManager';
import { Logger } from '../system/Logger';
import { HealthLevel, ServiceState } from './types';

export class HealthManager {
  private static instance: HealthManager;
  private intervalId: NodeJS.Timeout | null = null;
  private coolingDown: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): HealthManager {
    if (!HealthManager.instance) {
      HealthManager.instance = new HealthManager();
    }
    return HealthManager.instance;
  }

  public startMonitoring() {
    if (this.intervalId) return;
    Logger.info('Health monitoring started.');
    
    this.intervalId = setInterval(async () => {
      const services = ServiceManager.getInstance().getAllServices();
      for (const service of services) {
        if (service.state !== ServiceState.RUNNING) continue;

        try {
          const health = await service.healthCheck();
          service.health = health;

          if (health === HealthLevel.CRITICAL || health === HealthLevel.OFFLINE) {
            this.handleFailure(service.name);
          }
        } catch (err: any) {
          Logger.error(`Service ${service.name} threw error during healthCheck.`, { error: err.message });
          service.health = HealthLevel.CRITICAL;
          this.handleFailure(service.name);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  public stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      Logger.info('Health monitoring stopped.');
    }
  }

  private async handleFailure(serviceName: string) {
    if (this.coolingDown.has(serviceName)) return; // Don't spam restarts

    const service = ServiceManager.getInstance().getService(serviceName);
    if (!service) return;

    Logger.warn(`Service ${serviceName} is ${service.health}. Attempting recovery according to policy.`);
    
    const policy = service.recoveryPolicy;

    // Check if we exceeded restart limits
    if (service.metrics.restartCount >= policy.restartLimit) {
      Logger.error(`Service ${serviceName} has exceeded its restart limit (${policy.restartLimit}). Halting recovery attempts.`);
      service.state = ServiceState.FAILED;
      return;
    }

    try {
      this.coolingDown.add(serviceName);
      
      // Basic backoff
      const backoffMs = policy.restartIntervalMs * Math.pow(policy.backoffMultiplier, service.metrics.restartCount);
      Logger.info(`Waiting ${backoffMs}ms before restarting ${serviceName}...`);
      
      await new Promise(res => setTimeout(res, backoffMs));
      
      await ServiceManager.getInstance().restartService(serviceName);
      
      // Cooldown before allowing another restart check
      setTimeout(() => {
        this.coolingDown.delete(serviceName);
      }, policy.cooldownPeriodMs);
      
    } catch (err: any) {
      Logger.error(`Failed to recover service ${serviceName}`, { error: err.message });
      this.coolingDown.delete(serviceName);
    }
  }
}
