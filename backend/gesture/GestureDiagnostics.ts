import { GestureDiagnosticsData } from '@shared/types/gesture';
import { GestureBus } from './GestureBus';

export class GestureDiagnostics {
  private static instance: GestureDiagnostics;
  
  private data: GestureDiagnosticsData = {
    recognitionFps: 0,
    recognitionLatencyMs: 0,
    framesReceived: 0,
    framesProcessed: 0,
    framesDropped: 0,
    averageConfidence: 0,
    gestureStability: 100,
    falseRecognitions: 0,
    transitionCount: 0,
    queueDepth: 0
  };

  private frameCount = 0;
  private lastFpsTime = Date.now();
  private confidenceAccumulator = 0;

  private constructor() {
    GestureBus.getInstance().subscribe(this.onGestureFrame.bind(this));
  }

  public static getInstance(): GestureDiagnostics {
    if (!GestureDiagnostics.instance) {
      GestureDiagnostics.instance = new GestureDiagnostics();
    }
    return GestureDiagnostics.instance;
  }

  public recordReceived() {
    this.data.framesReceived++;
  }
  
  public recordDropped() {
    this.data.framesDropped++;
  }

  public recordTransition() {
    this.data.transitionCount++;
  }

  public updateQueueDepth(depth: number) {
    this.data.queueDepth = depth;
  }

  private onGestureFrame(frame: any) {
    this.data.framesProcessed++;
    this.frameCount++;
    
    // Calculate FPS
    const now = Date.now();
    if (now - this.lastFpsTime >= 1000) {
      this.data.recognitionFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
      
      // Update average confidence
      if (this.data.framesProcessed > 0) {
         this.data.averageConfidence = this.confidenceAccumulator / this.data.recognitionFps;
         this.confidenceAccumulator = 0;
      }
    }

    this.data.recognitionLatencyMs = frame.pipelineLatency;
    
    // Accumulate confidence for the active gesture (if any), else neutral
    let maxConf = 0;
    if (frame.activeGestures && frame.activeGestures.length > 0) {
       maxConf = frame.gestureConfidences[frame.activeGestures[0]] || 0;
    }
    this.confidenceAccumulator += maxConf;
  }

  public getTelemetry(): GestureDiagnosticsData {
    return this.data;
  }
}
