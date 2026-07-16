export interface ExecutionResult {
  success: boolean;
  actionId: string;
  executor: string;
  failureReason?: string;
  
  // Timing metrics
  queueWaitTimeMs: number;
  bridgeRttMs: number;
  pythonProcessingTimeMs: number;
  win32ExecutionTimeMs: number;
  totalLatencyMs: number;
}

export interface ExecutionDiagnosticsData {
  queueDepth: number;
  movementQueueDepth: number;
  executionFps: number;
  
  averageQueueWaitTimeMs: number;
  averageBridgeRttMs: number;
  averagePythonTimeMs: number;
  averageWin32TimeMs: number;
  averageEndToEndLatencyMs: number;
  
  successfulExecutions: number;
  failedExecutions: number;
  
  lastExecutedAction: string;
  lastFailedAction: string;
  
  totalUptimeSeconds: number;
}
