import { GestureBus } from '../gesture/GestureBus';
import { IntentBus } from './IntentBus';
import { IntentEngine } from './IntentEngine';
import { IntentDiagnostics } from './IntentDiagnostics';
import { GestureFrame } from '@shared/types';

export class IntentWorker {
  private static instance: IntentWorker;
  private engine = new IntentEngine();
  
  private latestFrame: GestureFrame | null = null;
  private isProcessing: boolean = false;
  private unsubscribeGestureBus: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): IntentWorker {
    if (!IntentWorker.instance) {
      IntentWorker.instance = new IntentWorker();
    }
    return IntentWorker.instance;
  }

  public start() {
    if (this.unsubscribeGestureBus) return;

    this.unsubscribeGestureBus = GestureBus.getInstance().subscribe((frame) => {
      this.latestFrame = frame;

      if (!this.isProcessing) {
        this.processNextFrame();
      }
    });

    console.log('[IntentWorker] Intent Resolution Engine started.');
  }

  public stop() {
    if (this.unsubscribeGestureBus) {
      this.unsubscribeGestureBus();
      this.unsubscribeGestureBus = null;
    }
    this.latestFrame = null;
    this.isProcessing = false;
    console.log('[IntentWorker] Intent Resolution Engine stopped.');
  }

  private processNextFrame() {
    if (!this.latestFrame) return;

    this.isProcessing = true;

    const frame = this.latestFrame;
    this.latestFrame = null;
    const now = Date.now();

    try {
      const intentFrame = this.engine.process(frame, now);
      IntentBus.getInstance().publish(intentFrame);
    } catch (err) {
      console.error('[IntentWorker] Pipeline error:', err);
    } finally {
      this.isProcessing = false;
      
      if (this.latestFrame) {
        setImmediate(() => this.processNextFrame());
      }
    }
  }
}
