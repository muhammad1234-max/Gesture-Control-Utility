import { exec } from 'child_process';
import path from 'path';
import { CameraDevice, RawFrame } from './CameraDevice';
import { CameraDeviceInfo, CameraTelemetry } from '@shared/types';
import { EventEmitter } from 'events';

export class CameraManager extends EventEmitter {
  private static instance: CameraManager;
  private activeDevice: CameraDevice | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Thread-safe-ish latest frame buffer (JS is single-threaded, but prevents memory leaks)
  private latestFrame: RawFrame | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): CameraManager {
    if (!CameraManager.instance) {
      CameraManager.instance = new CameraManager();
    }
    return CameraManager.instance;
  }

  public async enumerateCameras(): Promise<CameraDeviceInfo[]> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'backend', 'camera', 'capture_bridge.py');
      exec(`python ${scriptPath} --list`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to enumerate cameras: ${stderr || error.message}`));
          return;
        }
        try {
          const cameras = JSON.parse(stdout.trim());
          resolve(cameras);
        } catch (e) {
          reject(new Error('Failed to parse camera list JSON'));
        }
      });
    });
  }

  public async startCamera(id: string, width = 640, height = 480, fps = 60): Promise<void> {
    if (this.activeDevice) {
      this.stopCamera();
    }

    console.log(`[CameraManager] Starting camera ${id} at ${width}x${height}@${fps}fps`);

    this.activeDevice = new CameraDevice(id, width, height, fps);

    this.activeDevice.on('frame', (frame: RawFrame) => {
      this.latestFrame = frame;
      this.reconnectAttempts = 0; // reset on successful frame
      this.emit('frame', frame);
      
      // Phase 3: Route raw frames into the internal publish/subscribe bus
      const frameBus = (require('../framebus/FrameBus').FrameBus).getInstance();
      frameBus.publish(frame);
    });

    this.activeDevice.on('error', (err) => {
      console.error(`[CameraManager] Camera error:`, err);
      this.handleDisconnect(id, width, height, fps);
    });

    this.activeDevice.on('disconnected', () => {
      console.warn(`[CameraManager] Camera disconnected`);
      this.handleDisconnect(id, width, height, fps);
    });

    await this.activeDevice.start();
  }

  private handleDisconnect(id: string, width: number, height: number, fps: number) {
    if (!this.activeDevice?.active) {
      this.emit('status_change', false);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`[CameraManager] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in 2 seconds...`);
        this.reconnectTimer = setTimeout(() => {
          this.startCamera(id, width, height, fps).catch(e => console.error(e));
        }, 2000);
      } else {
        console.error(`[CameraManager] Max reconnect attempts reached. Giving up.`);
      }
    }
  }

  public stopCamera() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.activeDevice) {
      console.log(`[CameraManager] Stopping active camera`);
      this.activeDevice.stop();
      this.activeDevice.removeAllListeners();
      this.activeDevice = null;
    }
    this.latestFrame = null;
    this.emit('status_change', false);
  }

  public getLatestFrame(): RawFrame | null {
    return this.latestFrame;
  }

  public getTelemetry(): CameraTelemetry {
    if (!this.activeDevice || !this.activeDevice.active) {
      return { fps: 0, droppedFrames: 0, active: false, resolution: { width: 0, height: 0 } };
    }
    
    return {
      fps: this.activeDevice.fps,
      droppedFrames: this.activeDevice.droppedFrames,
      active: this.activeDevice.active,
      resolution: this.latestFrame 
        ? { width: this.latestFrame.width, height: this.latestFrame.height }
        : { width: 0, height: 0 }
    };
  }
}
