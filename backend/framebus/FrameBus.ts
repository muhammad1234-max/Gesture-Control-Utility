import { RawFrame } from '../camera/CameraDevice';

export type FrameSubscriber = (frame: RawFrame) => void;

export class FrameBus {
  private static instance: FrameBus;
  private subscribers: Set<FrameSubscriber> = new Set();
  
  private constructor() {}

  public static getInstance(): FrameBus {
    if (!FrameBus.instance) {
      FrameBus.instance = new FrameBus();
    }
    return FrameBus.instance;
  }

  public subscribe(handler: FrameSubscriber): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  public publish(frame: RawFrame): void {
    // We pass the raw frame reference directly. 
    // Subscribers MUST NOT mutate the Buffer.
    for (const sub of this.subscribers) {
      // Execute outside main loop to prevent blocking if needed,
      // but usually synchronous is better for low latency.
      try {
        sub(frame);
      } catch (err) {
        console.error('[FrameBus] Subscriber error:', err);
      }
    }
  }
}
