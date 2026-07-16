import { IntentFrame } from '@shared/types';

export type IntentSubscriber = (frame: IntentFrame) => void;

export class IntentBus {
  private static instance: IntentBus;
  private subscribers: Set<IntentSubscriber> = new Set();
  
  private constructor() {}

  public static getInstance(): IntentBus {
    if (!IntentBus.instance) {
      IntentBus.instance = new IntentBus();
    }
    return IntentBus.instance;
  }

  public subscribe(handler: IntentSubscriber): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /**
   * Publishes a fully immutable IntentFrame.
   */
  public publish(frame: IntentFrame): void {
    Object.freeze(frame);
    Object.freeze(frame.activeGestures);
    
    for (const sub of this.subscribers) {
      try {
        sub(frame);
      } catch (err) {
        console.error('[IntentBus] Subscriber error:', err);
      }
    }
  }
}
