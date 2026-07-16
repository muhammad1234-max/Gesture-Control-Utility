export interface MemoryStats {
  rssMB: number;
  heapTotalMB: number;
  heapUsedMB: number;
  externalMB: number;
  arrayBuffersMB: number;
  isLeaking: boolean;
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private history: number[] = [];
  
  private constructor() {
    setInterval(() => this.record(), 5000);
  }

  public static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  private record() {
    const mem = process.memoryUsage();
    this.history.push(mem.heapUsed);
    if (this.history.length > 120) { // Keep last 10 minutes (at 5s intervals)
      this.history.shift();
    }
  }

  public getStats(): MemoryStats {
    const mem = process.memoryUsage();
    
    // Very basic leak detection: if the last 10 readings are strictly increasing
    let isLeaking = false;
    if (this.history.length >= 10) {
      isLeaking = true;
      const recent = this.history.slice(-10);
      for (let i = 1; i < recent.length; i++) {
        if (recent[i] <= recent[i-1]) {
          isLeaking = false;
          break;
        }
      }
    }

    return {
      rssMB: mem.rss / 1e6,
      heapTotalMB: mem.heapTotal / 1e6,
      heapUsedMB: mem.heapUsed / 1e6,
      externalMB: mem.external / 1e6,
      arrayBuffersMB: mem.arrayBuffers / 1e6,
      isLeaking
    };
  }
}
