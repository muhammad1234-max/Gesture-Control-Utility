import { BrowserWindow, app } from 'electron';
import { spawn, ChildProcess, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export type EngineSubstate = 'OFF' | 'STARTING' | 'READY' | 'STOPPING' | 'ERROR';
export type CameraSubstate = 'DISCONNECTED' | 'CONNECTING' | 'READY' | 'ERROR';
export type TrackingSubstate = 'IDLE' | 'WARMING_UP' | 'DETECTING' | 'TRACKING' | 'LOST';

export type HealthBadge = 'HEALTHY' | 'WARNING' | 'RECOVERING' | 'FAILED';

export interface StructuredLog {
  timestamp: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  subsystem: 'Engine' | 'Camera' | 'Tracking' | 'IPC' | 'Daemon';
  message: string;
  metadata?: Record<string, any>;
}

export class EngineManager {
  private static instance: EngineManager;
  private daemonProcess: ChildProcess | null = null;
  private daemonPid: number | null = null;

  // Subsystem States
  private engineState: EngineSubstate = 'OFF';
  private cameraState: CameraSubstate = 'DISCONNECTED';
  private trackingState: TrackingSubstate = 'IDLE';

  private commandQueue: Array<{ fn: () => Promise<void>, resolve: () => void, reject: (err: any) => void }> = [];
  private isProcessingQueue = false;
  private manualStop = false;

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeatTime: number = 0;
  private mainWindow: BrowserWindow | null = null;
  private isShuttingDown: boolean = false;
  private logsDir: string = '';
  private pidFilePath: string = '';
  private recentExceptionsCount: number = 0;

  private constructor() {
    this.logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    this.pidFilePath = path.join(this.logsDir, 'daemon.pid');
  }

  public static getInstance(): EngineManager {
    if (!EngineManager.instance) {
      EngineManager.instance = new EngineManager();
    }
    return EngineManager.instance;
  }

  public setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
  }

  public getSubsystems() {
    return {
      engine: this.engineState,
      camera: this.cameraState,
      tracking: this.trackingState
    };
  }

  // FIFO Command Queue Executor
  public queueCommand(commandFn: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.commandQueue.push({ fn: commandFn, resolve, reject });
      this.processCommandQueue();
    });
  }

  private async processCommandQueue() {
    if (this.isProcessingQueue || this.commandQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.commandQueue.length > 0) {
      const nextCmd = this.commandQueue.shift();
      if (nextCmd) {
        try {
          await nextCmd.fn();
          nextCmd.resolve();
        } catch (err: any) {
          this.logStructured('ERROR', 'Engine', `Command queue error: ${err.message}`);
          nextCmd.reject(err);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  // Structured Logging System
  public logStructured(severity: 'INFO' | 'WARN' | 'ERROR', subsystem: 'Engine' | 'Camera' | 'Tracking' | 'IPC' | 'Daemon', message: string, metadata?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const entry: StructuredLog = { timestamp, severity, subsystem, message, metadata };
    
    console.log(`[${timestamp.slice(11, 19)}] [${severity}] [${subsystem}] ${message}`);
    this.appendLogFile('engine.log', entry);
    this.broadcast('ENGINE_LOG', entry);
  }

  private appendLogFile(filename: string, entry: StructuredLog) {
    try {
      const filePath = path.join(this.logsDir, filename);
      const formatted = JSON.stringify(entry) + '\n';

      // 5MB Rotation
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 5 * 1024 * 1024) {
          const backup = `${filePath}.1`;
          if (fs.existsSync(backup)) fs.unlinkSync(backup);
          fs.renameSync(filePath, backup);
        }
      }
      fs.appendFileSync(filePath, formatted);
    } catch (e) {}
  }

  private setSubsystemStates(engine?: EngineSubstate, camera?: CameraSubstate, tracking?: TrackingSubstate, milestone?: string) {
    const oldEngine = this.engineState;
    if (engine) this.engineState = engine;
    if (camera) this.cameraState = camera;
    if (tracking) this.trackingState = tracking;

    if (engine && oldEngine !== engine) {
        this.logStructured('INFO', 'Engine', `[State Machine Audit] ${oldEngine} -> ${engine} | Reason: ${milestone || 'State transition'}`);
    }

    this.broadcast('SUBSYSTEM_STATE_CHANGED', {
      subsystems: this.getSubsystems(),
      milestone: milestone || ''
    });
  }

  private broadcast(event: string, payload: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('ipc-broadcast', JSON.stringify({ type: event, payload }));
    }
  }

  public async startEngine(): Promise<void> {
    return this.queueCommand(async () => {
      this.manualStop = false;
      if (this.engineState === 'READY') {
        this.logStructured('WARN', 'Engine', 'Start requested while engine is already READY. Skipping.');
        return;
      }

      this.setSubsystemStates('STARTING', 'CONNECTING', 'IDLE', '[✓] Starting Engine');
      await this.killStaleDaemonProcesses();

      const isPackaged = app.isPackaged;
      const venvPath = isPackaged 
        ? path.join(process.resourcesPath, '.venv/Scripts/pythonw.exe')
        : path.join(__dirname, '../../.venv/Scripts/pythonw.exe');
        
      const pythonPath = fs.existsSync(venvPath) ? venvPath : 'pythonw';
      const scriptPath = isPackaged
        ? path.join(process.resourcesPath, 'backend/daemon/daemon.py')
        : path.join(__dirname, '../../backend/daemon/daemon.py');

      this.logStructured('INFO', 'Engine', `Spawning daemon: ${pythonPath}`);

      try {
        this.daemonProcess = spawn(pythonPath, [scriptPath, '0'], { windowsHide: true });
        this.daemonPid = this.daemonProcess.pid || null;
        if (this.daemonPid) this.writePidFile(this.daemonPid);

        this.setSubsystemStates('STARTING', 'CONNECTING', 'WARMING_UP', '[✓] Loading AI Models & Motion Engine');
        this.setupProcessListeners();
        this.startHeartbeatWatchdog();
      } catch (err: any) {
        this.setSubsystemStates('ERROR', 'ERROR', 'IDLE', 'Engine Spawn Error');
        this.logStructured('ERROR', 'Engine', `Spawn failed: ${err.message}`);
      }
    });
  }

  // Step 8: Ordered Graceful Shutdown
  public async stopEngine(): Promise<void> {
    return this.queueCommand(async () => {
      if (this.engineState === 'OFF') return;

      this.manualStop = true;
      this.logStructured('INFO', 'Engine', 'Executing ordered graceful shutdown...');
      this.setSubsystemStates('STOPPING', 'DISCONNECTED', 'IDLE', 'Stopping System');
      this.stopHeartbeatWatchdog();

      if (this.daemonProcess) {
        try {
          if (this.daemonProcess.stdin) {
            // Step 8 & 9: Release all mouse & keyboard inputs before exit
            this.daemonProcess.stdin.write(JSON.stringify({ action: 'RELEASE_ALL_INPUTS' }) + '\n');
            this.daemonProcess.stdin.write(JSON.stringify({ action: 'STOP_TRACKING' }) + '\n');
            this.daemonProcess.stdin.write(JSON.stringify({ action: 'CLOSE_CAMERA' }) + '\n');
            this.daemonProcess.stdin.write('SHUTDOWN\n');
          }
        } catch (e) {}

        await new Promise<void>((resolve) => {
          const killTimer = setTimeout(() => {
            if (this.daemonProcess) {
              this.logStructured('WARN', 'Engine', `Force killing PID ${this.daemonProcess.pid}`);
              try { this.daemonProcess.kill('SIGKILL'); } catch (e) {}
            }
            resolve();
          }, 1500);

          if (this.daemonProcess) {
            this.daemonProcess.once('exit', () => {
              clearTimeout(killTimer);
              resolve();
            });
          } else {
            clearTimeout(killTimer);
            resolve();
          }
        });
      }

      this.daemonProcess = null;
      this.daemonPid = null;
      this.deletePidFile();
      this.setSubsystemStates('OFF', 'DISCONNECTED', 'IDLE', 'System Stopped');
    });
  }

  public async restartEngine(): Promise<void> {
    return this.queueCommand(async () => {
      this.logStructured('INFO', 'Engine', 'Executing Engine Restart...');
      this.manualStop = true;
      
      this.logStructured('INFO', 'Engine', 'Executing ordered graceful shutdown for restart...');
      this.setSubsystemStates('STOPPING', 'DISCONNECTED', 'IDLE', 'Stopping System');
      this.stopHeartbeatWatchdog();

      if (this.daemonProcess) {
        try {
          if (this.daemonProcess.stdin) {
            this.daemonProcess.stdin.write(JSON.stringify({ action: 'RELEASE_ALL_INPUTS' }) + '\n');
            this.daemonProcess.stdin.write(JSON.stringify({ action: 'STOP_TRACKING' }) + '\n');
            this.daemonProcess.stdin.write(JSON.stringify({ action: 'CLOSE_CAMERA' }) + '\n');
            this.daemonProcess.stdin.write('SHUTDOWN\n');
          }
        } catch (e) {}

        await new Promise<void>((resolve) => {
          const killTimer = setTimeout(() => {
            if (this.daemonProcess) {
              try { this.daemonProcess.kill('SIGKILL'); } catch (e) {}
            }
            resolve();
          }, 1500);

          if (this.daemonProcess) {
            this.daemonProcess.once('exit', () => {
              clearTimeout(killTimer);
              resolve();
            });
          } else {
            clearTimeout(killTimer);
            resolve();
          }
        });
      }

      this.daemonProcess = null;
      this.daemonPid = null;
      this.deletePidFile();
      this.setSubsystemStates('OFF', 'DISCONNECTED', 'IDLE', 'System Stopped for Restart');

      await new Promise(r => setTimeout(r, 400));
      
      this.manualStop = false;
      this.setSubsystemStates('STARTING', 'CONNECTING', 'IDLE', '[✓] Starting Engine');
      await this.killStaleDaemonProcesses();

      const isPackaged = app.isPackaged;
      const venvPath = isPackaged 
        ? path.join(process.resourcesPath, '.venv/Scripts/pythonw.exe')
        : path.join(__dirname, '../../.venv/Scripts/pythonw.exe');
        
      const pythonPath = fs.existsSync(venvPath) ? venvPath : 'pythonw';
      const scriptPath = isPackaged
        ? path.join(process.resourcesPath, 'backend/daemon/daemon.py')
        : path.join(__dirname, '../../backend/daemon/daemon.py');

      this.logStructured('INFO', 'Engine', `Spawning daemon: ${pythonPath}`);

      try {
        this.daemonProcess = spawn(pythonPath, [scriptPath, '0'], { windowsHide: true });
        this.daemonPid = this.daemonProcess.pid || null;
        if (this.daemonPid) this.writePidFile(this.daemonPid);

        this.setSubsystemStates('STARTING', 'CONNECTING', 'WARMING_UP', '[✓] Loading AI Models & Motion Engine');
        this.setupProcessListeners();
        this.startHeartbeatWatchdog();
      } catch (err: any) {
        this.setSubsystemStates('ERROR', 'ERROR', 'IDLE', 'Engine Spawn Error');
        this.logStructured('ERROR', 'Engine', `Spawn failed: ${err.message}`);
      }
    });
  }

  private setupProcessListeners() {
    if (!this.daemonProcess) return;

    if (this.daemonProcess.stdout) {
      this.daemonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (this.manualStop) continue; // Ignore stray heartbeats if we are explicitly stopping

            if (parsed.event === 'HEARTBEAT') {
              this.lastHeartbeatTime = Date.now();
              this.setSubsystemStates('READY', 'READY', 'TRACKING', '[✓] Ready');
              this.broadcast('HEARTBEAT', parsed.payload);
            } else if (parsed.event === 'ENGINE_STATE_CHANGED' && parsed.payload) {
              const { state, message } = parsed.payload;
              if (state === 'READY') {
                this.setSubsystemStates('READY', 'READY', 'TRACKING', '[✓] System Ready');
              }
            } else if (parsed.event) {
              this.broadcast(parsed.event, parsed.payload);
            }
          } catch (e) {}
        }
      });
    }

    if (this.daemonProcess.stderr) {
      this.daemonProcess.stderr.on('data', (data) => {
        const errText = data.toString().trim();
        this.logStructured('ERROR', 'Daemon', errText);
      });
    }

    this.daemonProcess.on('exit', (code) => {
      this.logStructured('WARN', 'Daemon', `Daemon process exited with code ${code}`);
      this.daemonProcess = null;
      this.daemonPid = null;
      this.deletePidFile();
      this.stopHeartbeatWatchdog();

      if (!this.isShuttingDown && this.engineState !== 'STOPPING' && this.engineState !== 'OFF' && !this.manualStop) {
        this.setSubsystemStates('ERROR', 'DISCONNECTED', 'IDLE', `Process Exited (${code})`);
      }
    });
  }

  private startHeartbeatWatchdog() {
    this.stopHeartbeatWatchdog();
    this.lastHeartbeatTime = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (this.engineState === 'READY') {
        const elapsed = Date.now() - this.lastHeartbeatTime;
        if (elapsed > 3500) {
          this.logStructured('WARN', 'Engine', `Heartbeat lost for ${(elapsed / 1000).toFixed(1)}s! Reconnecting...`);
          this.restartEngine();
        }
      }
    }, 1000);
  }

  private stopHeartbeatWatchdog() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private writePidFile(pid: number) {
    try { fs.writeFileSync(this.pidFilePath, pid.toString(), 'utf8'); } catch (e) {}
  }

  private deletePidFile() {
    try { if (fs.existsSync(this.pidFilePath)) fs.unlinkSync(this.pidFilePath); } catch (e) {}
  }

  private async killStaleDaemonProcesses(): Promise<void> {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        const cmd = `powershell.exe -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'python' -and $_.CommandLine -match 'daemon.py'} | Stop-Process -Force -ErrorAction SilentlyContinue"`;
        execSync(cmd, { stdio: 'ignore' });
      }
      resolve();
    });
  }

  public sendCommand(action: string, payload?: any) {
    if (this.daemonProcess && this.daemonProcess.stdin) {
      try {
        this.daemonProcess.stdin.write(JSON.stringify({ action, payload }) + '\n');
        this.logStructured('INFO', 'IPC', `Command Sent: ${action}`);
      } catch (e: any) {
        this.logStructured('ERROR', 'IPC', `Failed command ${action}: ${e.message}`);
      }
    }
  }
}
