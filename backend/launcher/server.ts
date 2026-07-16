import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { IPCServer } from '../ipc/websocket';
import { ConfigManager } from '../config/ConfigManager';
import { SystemTrayManager } from '../system/SystemTray';
import { Logger } from '../system/Logger';
import { RecoveryManager } from '../system/RecoveryManager';
import { RuntimeManager } from '../runtime/RuntimeManager';
import { ServiceManager } from '../system/ServiceManager';
import { CameraService } from '../services/CameraService';
import { TrackingService } from '../services/TrackingService';
import { GestureService } from '../services/GestureService';
import { IntentService } from '../services/IntentService';
import { ActionService } from '../services/ActionService';
import { ExecutionService } from '../services/ExecutionService';

const app = express();
const PORT = 3001;

async function startServer() {
  Logger.info('Initializing Configuration...');
  ConfigManager.getInstance();

  const { StartupValidator } = require('../runtime/StartupValidator');
  const isHealthy = await StartupValidator.verifySystem();
  if (!isHealthy) {
    Logger.error('Startup validation failed. Halting boot sequence.');
    process.exit(1);
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Gesture Control Command Center Daemon' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    Logger.info(`Server running on http://localhost:${PORT}`);
  });

  new IPCServer(server, '/api/ws');

  // Boot the Runtime Architecture
  const svcManager = ServiceManager.getInstance();
  svcManager.registerService(new CameraService());
  svcManager.registerService(new TrackingService());
  svcManager.registerService(new GestureService());
  svcManager.registerService(new IntentService());
  svcManager.registerService(new ActionService());
  svcManager.registerService(new ExecutionService());

  await RuntimeManager.getInstance().boot();

  // Initialize System Tray
  SystemTrayManager.getInstance().start(PORT);
  
  // Start Recovery Watchdog
  RecoveryManager.getInstance().start();
}

boot().catch(err => {
  Logger.error('Fatal server boot error', err);
  process.exit(1);
});
