import { IntentFrame } from '@shared/types';

const HISTORY_SIZE = 180; // 3 seconds at 60 FPS

export class IntentHistory {
  private static instance: IntentHistory;
  
  // Ring buffer of immutable IntentFrames
  private frames: (IntentFrame | null)[] = new Array(HISTORY_SIZE).fill(null);
  private head: number = 0;
  private count: number = 0;

  private constructor() {}

  public static getInstance(): IntentHistory {
    if (!IntentHistory.instance) {
      IntentHistory.instance = new IntentHistory();
    }
    return IntentHistory.instance;
  }

  public add(frame: IntentFrame) {
    this.frames[this.head] = frame;
    this.head = (this.head + 1) % HISTORY_SIZE;
    if (this.count < HISTORY_SIZE) {
      this.count++;
    }
  }

  /**
   * Retrieves the frame from N steps ago.
   * get(0) is the most recent frame.
   * get(1) is the previous frame, etc.
   */
  public get(offset: number): IntentFrame | null {
    if (offset < 0 || offset >= this.count) return null;
    
    // Calculate index wrapping around
    let idx = this.head - 1 - offset;
    if (idx < 0) idx += HISTORY_SIZE;
    
    return this.frames[idx];
  }

  public getCount(): number {
    return this.count;
  }

  /**
   * Retrieves an array of the most recent frames up to `limit`.
   * The first element is the oldest, the last element is the newest.
   */
  public getRecent(limit: number): IntentFrame[] {
    const amount = Math.min(limit, this.count);
    const result: IntentFrame[] = new Array(amount);
    
    for (let i = 0; i < amount; i++) {
      // We want oldest first, so offset is (amount - 1 - i)
      result[i] = this.get(amount - 1 - i)!; 
    }
    return result;
  }

  public clear() {
    this.frames.fill(null);
    this.head = 0;
    this.count = 0;
  }
}
