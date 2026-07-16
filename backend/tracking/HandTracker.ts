import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';
import { TrackingFrame, HandDetection, NormalizedLandmark, Handedness } from '@shared/types';
import { RawFrame } from '../camera/CameraDevice';

export class HandTracker extends EventEmitter {
  private process: ChildProcess | null = null;
  
  // Pre-allocated buffers to avoid per-frame GC heap allocations
  private txHeader: Buffer = Buffer.alloc(12);
  private incomingBuffer: Buffer = Buffer.allocUnsafe(65536); // 64KB sliding window
  private readOffset: number = 0;
  private writeOffset: number = 0;
  
  public isReady: boolean = false;
  
  constructor() {
    super();
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'backend', 'tracking', 'tracker_bridge.py');
      
      this.process = spawn('python', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let resolved = false;

      this.process.stderr?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg.startsWith('SUCCESS:')) {
          this.isReady = true;
          if (!resolved) {
            resolved = true;
            resolve();
          }
        } else if (msg.startsWith('ERROR:')) {
          if (!resolved) {
            resolved = true;
            reject(new Error(msg));
          } else {
            this.emit('error', new Error(msg));
          }
        }
        console.log(`[Python Tracker] ${msg}`);
      });

      this.process.stdout?.on('data', (chunk) => this.handleBinaryOutput(chunk));

      this.process.on('close', (code) => {
        this.isReady = false;
        this.emit('disconnected');
        if (!resolved) {
          reject(new Error(`Tracker process exited with code ${code}`));
        }
      });
    });
  }

  public detect(frame: RawFrame) {
    if (!this.isReady || !this.process?.stdin) return;

    // Reuse preallocated header buffer
    this.txHeader.writeUInt32LE(frame.width, 0);
    this.txHeader.writeUInt32LE(frame.height, 4);
    this.txHeader.writeUInt32LE(frame.size, 8);
    
    this.process.stdin.write(this.txHeader);
    this.process.stdin.write(frame.data);
  }

  private handleBinaryOutput(chunk: Buffer) {
    // Sliding window buffer management to avoid Buffer.concat allocations
    if (this.writeOffset + chunk.length > this.incomingBuffer.length) {
      const remaining = this.writeOffset - this.readOffset;
      if (remaining > 0) {
        this.incomingBuffer.copy(this.incomingBuffer, 0, this.readOffset, this.writeOffset);
      }
      this.readOffset = 0;
      this.writeOffset = remaining;
    }

    chunk.copy(this.incomingBuffer, this.writeOffset);
    this.writeOffset += chunk.length;

    while (true) {
      const available = this.writeOffset - this.readOffset;
      if (available < 16) break;

      const handCount = this.incomingBuffer.readUInt32LE(this.readOffset + 8);
      const totalRequiredSize = 16 + (handCount * 428);

      if (available < totalRequiredSize) break; // Wait for more data

      // We have a full payload
      const timestamp = this.incomingBuffer.readDoubleLE(this.readOffset);
      const inferenceTimeMs = this.incomingBuffer.readFloatLE(this.readOffset + 12);

      const trackingFrame = this.getPooledFrame();
      trackingFrame.timestamp = timestamp;
      trackingFrame.inferenceTimeMs = inferenceTimeMs;
      
      // Clear hands array
      trackingFrame.hands.length = 0;

      let offset = this.readOffset + 16;

      for (let i = 0; i < handCount; i++) {
        const h_idx = this.incomingBuffer.readUInt32LE(offset);
        const score = this.incomingBuffer.readFloatLE(offset + 4);
        offset += 8;

        const hand = this.getPooledHand();
        hand.handedness = h_idx as Handedness;
        hand.score = score;

        for (let j = 0; j < 21; j++) {
          const lm = hand.landmarks[j];
          lm.x = this.incomingBuffer.readFloatLE(offset);
          lm.y = this.incomingBuffer.readFloatLE(offset + 4);
          lm.z = this.incomingBuffer.readFloatLE(offset + 8);
          lm.visibility = this.incomingBuffer.readFloatLE(offset + 12);
          lm.presence = this.incomingBuffer.readFloatLE(offset + 16);
          offset += 20;
        }

        trackingFrame.hands.push(hand);
      }

      this.readOffset += totalRequiredSize;

      this.emit('tracking_frame', trackingFrame);
    }
    
    // Reset offsets if buffer is fully consumed to maximize contiguous space
    if (this.readOffset === this.writeOffset) {
      this.readOffset = 0;
      this.writeOffset = 0;
    }
  }

  // Very simple preallocated pool (Round Robin for safety)
  private framePool: TrackingFrame[] = [];
  private framePoolIdx: number = 0;
  
  private handPool: HandDetection[] = [];
  private handPoolIdx: number = 0;

  private getPooledFrame(): TrackingFrame {
    if (this.framePool.length === 0) {
      for (let i = 0; i < 10; i++) this.framePool.push({ timestamp: 0, inferenceTimeMs: 0, hands: [] });
    }
    const frame = this.framePool[this.framePoolIdx];
    this.framePoolIdx = (this.framePoolIdx + 1) % this.framePool.length;
    return frame;
  }

  private getPooledHand(): HandDetection {
    if (this.handPool.length === 0) {
      for (let i = 0; i < 20; i++) {
        const landmarks: NormalizedLandmark[] = [];
        for (let j = 0; j < 21; j++) landmarks.push({ x:0, y:0, z:0, visibility:0, presence:0 });
        this.handPool.push({ handedness: Handedness.LEFT, score: 0, landmarks });
      }
    }
    const hand = this.handPool[this.handPoolIdx];
    this.handPoolIdx = (this.handPoolIdx + 1) % this.handPool.length;
    return hand;
  }

  public stop() {
    this.isReady = false;
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.readOffset = 0;
    this.writeOffset = 0;
  }
}
