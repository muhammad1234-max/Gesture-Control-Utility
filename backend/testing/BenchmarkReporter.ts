import { LatencyProfiler } from './LatencyProfiler';
import { FPSSynchronizer } from './FPSSynchronizer';
import { MemoryMonitor } from './MemoryMonitor';
import { WorstFramesRecorder } from './WorstFramesRecorder';
import fs from 'fs';
import path from 'path';

export class BenchmarkReporter {
  public static generateReport(durationMs: number) {
    const latencies = LatencyProfiler.getInstance().getAllMetrics();
    const fps = FPSSynchronizer.getInstance().getFPS();
    const mem = MemoryMonitor.getInstance().getStats();
    const worst = WorstFramesRecorder.getInstance().getWorstFrames();

    const report = {
      timestamp: new Date().toISOString(),
      durationSeconds: durationMs / 1000,
      latencies,
      fps,
      memory: mem,
      worstFrames: worst
    };

    const outDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const filename = `benchmark-${Date.now()}.json`;
    fs.writeFileSync(path.join(outDir, filename), JSON.stringify(report, null, 2));
    console.log(`[BenchmarkReporter] Saved report to ${filename}`);
  }
}
