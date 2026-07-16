import { LatencyProfiler } from './LatencyProfiler';
import { FPSSynchronizer } from './FPSSynchronizer';
import { QueueMonitor } from './QueueMonitor';
import { MemoryMonitor } from './MemoryMonitor';
import { BenchmarkReporter } from './BenchmarkReporter';

export type BenchmarkPreset = '30s' | '5m' | '30m' | '2h' | '8h';

export class BenchmarkRunner {
  private static instance: BenchmarkRunner;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private startTime = 0;

  private constructor() {}

  public static getInstance(): BenchmarkRunner {
    if (!BenchmarkRunner.instance) {
      BenchmarkRunner.instance = new BenchmarkRunner();
    }
    return BenchmarkRunner.instance;
  }

  public async runBenchmark(preset: BenchmarkPreset): Promise<void> {
    if (this.isRunning) throw new Error('Benchmark already running');
    
    const durationMs = this.parsePreset(preset);
    this.isRunning = true;
    this.startTime = performance.now();
    
    console.log(`[Benchmark] Started ${preset} validation run...`);

    return new Promise((resolve) => {
      this.timer = setTimeout(() => {
        this.stopBenchmark();
        resolve();
      }, durationMs);
    });
  }

  public stopBenchmark() {
    if (!this.isRunning) return;
    if (this.timer) clearTimeout(this.timer);
    
    this.isRunning = false;
    const duration = performance.now() - this.startTime;
    
    console.log(`[Benchmark] Completed. Generating report...`);
    BenchmarkReporter.generateReport(duration);
  }

  private parsePreset(preset: BenchmarkPreset): number {
    switch (preset) {
      case '30s': return 30 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '2h': return 2 * 60 * 60 * 1000;
      case '8h': return 8 * 60 * 60 * 1000;
      default: return 30 * 1000;
    }
  }
}
