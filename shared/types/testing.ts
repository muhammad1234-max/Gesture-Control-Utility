export interface PythonTelemetry {
  cpuPercent: number;
  memoryRssBytes: number;
  uptimeSeconds: number;
  isHealthy: boolean;
  bridgeName: string;
}

export interface JitterMetrics {
  averageMs: number;
  maxMs: number;
  stdDevMs: number;
  p95Ms: number;
  p99Ms: number;
}

export interface TestingDiagnosticsData {
  fps: any; // PipelineFPS
  memory: any; // MemoryStats
  latencies: Record<string, JitterMetrics>;
  queues: any; // QueueStatus
}
