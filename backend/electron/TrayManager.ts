import { app, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { WindowManager } from './WindowManager';
import { Logger } from '../system/Logger';
import { TrackingWorker } from '../tracking/TrackingWorker';
import { CameraManager } from '../camera/CameraManager';
import { ConfigManager } from '../config/ConfigManager';

export class TrayManager {
  private static instance: TrayManager;
  private tray: Tray | null = null;
  private isTrackingPaused: boolean = false;

  private constructor() {}

  public static getInstance(): TrayManager {
    if (!TrayManager.instance) {
      TrayManager.instance = new TrayManager();
    }
    return TrayManager.instance;
  }

  public initialize() {
    const basePath = app.isPackaged ? process.resourcesPath : process.cwd();
    let iconPath = path.join(basePath, 'public', 'tray-icon.ico');
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(process.resourcesPath, 'tray-icon.ico');
    }
    
    // Fallback if icon doesn't exist
    const icon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    
    this.tray.setToolTip('Gesture Control');
    
    this.tray.on('double-click', () => {
      WindowManager.getInstance().createDashboardWindow();
    });

    this.updateContextMenu();
    Logger.info('Tray initialized.');
  }

  private updateContextMenu() {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Dashboard',
        click: () => WindowManager.getInstance().createDashboardWindow()
      },
      {
        label: 'Settings',
        click: () => WindowManager.getInstance().createSettingsWindow()
      },
      {
        label: 'Overlay',
        click: () => WindowManager.getInstance().createOverlayWindow()
      },
      { type: 'separator' },
      {
        label: this.isTrackingPaused ? 'Resume Tracking' : 'Pause Tracking',
        click: async () => {
          this.isTrackingPaused = !this.isTrackingPaused;
          if (this.isTrackingPaused) {
            CameraManager.getInstance().stopCamera();
            TrackingWorker.getInstance().stop();
          } else {
            const config = ConfigManager.getInstance().getConfig();
            const deviceId = config.camera.deviceId || '0';
            try {
              await CameraManager.getInstance().startCamera(deviceId, 640, 480, 30);
              TrackingWorker.getInstance().start();
            } catch (err) {
              Logger.error('Failed to restart camera from tray resume', { error: err });
            }
          }
          this.updateContextMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          WindowManager.getInstance().exit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }
}
