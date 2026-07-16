import { ExecutionDiagnosticsData } from '@shared/types';

export class ExecutionDiagnostics {
  private static instance: ExecutionDiagnostics;
  
  private data: ExecutionDiagnosticsData = {
    queueDepth: 0,
    movementQueueDepth: 0,
    executionFps: 0,
    averageQueueWaitTimeMs: 0,
    averageBridgeRttMs: 0,
    averagePythonTimeMs: 0,
    averageWin32TimeMs: 0,
    averageEndToEndLatencyMs: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    lastExecutedAction: 'None',
    lastFailedAction: 'None',
    totalUptimeSeconds: 0
  };

  private frameCount = 0;
  private lastFpsTime = performance.now();
  private startTime = performance.now();

  // Accumulators for fast moving average
  private totals = {
    wait: 0, rtt: 0, python: 0, win32: 0, e2e: 0, count: 0
  };

  private constructor() {
    setInterval(() => this.updateFps(), 1000);
  }

  public static getInstance(): ExecutionDiagnostics {
    if (!ExecutionDiagnostics.instance) {
      ExecutionDiagnostics.instance = new ExecutionDiagnostics();
    }
    return ExecutionDiagnostics.instance;
  }

  public recordExecution(
    actionId: string, 
    success: boolean, 
    waitMs: number, 
    rttMs: number, 
    pythonMs: number, 
    win32Ms: number
  ) {
    this.frameCount++;
    
    if (success) {
      this.data.successfulExecutions++;
      this.data.lastExecutedAction = actionId;
    } else {
      this.data.failedExecutions++;
      this.data.lastFailedAction = actionId;
    }

    this.totals.count++;
    this.totals.wait += waitMs;
    this.totals.rtt += rttMs;
    this.totals.python += pythonMs;
    this.totals.win32 += win32Ms;
    this.totals.e2e += (waitMs + rttMs); // Total node wait + bridge RTT

    this.data.averageQueueWaitTimeMs = this.totals.wait / this.totals.count;
    this.data.averageBridgeRttMs = this.totals.rtt / this.totals.count;
    this.data.averagePythonTimeMs = this.totals.python / this.totals.count;
    this.data.averageWin32TimeMs = this.totals.win32 / this.totals.count;
    this.data.averageEndToEndLatencyMs = this.totals.e2e / this.totals.count;

    if (this.totals.count > 1000) {
      this.totals.wait = this.data.averageQueueWaitTimeMs * 100;
      this.totals.rtt = this.data.averageBridgeRttMs * 100;
      this.totals.python = this.data.averagePythonTimeMs * 100;
      this.totals.win32 = this.data.averageWin32TimeMs * 100;
      this.totals.e2e = this.data.averageEndToEndLatencyMs * 100;
      this.totals.count = 100;
    }
  }

  private updateFps() {
    const now = performance.now();
    this.data.executionFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
    this.frameCount = 0;
    this.lastFpsTime = now;
    this.data.totalUptimeSeconds = (now - this.startTime) / 1000;
  }

  public setQueueDepths(main: number, movement: number) {
    this.data.queueDepth = main;
    this.data.movementQueueDepth = movement;
  }

  public getTelemetry(): ExecutionDiagnosticsData {
    return this.data;
  }
}
