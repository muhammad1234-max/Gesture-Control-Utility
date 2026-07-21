import { globalShortcut, Notification, dialog, app } from 'electron';
import { WindowManager } from './WindowManager';
import { TrayManager } from './TrayManager';
import { Logger } from '../system/Logger';

export class NativeIntegration {
  public static initialize() {
    this.registerHotkeys();
    Logger.info('Native integrations initialized.');
  }

  private static registerHotkeys() {
    // Example: Toggle Overlay
    globalShortcut.register('CommandOrControl+Shift+O', () => {
      WindowManager.getInstance().createOverlayWindow();
    });

    // Example: Open Dashboard
    globalShortcut.register('CommandOrControl+Shift+D', () => {
      WindowManager.getInstance().createDashboardWindow();
    });
  }

  public static unregisterHotkeys() {
    globalShortcut.unregisterAll();
  }

  public static showNotification(title: string, body: string) {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  }

  public static async showOpenDialog(options: Electron.OpenDialogOptions) {
    const win = WindowManager.getInstance().getWindow('dashboard');
    if (win) {
      return await dialog.showOpenDialog(win, options);
    }
    return await dialog.showOpenDialog(options);
  }

  public static async showSaveDialog(options: Electron.SaveDialogOptions) {
    const win = WindowManager.getInstance().getWindow('dashboard');
    if (win) {
      return await dialog.showSaveDialog(win, options);
    }
    return await dialog.showSaveDialog(options);
  }
}
