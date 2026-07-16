import { LandmarkBus } from '../tracking/LandmarkBus';
import { GestureBus } from './GestureBus';
import { GestureRecognizer } from './GestureRecognizer';
import { GestureDiagnostics } from './GestureDiagnostics';
import { TrackingFrame } from '@shared/types';

export class GestureRecognitionWorker {
  private static instance: GestureRecognitionWorker;
  private recognizer = new GestureRecognizer();
  
  private latestFrame: TrackingFrame | null = null;
  private isProcessing: boolean = false;
  private unsubscribeLandmarkBus: (() => void) | null = null;

  // Track time to compute velocity correctly across frames
  private lastProcessTime: number = Date.now();

  private constructor() {}

  public static getInstance(): GestureRecognitionWorker {
    if (!GestureRecognitionWorker.instance) {
      GestureRecognitionWorker.instance = new GestureRecognitionWorker();
    }
    return GestureRecognitionWorker.instance;
  }

  public start() {
    if (this.unsubscribeLandmarkBus) return;

    this.lastProcessTime = Date.now();

    this.unsubscribeLandmarkBus = LandmarkBus.getInstance().subscribe((frame) => {
      GestureDiagnostics.getInstance().recordReceived();
      
      if (this.isProcessing && this.latestFrame) {
        GestureDiagnostics.getInstance().recordDropped();
      }
      this.latestFrame = frame;

      if (!this.isProcessing) {
        this.processNextFrame();
      }
    });

    console.log('[GestureWorker] Gesture Recognition Engine started.');
  }

  public stop() {
    if (this.unsubscribeLandmarkBus) {
      this.unsubscribeLandmarkBus();
      this.unsubscribeLandmarkBus = null;
    }
    this.latestFrame = null;
    this.isProcessing = false;
    console.log('[GestureWorker] Gesture Recognition Engine stopped.');
  }

  private processNextFrame() {
    if (!this.latestFrame) return;

    this.isProcessing = true;
    GestureDiagnostics.getInstance().updateQueueDepth(1);

    const frame = this.latestFrame;
    this.latestFrame = null;

    const now = Date.now();
    const deltaTimeMs = now - this.lastProcessTime;
    this.lastProcessTime = now;

    try {
      const gestureFrame = this.recognizer.recognize(frame, deltaTimeMs);
      
      if (gestureFrame) {
        GestureBus.getInstance().publish(gestureFrame);
      }
    } catch (err) {
      console.error('[GestureWorker] Pipeline error:', err);
    } finally {
      this.isProcessing = false;
      GestureDiagnostics.getInstance().updateQueueDepth(this.latestFrame ? 1 : 0);
      
      if (this.latestFrame) {
        // Schedule next tick cleanly
        setImmediate(() => this.processNextFrame());
      }
    }
  }
}
