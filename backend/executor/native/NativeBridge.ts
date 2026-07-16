import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { ExecutionResult } from '@shared/types';

// Command Types
const CMD_MOVE_MOUSE = 0;
const CMD_LEFT_CLICK = 1;
const CMD_RIGHT_CLICK = 2;
const CMD_SCROLL = 3;
const CMD_KEY_DOWN = 4;
const CMD_KEY_UP = 5;

interface PendingPromise {
  resolve: (res: ExecutionResult) => void;
  reject: (err: Error) => void;
  actionId: string;
  executor: string;
  enqueuedAt: number;
}

export class NativeBridge {
  private static instance: NativeBridge;
  private pythonProcess: ChildProcess | null = null;
  
  private nextCommandId = 1;
  private pendingRequests = new Map<number, PendingPromise>();
  
  private rxBuffer: Buffer = Buffer.alloc(0);
  private RESP_SIZE = 21; // uint32 + uint8 + uint64 + uint64 = 4 + 1 + 8 + 8 = 21 bytes
  
  private isRestarting = false;

  private constructor() {}

  public static getInstance(): NativeBridge {
    if (!NativeBridge.instance) {
      NativeBridge.instance = new NativeBridge();
    }
    return NativeBridge.instance;
  }

  public start() {
    if (this.pythonProcess && !this.pythonProcess.killed) return;
    
    this.isRestarting = false;
    this.rxBuffer = Buffer.alloc(0);

    const scriptPath = path.join(__dirname, 'Win32Bridge.py');
    this.pythonProcess = spawn('python', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.pythonProcess.stdout?.on('data', (data: Buffer) => this.handleData(data));
    
    this.pythonProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`[Win32Bridge] ${data.toString()}`);
    });

    this.pythonProcess.on('close', (code) => {
      console.warn(`[Win32Bridge] Exited with code ${code}. Restarting...`);
      this.handleCrash();
    });

    console.log('[NativeBridge] Win32 daemon started.');
  }

  public stop() {
    this.isRestarting = true; // Prevent auto-restart on manual stop
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
    
    // Fail all pending
    for (const p of this.pendingRequests.values()) {
      p.reject(new Error('Bridge stopped'));
    }
    this.pendingRequests.clear();
  }

  private handleCrash() {
    if (this.isRestarting) return;
    
    // Fail all pending
    for (const p of this.pendingRequests.values()) {
      p.reject(new Error('Bridge crashed'));
    }
    this.pendingRequests.clear();
    
    // Auto restart
    setTimeout(() => this.start(), 1000);
  }

  private handleData(data: Buffer) {
    this.rxBuffer = Buffer.concat([this.rxBuffer, data]);

    while (this.rxBuffer.length > 0) {
      const packetType = this.rxBuffer.readUInt8(0);
      
      if (packetType === 0) { // CMD_RESPONSE
        const RESP_SIZE = 22; // Type(1) + CmdId(4) + Success(1) + PyTime(8) + W32Time(8)
        if (this.rxBuffer.length < RESP_SIZE) break;
        
        const chunk = this.rxBuffer.subarray(0, RESP_SIZE);
        this.rxBuffer = this.rxBuffer.subarray(RESP_SIZE);

        const cmdId = chunk.readUInt32LE(1);
        const success = chunk.readUInt8(5);
        const pyTimeNs = chunk.readBigUInt64LE(6);
        const win32TimeNs = chunk.readBigUInt64LE(14);

        const promise = this.pendingRequests.get(cmdId);
        if (promise) {
          this.pendingRequests.delete(cmdId);
          
          const now = performance.now();
          const rttMs = now - promise.enqueuedAt;
          const pyMs = Number(pyTimeNs) / 1e6;
          const w32Ms = Number(win32TimeNs) / 1e6;

          promise.resolve({
            success: success === 1,
            actionId: promise.actionId,
            executor: promise.executor,
            queueWaitTimeMs: 0, 
            bridgeRttMs: rttMs,
            pythonProcessingTimeMs: pyMs,
            win32ExecutionTimeMs: w32Ms,
            totalLatencyMs: 0, 
            failureReason: success === 0 ? 'Native execution failed' : undefined
          });
        }
      } 
      else if (packetType === 1) { // TELEMETRY
        const TELEMETRY_SIZE = 22; // Type(1) + Cpu(4) + Mem(8) + Uptime(4) + Health(1) + padding(4)? No wait, exactly 18 bytes: B f Q f B = 1 + 4 + 8 + 4 + 1 = 18 bytes.
        const EXACT_SIZE = 18;
        if (this.rxBuffer.length < EXACT_SIZE) break;
        
        const chunk = this.rxBuffer.subarray(0, EXACT_SIZE);
        this.rxBuffer = this.rxBuffer.subarray(EXACT_SIZE);
        
        const cpuPct = chunk.readFloatLE(1);
        const memRss = Number(chunk.readBigUInt64LE(5));
        const uptime = chunk.readFloatLE(13);
        const healthy = chunk.readUInt8(17) === 1;

        // Optionally, push this telemetry to a global store or diagnostics module
        // console.log(`[Win32Bridge Telemetry] CPU: ${cpuPct.toFixed(1)}% | Mem: ${(memRss/1e6).toFixed(1)}MB | Uptime: ${uptime.toFixed(1)}s`);
      }
      else {
        // Unknown packet type, should not happen, but if it does, flush buffer
        console.error(`[NativeBridge] Unknown packet type: ${packetType}`);
        this.rxBuffer = Buffer.alloc(0);
        break;
      }
    }
  }

  private sendCommand(cmdType: number, payload: Buffer, actionId: string, executor: string): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      if (!this.pythonProcess || !this.pythonProcess.stdin) {
        return reject(new Error('Bridge not running'));
      }

      const cmdId = this.nextCommandId++;
      
      this.pendingRequests.set(cmdId, {
        resolve,
        reject,
        actionId,
        executor,
        enqueuedAt: performance.now()
      });

      const header = Buffer.alloc(9);
      header.writeUInt32LE(cmdId, 0);
      header.writeUInt8(cmdType, 4);
      header.writeUInt32LE(payload.length, 5);

      const packet = Buffer.concat([header, payload]);
      this.pythonProcess.stdin.write(packet);
    });
  }

  // --- Strongly Typed Methods --- //

  public moveMouse(dx: number, dy: number, actionId: string): Promise<ExecutionResult> {
    const payload = Buffer.alloc(8);
    payload.writeInt32LE(dx, 0);
    payload.writeInt32LE(dy, 4);
    return this.sendCommand(CMD_MOVE_MOUSE, payload, actionId, 'MouseExecutor');
  }

  public leftClick(down: boolean, up: boolean, actionId: string): Promise<ExecutionResult> {
    const payload = Buffer.alloc(2);
    payload.writeUInt8(down ? 1 : 0, 0);
    payload.writeUInt8(up ? 1 : 0, 1);
    return this.sendCommand(CMD_LEFT_CLICK, payload, actionId, 'MouseExecutor');
  }

  public rightClick(down: boolean, up: boolean, actionId: string): Promise<ExecutionResult> {
    const payload = Buffer.alloc(2);
    payload.writeUInt8(down ? 1 : 0, 0);
    payload.writeUInt8(up ? 1 : 0, 1);
    return this.sendCommand(CMD_RIGHT_CLICK, payload, actionId, 'MouseExecutor');
  }

  public scroll(delta: number, actionId: string): Promise<ExecutionResult> {
    const payload = Buffer.alloc(4);
    payload.writeInt32LE(delta, 0);
    return this.sendCommand(CMD_SCROLL, payload, actionId, 'MouseExecutor');
  }

  public keyDown(vk: number, actionId: string): Promise<ExecutionResult> {
    const payload = Buffer.alloc(2);
    payload.writeUInt16LE(vk, 0);
    return this.sendCommand(CMD_KEY_DOWN, payload, actionId, 'KeyboardExecutor');
  }

  public keyUp(vk: number, actionId: string): Promise<ExecutionResult> {
    const payload = Buffer.alloc(2);
    payload.writeUInt16LE(vk, 0);
    return this.sendCommand(CMD_KEY_UP, payload, actionId, 'KeyboardExecutor');
  }
}
