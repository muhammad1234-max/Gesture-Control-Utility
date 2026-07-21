import { app, BrowserWindow, screen } from 'electron';
import path from 'path';

const Store = require('electron-store');
const store = new Store();

export class WindowManager {
  private static instance: WindowManager;
  private windows: Map<string, BrowserWindow> = new Map();

  private constructor() {}

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  public getWindow(name: string): BrowserWindow | undefined {
    return this.windows.get(name);
  }

  public createDashboardWindow() {
    if (this.windows.has('dashboard')) {
      const win = this.windows.get('dashboard')!;
      if (win.isMinimized()) win.restore();
      win.focus();
      return;
    }

    const bounds = store.get('windowBounds.dashboard', { width: 1200, height: 800 }) as any;

    const win = new BrowserWindow({
      ...bounds,
      minWidth: 800,
      minHeight: 600,
      title: 'Gesture Control Dashboard',
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs')
      }
    });

    win.on('ready-to-show', () => win.show());

    win.on('close', (e) => {
      // Tray first architecture - prevent closing, just hide
      e.preventDefault();
      win.hide();
    });

    win.on('resized', () => this.saveBounds('dashboard', win));
    win.on('moved', () => this.saveBounds('dashboard', win));

    this.loadURL(win, 'dashboard.html');
    this.windows.set('dashboard', win);
  }

  public createSettingsWindow() {
    if (this.windows.has('settings')) {
      const win = this.windows.get('settings')!;
      if (win.isMinimized()) win.restore();
      win.focus();
      return;
    }

    const win = new BrowserWindow({
      width: 800,
      height: 700,
      title: 'Settings',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs')
      }
    });

    win.on('closed', () => this.windows.delete('settings'));

    this.loadURL(win, 'settings.html');
    this.windows.set('settings', win);
  }

  public createOverlayWindow() {
    if (this.windows.has('overlay')) {
      const win = this.windows.get('overlay')!;
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
      }
      return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const win = new BrowserWindow({
      width: 400,
      height: 300,
      x: width - 420,
      y: 20,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs')
      }
    });

    win.setIgnoreMouseEvents(true, { forward: true });

    win.on('closed', () => this.windows.delete('overlay'));

    this.loadURL(win, 'overlay.html');
    this.windows.set('overlay', win);
  }

  public hideAllWindows() {
    this.windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.hide();
      }
    });
  }

  public exit() {
    this.windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.removeAllListeners('close');
        win.close();
      }
    });
    app.quit();
  }

  private saveBounds(name: string, win: BrowserWindow) {
    if (!win.isDestroyed() && !win.isFullScreen() && !win.isMaximized()) {
      store.set(`windowBounds.${name}`, win.getBounds());
    }
  }

  private loadURL(win: BrowserWindow, htmlFile: string) {
    if (process.env.NODE_ENV === 'development') {
      // In dev mode, Vite serves the multiple entry points
      win.loadURL(`http://localhost:5173/${htmlFile}`);
    } else {
      win.loadFile(path.join(__dirname, '..', htmlFile));
    }
  }
}
