import { GestureFrame } from '@shared/types/gesture';

export type GestureSubscriber = (frame: GestureFrame) => void;

export class GestureBus {
  private static instance: GestureBus;
  private subscribers: Set<GestureSubscriber> = new Set();
  
  private constructor() {}

  public static getInstance(): GestureBus {
    if (!GestureBus.instance) {
      GestureBus.instance = new GestureBus();
    }
    return GestureBus.instance;
  }

  public subscribe(handler: GestureSubscriber): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /**
   * Publishes a fully immutable GestureFrame.
   * Consumers must NEVER mutate the frame.
   */
  public publish(frame: GestureFrame): void {
    // We enforce immutability as requested for the final output
    Object.freeze(frame);
    Object.freeze(frame.activeGestures);
    Object.freeze(frame.candidateGestures);
    Object.freeze(frame.gestureConfidences);
    Object.freeze(frame.fingerStates);
    Object.freeze(frame.pinchStrengths);
    Object.freeze(frame.handVelocity);
    Object.freeze(frame.handDirection);
    Object.freeze(frame.handRotation);

    for (const sub of this.subscribers) {
      try {
        sub(frame);
      } catch (err) {
        console.error('[GestureBus] Subscriber error:', err);
      }
    }
  }
}
