import { LandmarkBus } from '../tracking/LandmarkBus';
import { GestureBus } from '../gesture/GestureBus';
import { IntentBus } from '../intent/IntentBus';
import { CameraManager } from '../camera/CameraManager';
import { TrackingWorker } from '../tracking/TrackingWorker';
import { GestureDiagnostics } from '../gesture/GestureDiagnostics';
import { IntentDiagnostics } from '../intent/IntentDiagnostics';
import { IPCMessage, IPCEventType } from '@shared/events';

// Abstracted IPC Interface so Telemetry doesn't depend directly on WebSocketServer details
export interface IIPCHandler {
  broadcast(msg: IPCMessage): void;
}

export class TelemetryService {
  private static instance: TelemetryService;
  private ipcHandler: IIPCHandler | null = null;
  private interval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
      TelemetryService.instance.initialize();
    }
    return TelemetryService.instance;
  }

  public setIpcHandler(handler: IIPCHandler) {
    this.ipcHandler = handler;
  }

  private initialize() {
    // 1. Subscribe to tracking frames and route directly to IPC
    LandmarkBus.getInstance().subscribe((frame) => {
      if (this.ipcHandler) {
        this.ipcHandler.broadcast({
          type: (IPCEventType as any).TRACKING_LANDMARKS,
          payload: frame
        });
      }
    });

    // 2. Subscribe to gesture frames and route to IPC
    GestureBus.getInstance().subscribe((frame) => {
      if (this.ipcHandler) {
        this.ipcHandler.broadcast({
          type: (IPCEventType as any).GESTURE_FRAME,
          payload: frame
        });
      }
    });

    // 3. Subscribe to intent frames and route to IPC
    IntentBus.getInstance().subscribe((frame) => {
      if (this.ipcHandler) {
        this.ipcHandler.broadcast({
          type: (IPCEventType as any).INTENT_FRAME,
          payload: frame
        });
      }
    });

    // 4. Subscribe to action frames and route to IPC
    const ActionBus = require('../action/ActionBus').ActionBus;
    ActionBus.getInstance().subscribe((action: any) => {
      if (this.ipcHandler) {
        this.ipcHandler.broadcast({
          type: (IPCEventType as any).ACTION_FRAME,
          payload: action
        });
      }
    });

    // 5. Poll metrics at 10Hz (100ms)
    this.interval = setInterval(() => {
      this.broadcastDiagnostics();
    }, 100);
  }

  private broadcastDiagnostics() {
    if (!this.ipcHandler) return;

    const cameraMetrics = CameraManager.getInstance().getTelemetry();
    let trackingMetrics = null;
    let gestureMetrics = null;
    let intentMetrics = null;
    let actionMetrics = null;
    let executionMetrics = null;
    let testingMetrics = null;
    
    try {
      trackingMetrics = TrackingWorker.getInstance().getDiagnostics();
    } catch (e) {}
    
    try {
      gestureMetrics = GestureDiagnostics.getInstance().getTelemetry();
    } catch (e) {}

    try {
      intentMetrics = IntentDiagnostics.getInstance().getTelemetry();
    } catch (e) {}

    try {
      const ActionDiagnostics = require('../action/ActionDiagnostics').ActionDiagnostics;
      actionMetrics = ActionDiagnostics.getInstance().getTelemetry();
    } catch (e) {}

    try {
      const ExecutionDiagnostics = require('../executor/ExecutionDiagnostics').ExecutionDiagnostics;
      executionMetrics = ExecutionDiagnostics.getInstance().getTelemetry();
    } catch (e) {}

    try {
      const FPSSynchronizer = require('../testing/FPSSynchronizer').FPSSynchronizer;
      const MemoryMonitor = require('../testing/MemoryMonitor').MemoryMonitor;
      const LatencyProfiler = require('../testing/LatencyProfiler').LatencyProfiler;
      const QueueMonitor = require('../testing/QueueMonitor').QueueMonitor;

      testingMetrics = {
        fps: FPSSynchronizer.getInstance().getFPS(),
        memory: MemoryMonitor.getInstance().getStats(),
        latencies: LatencyProfiler.getInstance().getAllMetrics(),
        queues: QueueMonitor.getInstance().getStatus()
      };
    } catch (e) {}

    const { ServiceManager } = require('../system/ServiceManager');
    let runtimeMetrics = null;
    try {
      runtimeMetrics = ServiceManager.getInstance().getAllServices().map((s: any) => ({
        name: s.name,
        state: s.state,
        health: s.health,
        metrics: s.metrics
      }));
    } catch (e) {}

    const payload = {
      camera: cameraMetrics,
      tracking: trackingMetrics,
      gesture: gestureMetrics,
      intent: intentMetrics,
      action: actionMetrics,
      execution: executionMetrics,
      testing: testingMetrics,
      runtime: runtimeMetrics
    };

    this.ipcHandler.broadcast({
      type: IPCEventType.CAMERA_TELEMETRY,
      payload
    });
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}


