import { app, BrowserWindow, Tray, Menu, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import Store from 'electron-store';

const store = new Store();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let daemonProcess: ChildProcess | null = null;
let daemonRestarts = 0;
const MAX_RESTARTS = 3;
let isShuttingDown = false;

const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}

function sendDaemonCommand(action: string, payload?: any) {
  if (daemonProcess && daemonProcess.stdin && !isShuttingDown) {
    try {
      daemonProcess.stdin.write(JSON.stringify({ action, payload }) + '\n');
    } catch (e) {
      console.error(`Failed to send ${action} to daemon`, e);
    }
  }
}

async function startDaemon() {
  if (daemonProcess || isShuttingDown) return;

  // Orphan Reaper: Enforce One Daemon Rule
  await new Promise<void>((resolve) => {
    const cmd = `powershell.exe -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'python' -and $_.CommandLine -match 'daemon.py'} | Stop-Process -Force -ErrorAction SilentlyContinue"`;
    require('child_process').exec(cmd, { windowsHide: true }, () => resolve());
  });

  // Check again after async pause
  if (daemonProcess || isShuttingDown) return;

  const fs = require('fs');
  const isPackaged = app.isPackaged;
  
  const venvPath = isPackaged 
    ? path.join(process.resourcesPath, '.venv/Scripts/pythonw.exe')
    : path.join(__dirname, '../../.venv/Scripts/pythonw.exe');
    
  const pythonPath = fs.existsSync(venvPath) ? venvPath : 'pythonw';
  
  const scriptPath = isPackaged
    ? path.join(process.resourcesPath, 'backend/daemon/daemon.py')
    : path.join(__dirname, '../../backend/daemon/daemon.py');

  daemonProcess = spawn(pythonPath, [scriptPath, '0'], { windowsHide: true });
  
  if (daemonProcess && daemonProcess.stdout) {
    daemonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.event && mainWindow) {
            mainWindow.webContents.send('ipc-broadcast', JSON.stringify({ type: parsed.event, payload: parsed.payload }));
          }
        } catch (e) {
          // Not JSON
        }
      }
    });
  }

  if (daemonProcess && daemonProcess.stderr) {
    daemonProcess.stderr.on('data', (data) => {
      console.error(`[Daemon Error] ${data.toString().trim()}`);
    });
  }

  if (daemonProcess) {
    daemonProcess.on('exit', (code, signal) => {
      daemonProcess = null;
      if (mainWindow && !isShuttingDown) {
        mainWindow.webContents.send('ipc-broadcast', JSON.stringify({ type: 'ENGINE_DIED', payload: { code } }));
      }
    });
  }
}

async function shutdownSequence() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('Initiating graceful shutdown...');
  
  if (daemonProcess && daemonProcess.stdin) {
    try {
      daemonProcess.stdin.write(JSON.stringify({ action: 'STOP_TRACKING' }) + '\n');
      daemonProcess.stdin.write(JSON.stringify({ action: 'CLOSE_CAMERA' }) + '\n');
      daemonProcess.stdin.write('SHUTDOWN\n');
    } catch(e) {}

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('Daemon shutdown timeout exceeded. Force killing.');
        if (daemonProcess) daemonProcess.kill('SIGKILL');
        resolve();
      }, 3000);

      daemonProcess?.once('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  
  daemonProcess = null;
  if (tray) {
    tray.destroy();
    tray = null;
  }
  
  app.quit();
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
    titleBarStyle: 'hidden',
    backgroundColor: '#111111',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

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
  });
}

app.on('ready', () => {
  createWindow();
  
  const iconPath = path.join(__dirname, '../../public/tray-icon.ico');
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    console.warn('Tray icon not found, skipping tray creation.');
  }

  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Dashboard', click: () => createWindow() },
      { type: 'separator' },
      { label: 'Quit', click: () => shutdownSequence() }
    ]);
    tray.setToolTip('Gesture Control Utility');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => createWindow());
  }

  // Daemon will now only start when explicitly commanded by React UI
  
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
  // Overriding default behavior to prevent implicit quit. We handle it in window-close IPC.
});

app.on('before-quit', (e) => {
  if (!isShuttingDown) {
    e.preventDefault();
    shutdownSequence();
  }
});

// Window Controls
ipcMain.on('log-to-main', (event, arg) => {
  console.log(arg);
});
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

// Explicit Engine Commands
  ipcMain.handle('START_ENGINE', () => {
    startDaemon();
  });
ipcMain.handle('STOP_ENGINE', () => {
  sendDaemonCommand('SHUTDOWN');
});


ipcMain.handle('OPEN_CAMERA', () => sendDaemonCommand('OPEN_CAMERA'));
ipcMain.handle('CLOSE_CAMERA', () => sendDaemonCommand('CLOSE_CAMERA'));

ipcMain.handle('START_TRACKING', () => sendDaemonCommand('START_TRACKING'));
ipcMain.handle('STOP_TRACKING', () => sendDaemonCommand('STOP_TRACKING'));
ipcMain.handle('CONFIG', (_event, value) => sendDaemonCommand('CONFIG', value));
ipcMain.handle('CALIBRATION_MODE', (_event, value) => sendDaemonCommand('CALIBRATION_MODE', value));

ipcMain.handle('GET_STATUS', () => {
  if (!daemonProcess) {
    if (mainWindow) {
      mainWindow.webContents.send('ipc-broadcast', JSON.stringify({
        type: 'ENGINE_STATUS',
        payload: { pid: null, camera_open: false, tracking: false }
      }));
    }
  } else {
    sendDaemonCommand('GET_STATUS');
  }
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

ipcMain.handle('start-daemon', () => startDaemon());
ipcMain.handle('stop-daemon', () => sendDaemonCommand('SHUTDOWN'));
ipcMain.handle('get-status', () => daemonProcess !== null);
ipcMain.handle('send-daemon-command', (_event, payload) => {
  try {
    const cmd = JSON.parse(payload);
    sendDaemonCommand(cmd.action, cmd.payload);
  } catch {
    if (daemonProcess && daemonProcess.stdin) {
      daemonProcess.stdin.write(payload + '\n');
    }
  }
});
