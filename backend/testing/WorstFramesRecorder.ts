export interface WorstFrameInfo {
  frameId: string;
  latencyMs: number;
  timestamp: number;
  stage: string; // e.g. 'Tracking', 'Gesture', 'Intent'
  payloadDump?: any;
}

export class WorstFramesRecorder {
  private static instance: WorstFramesRecorder;
  private maxStored = 10;
  private worstFrames: WorstFrameInfo[] = [];

  private constructor() {}

  public static getInstance(): WorstFramesRecorder {
    if (!WorstFramesRecorder.instance) {
      WorstFramesRecorder.instance = new WorstFramesRecorder();
    }
    return WorstFramesRecorder.instance;
  }

  public record(info: WorstFrameInfo) {
    this.worstFrames.push(info);
    this.worstFrames.sort((a, b) => b.latencyMs - a.latencyMs); // Descending
    
    if (this.worstFrames.length > this.maxStored) {
      this.worstFrames.pop();
    }
  }

  public getWorstFrames(): WorstFrameInfo[] {
    return this.worstFrames;
  }

  public clear() {
    this.worstFrames = [];
  }
}
