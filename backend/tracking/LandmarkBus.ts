import { TrackingFrame } from '@shared/types';

export type LandmarkSubscriber = (frame: TrackingFrame) => void;

export class LandmarkBus {
  private static instance: LandmarkBus;
  private subscribers: Set<LandmarkSubscriber> = new Set();
  
  private constructor() {}

  public static getInstance(): LandmarkBus {
    if (!LandmarkBus.instance) {
      LandmarkBus.instance = new LandmarkBus();
    }
    return LandmarkBus.instance;
  }

  public subscribe(handler: LandmarkSubscriber): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  public publish(frame: TrackingFrame): void {
    // The TrackingFrame must be treated as immutable by subscribers per architecture requirements.
    // We do not Object.freeze() because HandTracker uses an Object Pool to avoid GC pauses.
    
    for (const sub of this.subscribers) {
      try {
        sub(frame);
      } catch (err) {
        console.error('[LandmarkBus] Subscriber error:', err);
      }
    }
  }
}
