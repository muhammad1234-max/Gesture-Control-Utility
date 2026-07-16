import { IntentBus } from '../intent/IntentBus';
import { ActionBus } from './ActionBus';
import { ActionMapper } from './ActionMapper';
import { ExecutionQueue } from './ExecutionQueue';
import { IntentFrame, IntentType } from '@shared/types';

export class ActionMappingWorker {
  private static instance: ActionMappingWorker;
  private mapper = new ActionMapper();
  
  private latestFrame: IntentFrame | null = null;
  private isProcessing: boolean = false;
  private unsubscribeIntentBus: (() => void) | null = null;

  private constructor() {
    // Initialize ExecutionQueue singleton so it subscribes to ActionBus
    ExecutionQueue.getInstance();
  }

  public static getInstance(): ActionMappingWorker {
    if (!ActionMappingWorker.instance) {
      ActionMappingWorker.instance = new ActionMappingWorker();
    }
    return ActionMappingWorker.instance;
  }

  public start() {
    if (this.unsubscribeIntentBus) return;

    this.unsubscribeIntentBus = IntentBus.getInstance().subscribe((frame) => {
      this.latestFrame = frame;

      if (!this.isProcessing) {
        this.processNextFrame();
      }
    });

    console.log('[ActionMappingWorker] Action Mapping Engine started.');
  }

  public stop() {
    if (this.unsubscribeIntentBus) {
      this.unsubscribeIntentBus();
      this.unsubscribeIntentBus = null;
    }
    this.latestFrame = null;
    this.isProcessing = false;
    this.mapper.resetThrottle();
    ExecutionQueue.getInstance().clear();
    console.log('[ActionMappingWorker] Action Mapping Engine stopped.');
  }

  private processNextFrame() {
    if (!this.latestFrame) return;

    this.isProcessing = true;

    const frame = this.latestFrame;
    this.latestFrame = null;

    try {
      const executableAction = this.mapper.process(frame);
      if (executableAction) {
        ActionBus.getInstance().publish(executableAction);
      }
    } catch (err) {
      console.error('[ActionMappingWorker] Pipeline error:', err);
    } finally {
      this.isProcessing = false;
      
      if (this.latestFrame) {
        setImmediate(() => this.processNextFrame());
      }
    }
  }
}
