import net from 'net';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';

export interface RawFrame {
  width: number;
  height: number;
  format: number; // 1 = RGB
  timestamp: number;
  size: number;
  data: Buffer;
}

export class CameraDevice extends EventEmitter {
  private server: net.Server | null = null;
  private socket: net.Socket | null = null;
  private process: ChildProcess | null = null;
  
  private port: number = 0;
  private buffer: Buffer = Buffer.alloc(0);
  private headerSize = 24; // 4+4+4+8+4

  public active: boolean = false;
  
  // Stats
  public fps: number = 0;
  public droppedFrames: number = 0;
  private frameCount: number = 0;
  private lastFpsTime: number = Date.now();

  constructor(private deviceId: string, private width: number, private height: number, private targetFps: number) {
    super();
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 1. Start TCP Server on random port
      this.server = net.createServer((socket) => {
        this.socket = socket;
        this.active = true;
        
        socket.on('data', (chunk) => this.handleData(chunk));
        
        socket.on('close', () => {
          this.active = false;
          this.emit('disconnected');
        });
        
        socket.on('error', (err) => {
          this.emit('error', err);
        });
      });

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server?.address();
        if (addr && typeof addr !== 'string') {
          this.port = addr.port;
          this.spawnPythonProcess(resolve, reject);
        } else {
          reject(new Error('Failed to bind local TCP server'));
        }
      });
    });
  }

  private spawnPythonProcess(resolve: () => void, reject: (err: Error) => void) {
    const scriptPath = path.join(process.cwd(), 'backend', 'camera', 'capture_bridge.py');
    
    this.process = spawn('python', [
      scriptPath,
      '--capture', this.deviceId,
      '--port', this.port.toString(),
      '--width', this.width.toString(),
      '--height', this.height.toString(),
      '--fps', this.targetFps.toString()
    ]);

    let resolved = false;

    this.process.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.startsWith('SUCCESS')) {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      } else if (msg.startsWith('ERROR')) {
        if (!resolved) {
          resolved = true;
          reject(new Error(msg));
        } else {
          this.emit('error', new Error(msg));
        }
      } else {
        console.log(`[Python Camera] ${msg}`);
      }
    });

    this.process.on('close', (code) => {
      this.active = false;
      this.emit('disconnected');
      if (!resolved) {
        reject(new Error(`Python process exited with code ${code}`));
      }
    });
  }

  private handleData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= this.headerSize) {
      // Read Header (Little Endian)
      const width = this.buffer.readUInt32LE(0);
      const height = this.buffer.readUInt32LE(4);
      const format = this.buffer.readUInt32LE(8);
      const timestamp = this.buffer.readDoubleLE(12);
      const size = this.buffer.readUInt32LE(20);

      const totalSize = this.headerSize + size;

      if (this.buffer.length >= totalSize) {
        // Extract frame data
        const frameData = Buffer.alloc(size);
        this.buffer.copy(frameData, 0, this.headerSize, totalSize);
        
        // Remove frame from buffer
        this.buffer = this.buffer.slice(totalSize);

        const frame: RawFrame = { width, height, format, timestamp, size, data: frameData };
        this.calculateFps();
        this.emit('frame', frame);
      } else {
        // Wait for more data
        break;
      }
    }
  }

  private calculateFps() {
    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  public stop() {
    this.active = false;
    
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    if (this.server) {
      this.server.close();
      this.server = null;
    }
    
    this.buffer = Buffer.alloc(0);
  }
}
