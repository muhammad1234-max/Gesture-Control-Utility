import { JitterMetrics } from '@shared/types';
import { WorstFramesRecorder } from './WorstFramesRecorder';

export class LatencyProfiler {
  private static instance: LatencyProfiler;
  
  // Rolling windows for standard deviation calculation (max 1000 samples)
  private windowSize = 1000;
  private samples = new Map<string, number[]>();

  private constructor() {}

  public static getInstance(): LatencyProfiler {
    if (!LatencyProfiler.instance) {
      LatencyProfiler.instance = new LatencyProfiler();
    }
    return LatencyProfiler.instance;
  }

  public recordLatency(stage: string, latencyMs: number, frameId: string, payload?: any) {
    if (!this.samples.has(stage)) {
      this.samples.set(stage, []);
    }
    
    const arr = this.samples.get(stage)!;
    arr.push(latencyMs);
    
    if (arr.length > this.windowSize) {
      arr.shift();
    }

    // Heuristic: If latency is unusually high, record it as a worst frame
    if (latencyMs > 5.0) { // e.g. anything over 5ms for an internal stage is a spike
      WorstFramesRecorder.getInstance().record({
        frameId,
        latencyMs,
        stage,
        timestamp: performance.now(),
        payloadDump: payload
      });
    }
  }

  public getJitterMetrics(stage: string): JitterMetrics {
    const arr = this.samples.get(stage) || [];
    if (arr.length === 0) {
      return { averageMs: 0, maxMs: 0, stdDevMs: 0, p95Ms: 0, p99Ms: 0 };
    }

    let sum = 0;
    let max = 0;
    
    for (const val of arr) {
      sum += val;
      if (val > max) max = val;
    }
    
    const avg = sum / arr.length;
    
    let sqDiffSum = 0;
    for (const val of arr) {
      sqDiffSum += (val - avg) * (val - avg);
    }
    const stdDev = Math.sqrt(sqDiffSum / arr.length);

    // Percentiles
    const sorted = [...arr].sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p99Idx = Math.floor(sorted.length * 0.99);

    return {
      averageMs: avg,
      maxMs: max,
      stdDevMs: stdDev,
      p95Ms: sorted[p95Idx] || 0,
      p99Ms: sorted[p99Idx] || 0
    };
  }

  public getAllMetrics(): Record<string, JitterMetrics> {
    const res: Record<string, JitterMetrics> = {};
    for (const stage of this.samples.keys()) {
      res[stage] = this.getJitterMetrics(stage);
    }
    return res;
  }
}
