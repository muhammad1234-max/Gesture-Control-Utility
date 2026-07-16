import { IService, ServiceState, HealthLevel, ServiceMetrics, RecoveryPolicy } from '../runtime/types';
import { ActionMappingWorker } from '../action/ActionMappingWorker';

export class ActionService implements IService {
  public name = 'ActionService';
  public dependencies = ['IntentService']; 
  
  public state = ServiceState.UNINITIALIZED;
  public health = HealthLevel.OFFLINE;
  public metrics: ServiceMetrics = { uptimeMs: 0, restartCount: 0, averageHealthScore: 100, cpuUsagePct: 0, memoryUsageMb: 0, latencyMs: 0 };
  
  public recoveryPolicy: RecoveryPolicy = { restartLimit: 5, restartIntervalMs: 1000, backoffMultiplier: 2.0, cooldownPeriodMs: 30000 };
  private startTime = 0;

  public async initialize(): Promise<void> { this.state = ServiceState.STOPPED; }
  public async start(): Promise<void> { ActionMappingWorker.getInstance().start(); this.startTime = Date.now(); this.health = HealthLevel.HEALTHY; }
  public async stop(): Promise<void> { ActionMappingWorker.getInstance().stop(); this.health = HealthLevel.OFFLINE; this.metrics.uptimeMs += (Date.now() - this.startTime); }
  public async restart(): Promise<void> { await this.stop(); await this.start(); }
  public async dispose(): Promise<void> { await this.stop(); }
  public async healthCheck(): Promise<HealthLevel> { return this.state === ServiceState.RUNNING ? HealthLevel.HEALTHY : HealthLevel.OFFLINE; }
  public async readyCheck(): Promise<boolean> { return this.health === HealthLevel.HEALTHY; }
}
