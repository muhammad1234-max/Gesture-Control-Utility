import { FrameBus } from '../framebus/FrameBus';
import { LandmarkBus } from './LandmarkBus';
import { HandTracker } from './HandTracker';
import { WorkerState, TrackingDiagnostics } from '@shared/types';
import { RawFrame } from '../camera/CameraDevice';

export class TrackingWorker {
  private static instance: TrackingWorker;
  private state: WorkerState = WorkerState.STOPPED;
  private tracker: HandTracker;
  
  // Frame dropping / scheduling
  private latestFrame: RawFrame | null = null;
  private isProcessing: boolean = false;
  
  // Telemetry
  private droppedFrames: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private lastFpsTime: number = Date.now();
  private lastInferenceTimeMs: number = 0;
  private restarts: number = 0;
  private lastHandCount: number = 0;
  
  private unsubscribeFrameBus: (() => void) | null = null;

  private constructor() {
    this.tracker = new HandTracker();
    this.setupTracker();
  }

  public static getInstance(): TrackingWorker {
    if (!TrackingWorker.instance) {
      TrackingWorker.instance = new TrackingWorker();
    }
    return TrackingWorker.instance;
  }

  private setupTracker() {
    this.tracker.on('tracking_frame', (frame) => {
      this.isProcessing = false;
      this.calculateFps();
      this.lastInferenceTimeMs = frame.inferenceTimeMs;
      this.lastHandCount = frame.hands.length;
      
      // Publish to LandmarkBus (immutable)
      LandmarkBus.getInstance().publish(frame);
      
      // Immediately schedule next frame if available
      this.processNextFrame();
    });

    this.tracker.on('error', (err) => {
      console.error('[TrackingWorker] Tracker error:', err);
      this.handleCrash();
    });

    this.tracker.on('disconnected', () => {
      console.warn('[TrackingWorker] Tracker disconnected unexpectedly');
      this.handleCrash();
    });
  }

  private handleCrash() {
    if (this.state === WorkerState.STOPPED) return;
    
    this.state = WorkerState.ERROR;
    this.restarts++;
    
    setTimeout(() => {
      if (this.state !== WorkerState.STOPPED) {
        this.state = WorkerState.RESTARTING;
        console.log(`[TrackingWorker] Attempting restart ${this.restarts}...`);
        this.tracker.stop();
        this.start().catch(e => console.error(e));
      }
    }, 2000);
  }

  public async start() {
    if (this.state === WorkerState.RUNNING) return;
    this.state = WorkerState.STARTING;

    try {
      await this.tracker.start();
      this.state = WorkerState.RUNNING;
      console.log('[TrackingWorker] MediaPipe Tracker successfully started.');

      if (!this.unsubscribeFrameBus) {
        this.unsubscribeFrameBus = FrameBus.getInstance().subscribe((frame) => {
          this.onNewFrame(frame);
        });
      }
    } catch (e) {
      console.error('[TrackingWorker] Failed to start tracker:', e);
      this.handleCrash();
    }
  }

  public stop() {
    this.state = WorkerState.STOPPED;
    if (this.unsubscribeFrameBus) {
      this.unsubscribeFrameBus();
      this.unsubscribeFrameBus = null;
    }
    this.tracker.stop();
    this.latestFrame = null;
    this.isProcessing = false;
  }

  private onNewFrame(frame: RawFrame) {
    if (this.state !== WorkerState.RUNNING) return;

    if (this.latestFrame && this.isProcessing) {
      // Overwrite the queued frame. The previous one is dropped.
      this.droppedFrames++;
    }
    this.latestFrame = frame;

    if (!this.isProcessing) {
      this.processNextFrame();
    }
  }

  private processNextFrame() {
    if (!this.latestFrame || this.state !== WorkerState.RUNNING || !this.tracker.isReady) {
      return;
    }

    const frameToProcess = this.latestFrame;
    this.latestFrame = null;
    this.isProcessing = true;

    this.tracker.detect(frameToProcess);
  }

  private calculateFps() {
    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  public getDiagnostics(): TrackingDiagnostics {
    return {
      state: this.state,
      cameraFps: 0, // Injected by TelemetryService
      trackingFps: this.fps,
      latencyMs: this.lastInferenceTimeMs,
      droppedFrames: this.droppedFrames,
      restarts: this.restarts,
      queueDepth: this.latestFrame ? 1 : 0,
      inferenceTimeMs: this.lastInferenceTimeMs,
      handCount: this.lastHandCount
    };
  }
}
