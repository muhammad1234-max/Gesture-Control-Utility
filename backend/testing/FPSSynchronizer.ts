export interface PipelineFPS {
  camera: number;
  tracking: number;
  gesture: number;
  intent: number;
  action: number;
  execution: number;
  droppedFrames: number;
}

export class FPSSynchronizer {
  private static instance: FPSSynchronizer;
  
  private counts = { camera: 0, tracking: 0, gesture: 0, intent: 0, action: 0, execution: 0 };
  private lastFps: PipelineFPS = { camera: 0, tracking: 0, gesture: 0, intent: 0, action: 0, execution: 0, droppedFrames: 0 };
  private totalDropped = 0;
  
  private constructor() {
    setInterval(() => this.calculateFps(), 1000);
  }

  public static getInstance(): FPSSynchronizer {
    if (!FPSSynchronizer.instance) {
      FPSSynchronizer.instance = new FPSSynchronizer();
    }
    return FPSSynchronizer.instance;
  }

  public tick(stage: keyof typeof this.counts) {
    this.counts[stage]++;
  }

  private calculateFps() {
    this.lastFps.camera = this.counts.camera;
    this.lastFps.tracking = this.counts.tracking;
    this.lastFps.gesture = this.counts.gesture;
    this.lastFps.intent = this.counts.intent;
    this.lastFps.action = this.counts.action;
    this.lastFps.execution = this.counts.execution;
    
    // A simplistic way to detect dropped frames in a linear pipeline:
    // If tracking processed fewer than camera captured (with some margin for the ends of the second)
    const drops = Math.max(0, this.lastFps.camera - this.lastFps.tracking);
    if (drops > 5) { // Threshold to ignore typical 1 sec boundary misalignment
        this.totalDropped += drops;
    }
    
    this.lastFps.droppedFrames = this.totalDropped;
    
    // Reset counts
    this.counts = { camera: 0, tracking: 0, gesture: 0, intent: 0, action: 0, execution: 0 };
  }

  public getFPS(): PipelineFPS {
    return this.lastFps;
  }
}
