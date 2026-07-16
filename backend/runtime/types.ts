export enum ServiceState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  RESTARTING = 'RESTARTING',
  FAILED = 'FAILED',
  DEGRADED = 'DEGRADED',
  RECOVERING = 'RECOVERING'
}

export enum HealthLevel {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  DEGRADED = 'DEGRADED',
  CRITICAL = 'CRITICAL',
  OFFLINE = 'OFFLINE'
}

export interface RecoveryPolicy {
  restartLimit: number;
  restartIntervalMs: number;
  backoffMultiplier: number;
  cooldownPeriodMs: number;
}

export interface ServiceMetrics {
  uptimeMs: number;
  restartCount: number;
  averageHealthScore: number;
  lastRestart?: Date;
  lastFailure?: Date;
  cpuUsagePct: number;
  memoryUsageMb: number;
  latencyMs: number;
}

export interface IService {
  name: string;
  dependencies: string[];
  
  state: ServiceState;
  health: HealthLevel;
  metrics: ServiceMetrics;
  recoveryPolicy: RecoveryPolicy;

  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  dispose(): Promise<void>;
  
  healthCheck(): Promise<HealthLevel>;
  readyCheck(): Promise<boolean>;
}
