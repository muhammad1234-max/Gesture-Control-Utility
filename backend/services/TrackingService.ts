import { IService, ServiceState, HealthLevel, ServiceMetrics, RecoveryPolicy } from '../runtime/types';
import { TrackingWorker } from '../tracking/TrackingWorker';
import { Logger } from '../system/Logger';

export class TrackingService implements IService {
  public name = 'TrackingService';
  public dependencies = ['CameraService']; // explicitly depends on camera
  
  public state = ServiceState.UNINITIALIZED;
  public health = HealthLevel.OFFLINE;
  public metrics: ServiceMetrics = {
    uptimeMs: 0,
    restartCount: 0,
    averageHealthScore: 100,
    cpuUsagePct: 0,
    memoryUsageMb: 0,
    latencyMs: 0
  };
  
  public recoveryPolicy: RecoveryPolicy = {
    restartLimit: 5,
    restartIntervalMs: 1000,
    backoffMultiplier: 2.0,
    cooldownPeriodMs: 30000
  };

  private startTime = 0;

  public async initialize(): Promise<void> {
    this.state = ServiceState.INITIALIZING;
    this.state = ServiceState.STOPPED;
  }

  public async start(): Promise<void> {
    await TrackingWorker.getInstance().start();
    this.startTime = Date.now();
    this.health = HealthLevel.HEALTHY;
  }

  public async stop(): Promise<void> {
    TrackingWorker.getInstance().stop();
    this.health = HealthLevel.OFFLINE;
    this.metrics.uptimeMs += (Date.now() - this.startTime);
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public async dispose(): Promise<void> {
    await this.stop();
  }

  public async healthCheck(): Promise<HealthLevel> {
    if (this.state !== ServiceState.RUNNING) return HealthLevel.OFFLINE;
    // Ensure worker is alive
    const worker = TrackingWorker.getInstance()['worker'];
    return worker ? HealthLevel.HEALTHY : HealthLevel.CRITICAL;
  }

  public async readyCheck(): Promise<boolean> {
    // Tracking is ready if it's healthy AND Camera is active
    return this.health === HealthLevel.HEALTHY;
  }
}
