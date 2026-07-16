import { FrameBus } from '../framebus/FrameBus';
import fs from 'fs';
import path from 'path';

export class ReplayMode {
  private static instance: ReplayMode;
  private isRecording = false;
  private isReplaying = false;
  private recordedFrames: any[] = [];
  
  private constructor() {
    FrameBus.getInstance().subscribe((frame) => {
      if (this.isRecording) {
        // Clone frame deeply or store minimal needed for tracking
        this.recordedFrames.push({
          timestamp: performance.now(),
          width: frame.width,
          height: frame.height,
          // Omitting full buffer for memory in this mock, ideally save to disk immediately
        });
      }
    });
  }

  public static getInstance(): ReplayMode {
    if (!ReplayMode.instance) {
      ReplayMode.instance = new ReplayMode();
    }
    return ReplayMode.instance;
  }

  public startRecording() {
    this.isRecording = true;
    this.recordedFrames = [];
    console.log('[ReplayMode] Started recording FrameBus.');
  }

  public stopRecordingAndSave(filename: string) {
    this.isRecording = false;
    const outPath = path.join(process.cwd(), 'reports', `${filename}.json`);
    fs.writeFileSync(outPath, JSON.stringify(this.recordedFrames));
    console.log(`[ReplayMode] Saved ${this.recordedFrames.length} frames to ${filename}`);
  }
}
