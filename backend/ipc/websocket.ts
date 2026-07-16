import { WebSocketServer, WebSocket } from 'ws';
import { IPCMessage, IPCEventType } from '@shared/events';
import { ConfigManager } from '../config/ConfigManager';
import { CalibrationManager } from '../calibration/CalibrationManager';
import { CalibrationStorage } from '../calibration/CalibrationStorage';
import { Point3D } from '../calibration/CalibrationMath';
import { CameraManager } from '../camera/CameraManager';
import { TelemetryService, IIPCHandler } from '../telemetry/TelemetryService';
import { TrackingWorker } from '../tracking/TrackingWorker';

export class IPCServer implements IIPCHandler {
  private wss: WebSocketServer;
  private cameraManager: CameraManager;
  private clients: Set<WebSocket> = new Set();
  private lastFrameTimestamp: number = 0;

  constructor(server: any, path: string) {
    this.wss = new WebSocketServer({ server, path });
    this.cameraManager = CameraManager.getInstance();
    TelemetryService.getInstance().setIpcHandler(this);
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected to IPC bridge.');
      this.clients.add(ws);
      
      this.sendToClient(ws, { 
        type: IPCEventType.INFO, 
        message: 'IPC Connected. Daemon listening for gestures.' 
      });

      // Send initial configuration and profiles
      this.sendToClient(ws, { type: IPCEventType.CONFIG_SYNC, payload: ConfigManager.getInstance().getConfig() });
      this.sendToClient(ws, { type: IPCEventType.PROFILE_SYNC, payload: CalibrationStorage.getInstance().getAllProfiles() });

      ws.on('message', async (message: string | Buffer) => {
        if (typeof message === 'string') {
          await this.handleMessage(ws, message);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected from IPC bridge.');
        this.clients.delete(ws);
      });
    });

    // Broadcast raw frames
    this.cameraManager.on('frame', (frame) => {
      const now = Date.now();
      if (now - this.lastFrameTimestamp >= 33) {
        this.lastFrameTimestamp = now;
        const header = Buffer.alloc(8);
        header.writeUInt32LE(frame.width, 0);
        header.writeUInt32LE(frame.height, 4);
        const payload = Buffer.concat([header, frame.data]);
        
        for (const client of this.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload, { binary: true });
          }
        }
      }
    });
  }

  public broadcast(payload: IPCMessage) {
    const data = JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private async handleMessage(ws: WebSocket, message: string) {
    try {
      const data: IPCMessage = JSON.parse(message);
      
      if (data.action === IPCEventType.SIMULATE_GESTURE) {
        const { trigger, targetAction, name } = data.payload;
        this.sendToClient(ws, { type: IPCEventType.INFO, message: `Daemon routing [${trigger}] -> Executing native call: ${targetAction}` });
        setTimeout(() => {
          this.sendToClient(ws, { type: IPCEventType.SUCCESS, message: `System hook confirmed: '${name}' successfully fired.` });
        }, 400);

      } else if (data.action === IPCEventType.ENGINE_STATUS) {
        if (data.payload?.active) {
          await this.startEngines(data.payload.deviceId);
          this.sendToClient(ws, { type: IPCEventType.SUCCESS, message: 'Skeletal Tracking Service enabled via IPC.' });
        } else {
          this.stopEngines();
          this.sendToClient(ws, { type: IPCEventType.WARNING, message: 'Skeletal Tracking Service disabled via IPC.' });
        }
      
      } else if (data.action === IPCEventType.CONFIG_UPDATE) {
        ConfigManager.getInstance().updateConfig(data.payload);
        this.broadcast({ type: IPCEventType.CONFIG_SYNC, payload: ConfigManager.getInstance().getConfig() });
      
      } else if (data.action === IPCEventType.PROFILE_UPDATE) {
        CalibrationStorage.getInstance().setProfile(data.payload);
        CalibrationManager.getInstance().setActiveProfile(data.payload.id);
        this.broadcast({ type: IPCEventType.PROFILE_SYNC, payload: CalibrationStorage.getInstance().getAllProfiles() });

      } else if (data.action === IPCEventType.CALIBRATION_START) {
        CalibrationManager.getInstance().startSampling();

      } else if (data.action === IPCEventType.CALIBRATION_SAMPLE) {
        CalibrationManager.getInstance().addSample(data.payload as Point3D);

      } else if (data.action === IPCEventType.CALIBRATION_FINISH) {
        const workspace = CalibrationManager.getInstance().finishWorkspaceSampling();
        this.sendToClient(ws, { type: IPCEventType.CALIBRATION_FINISH, payload: workspace });

      } else if (data.action === IPCEventType.CAMERA_LIST_REQUEST) {
        try {
          const cameras = await this.cameraManager.enumerateCameras();
          this.sendToClient(ws, {
            type: IPCEventType.CAMERA_LIST_RESPONSE,
            payload: cameras
          });
        } catch (err: any) {
          this.sendToClient(ws, { type: IPCEventType.ERROR, message: err.message });
        }

      } else if (data.action === IPCEventType.CAMERA_START) {
        try {
          const { id, width, height, fps } = data.payload;
          await this.cameraManager.startCamera(id, width, height, fps);
          await this.startEngines(id);
          this.sendToClient(ws, { type: IPCEventType.INFO, message: `Camera ${id} and Vision Engines started successfully.` });
        } catch (err: any) {
          this.sendToClient(ws, { type: IPCEventType.ERROR, message: err.message });
        }

      } else if (data.action === IPCEventType.CAMERA_STOP) {
        this.cameraManager.stopCamera();
        this.stopEngines();
        this.sendToClient(ws, { type: IPCEventType.INFO, message: 'Camera and Vision Engines stopped cleanly.' });
      }

    } catch (err) {
      console.error('Failed to parse IPC message:', err);
    }
  }

  private async startEngines(deviceId: string) {
    await TrackingWorker.getInstance().start();
    const GestureRecognitionWorker = require('../gesture/GestureRecognitionWorker').GestureRecognitionWorker;
    GestureRecognitionWorker.getInstance().start();
    const IntentWorker = require('../intent/IntentWorker').IntentWorker;
    IntentWorker.getInstance().start();
    const ActionMappingWorker = require('../action/ActionMappingWorker').ActionMappingWorker;
    ActionMappingWorker.getInstance().start();
    const ExecutionWorker = require('../executor/ExecutionWorker').ExecutionWorker;
    ExecutionWorker.getInstance().start();
    const TestingOrchestrator = require('../testing/TestingOrchestrator').TestingOrchestrator;
    TestingOrchestrator.getInstance().start();
  }

  private stopEngines() {
    TrackingWorker.getInstance().stop();
    const GestureRecognitionWorker = require('../gesture/GestureRecognitionWorker').GestureRecognitionWorker;
    GestureRecognitionWorker.getInstance().stop();
    const IntentWorker = require('../intent/IntentWorker').IntentWorker;
    IntentWorker.getInstance().stop();
    const ActionMappingWorker = require('../action/ActionMappingWorker').ActionMappingWorker;
    ActionMappingWorker.getInstance().stop();
    const ExecutionWorker = require('../executor/ExecutionWorker').ExecutionWorker;
    ExecutionWorker.getInstance().stop();
    const TestingOrchestrator = require('../testing/TestingOrchestrator').TestingOrchestrator;
    TestingOrchestrator.getInstance().stop();
  }

  private sendToClient(ws: WebSocket, payload: IPCMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}
