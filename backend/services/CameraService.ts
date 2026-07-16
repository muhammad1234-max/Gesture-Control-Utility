import { IService, ServiceState, HealthLevel, ServiceMetrics, RecoveryPolicy } from '../runtime/types';
import { CameraManager } from '../camera/CameraManager';
import { Logger } from '../system/Logger';
import { ConfigManager } from '../config/ConfigManager';

export class CameraService implements IService {
  public name = 'CameraService';
  public dependencies = ['ConfigManager', 'LoggerService']; // Example
  
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
    restartIntervalMs: 2000,
    backoffMultiplier: 1.5,
    cooldownPeriodMs: 60000
  };

  private startTime = 0;

  public async initialize(): Promise<void> {
    this.state = ServiceState.INITIALIZING;
    // Pre-flight checks
    this.state = ServiceState.STOPPED;
  }

  public async start(): Promise<void> {
    const config = ConfigManager.getInstance().getConfig();
    if (!config.camera.deviceId) {
      Logger.warn('CameraService started but no deviceId configured.');
    } else {
      await CameraManager.getInstance().startCamera(
        config.camera.deviceId, 
        config.camera.resolution === '1080p' ? 1920 : 1280, 
        config.camera.resolution === '1080p' ? 1080 : 720, 
        config.camera.fps
      );
    }
    this.startTime = Date.now();
    this.health = HealthLevel.HEALTHY;
  }

  public async stop(): Promise<void> {
    CameraManager.getInstance().stopCamera();
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
    // Check if camera is actively producing frames
    if (this.state !== ServiceState.RUNNING) return HealthLevel.OFFLINE;
    const isRunning = CameraManager.getInstance()['isRunning'];
    return isRunning ? HealthLevel.HEALTHY : HealthLevel.CRITICAL;
  }

  public async readyCheck(): Promise<boolean> {
    return this.health === HealthLevel.HEALTHY;
  }
}
