import { app, BrowserWindow, Tray, Menu, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { EngineManager } from './engine_manager';

const store = new Store();

// MIGRATION: Restore comfortable workspace defaults
const storedConfig = store.get('appConfig') as any;
if (storedConfig?.calibration?.workingArea) {
  const wa = storedConfig.calibration.workingArea;
  if ((wa.minX === 0.0 && wa.maxX === 1.0 && wa.minY === 0.0 && wa.maxY === 1.0) || 
      (wa.minX === 0.2 && wa.maxX === 0.8 && wa.minY === 0.2 && wa.maxY === 0.8) ||
      (wa.minX === 0.2 && wa.maxX === 0.8 && wa.minY === 0.2 && wa.maxY === 0.7)) {
    // Reset to tighter 0.3-0.7 frame for easy corner access
    storedConfig.calibration.workingArea = { minX: 0.3, maxX: 0.7, minY: 0.3, maxY: 0.7 };
    store.set('appConfig', storedConfig);
  }
}

const engineMgr = EngineManager.getInstance();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isShuttingDown = false;
let electronBuildId = 'unknown';

const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}

async function shutdownSequence() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  const logFile = path.join(app.getPath('userData'), 'logs', 'main.log');
  const writeLog = (msg: string) => {
      console.log(msg);
      try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch(e) {}
  };
  
  writeLog('Initiating graceful application shutdown...');
  writeLog('[Shutdown Audit] Step 1: Stopping Engine...');
  
  await engineMgr.stopEngine();
  
  writeLog('[Shutdown Audit] Step 2: Destroying Tray...');
  if (tray) {
    tray.destroy();
    tray = null;
  }
  
  writeLog('[Shutdown Audit] Step 3: Triggering app.exit(0)...');
  app.exit(0);
}

function createWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    return;
  }

  const defaultBounds = { width: 850, height: 600 };
  const bounds = store.get('windowBounds', defaultBounds) as any;

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 800,
    minHeight: 500,
    show: false,
    frame: false,
    icon: app.isPackaged 
      ? path.join(process.resourcesPath, 'public/tray-icon.ico')
      : path.join(__dirname, '../../public/tray-icon.ico'),
    titleBarStyle: 'hidden',
    backgroundColor: '#111111',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  engineMgr.setMainWindow(mainWindow);

  mainWindow.on('resize', () => {
    if (mainWindow) store.set('windowBounds', mainWindow.getBounds());
  });

  mainWindow.on('move', () => {
    if (mainWindow) store.set('windowBounds', mainWindow.getBounds());
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/dashboard.html');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/dashboard.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    engineMgr.setMainWindow(null);
  });
}

app.on('ready', () => {
  try {
    const fpPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'public/fingerprint.json')
      : path.join(__dirname, '../../public/fingerprint.json');
    if (fs.existsSync(fpPath)) {
      const fp = JSON.parse(fs.readFileSync(fpPath, 'utf8'));
      electronBuildId = fp.BUILD_ID;
      console.log(`[Electron Main] Build Fingerprint: ${electronBuildId}`);
    }
  } catch(e) {
    console.warn('Could not read build fingerprint:', e);
  }
  
  const logFile = path.join(app.getPath('userData'), 'logs', 'main.log');
  const writeLog = (msg: string) => {
      console.log(msg);
      try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch(e) {}
  };

  writeLog('--- RUNTIME VERIFICATION AUDIT ---');
  writeLog(`Executable Path: ${process.execPath}`);
  writeLog(`Current Working Directory: ${process.cwd()}`);
  writeLog(`App Data Directory: ${app.getPath('userData')}`);
  writeLog(`Build ID: ${electronBuildId}`);
  writeLog('----------------------------------');

  createWindow();
  
  const iconPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'public/tray-icon.ico')
    : path.join(__dirname, '../../public/tray-icon.ico');
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    console.warn('Tray icon not found, skipping tray creation.');
  }

  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Dashboard', click: () => createWindow() },
      { type: 'separator' },
      { label: 'Restart Engine', click: () => engineMgr.restartEngine() },
      { type: 'separator' },
      { label: 'Quit', click: () => shutdownSequence() }
    ]);
    tray.setToolTip('Gesture Control Utility');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => createWindow());
  }

  const startWithWindows = store.get('startWithWindows', false) as boolean;
  app.setLoginItemSettings({
    openAtLogin: startWithWindows,
    path: app.getPath('exe')
  });
});

app.on('second-instance', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  // Overriding default behavior to prevent implicit quit.
});

app.on('before-quit', (e) => {
  if (!isShuttingDown) {
    e.preventDefault();
    shutdownSequence();
  }
});

// Window Controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.handle('window-close', () => {
  const minimizeToTray = store.get('minimizeToTray', true) as boolean;
  if (minimizeToTray) {
    if (mainWindow) mainWindow.hide();
  } else {
    shutdownSequence();
  }
});

// Explicit Engine Commands via EngineManager Singleton
ipcMain.handle('START_ENGINE', () => engineMgr.startEngine());
ipcMain.handle('STOP_ENGINE', () => engineMgr.stopEngine());
ipcMain.handle('RESTART_ENGINE', () => engineMgr.restartEngine());

ipcMain.handle('OPEN_CAMERA', () => engineMgr.sendCommand('OPEN_CAMERA'));
ipcMain.handle('CLOSE_CAMERA', () => engineMgr.sendCommand('CLOSE_CAMERA'));
ipcMain.handle('START_TRACKING', () => engineMgr.sendCommand('START_TRACKING'));
ipcMain.handle('STOP_TRACKING', () => engineMgr.sendCommand('STOP_TRACKING'));
ipcMain.handle('CONFIG', (_event, value) => engineMgr.sendCommand('CONFIG', value));
ipcMain.handle('CALIBRATION_MODE', (_event, value) => engineMgr.sendCommand('CALIBRATION_MODE', value));
ipcMain.handle('SET_DRY_RUN', (_event, value) => engineMgr.sendCommand('SET_DRY_RUN', value));
ipcMain.handle('START_VALIDATION_SESSION', () => engineMgr.sendCommand('START_VALIDATION_SESSION'));
ipcMain.handle('STOP_VALIDATION_SESSION', () => engineMgr.sendCommand('STOP_VALIDATION_SESSION'));

// Benchmark tools
ipcMain.handle('START_RECORDING', () => engineMgr.sendCommand('START_RECORDING'));
ipcMain.handle('STOP_RECORDING', () => engineMgr.sendCommand('STOP_RECORDING'));
ipcMain.handle('START_REPLAY', () => engineMgr.sendCommand('START_REPLAY'));
ipcMain.handle('STOP_REPLAY', () => engineMgr.sendCommand('STOP_REPLAY'));

ipcMain.handle('GET_FINGERPRINTS', () => {
  return {
    electron: electronBuildId,
    python: 'daemon-v1'
  };
});

ipcMain.handle('QUIT_APPLICATION', () => shutdownSequence());

// Config Store
ipcMain.handle('store-get', (_event, key) => store.get(key));
ipcMain.handle('store-set', (_event, key, value) => {
  store.set(key, value);
  if (key === 'startWithWindows') {
    app.setLoginItemSettings({
      openAtLogin: value as boolean,
      path: app.getPath('exe')
    });
  }
});
