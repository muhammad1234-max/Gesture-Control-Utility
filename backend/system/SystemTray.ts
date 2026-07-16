import SysTray from 'systray2';
import { Logger } from './Logger';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export class SystemTrayManager {
  private static instance: SystemTrayManager;
  private tray: any = null;

  private constructor() {}

  public static getInstance(): SystemTrayManager {
    if (!SystemTrayManager.instance) {
      SystemTrayManager.instance = new SystemTrayManager();
    }
    return SystemTrayManager.instance;
  }

  public async start(port: number) {
    try {
      const iconPath = path.join(process.cwd(), 'public', 'tray-icon.ico');
      
      // Fallback if no custom icon yet, sysTray will just show a default empty space or square if empty
      // but systray2 requires base64 or a valid icon file path. Let's use a dummy base64 if no file.
      let iconBase64 = '';
      if (fs.existsSync(iconPath)) {
        iconBase64 = fs.readFileSync(iconPath, 'base64');
      }

      const itemOpen = {
        title: 'Open Dashboard',
        tooltip: 'Open Dashboard',
        checked: false,
        enabled: true
      };

      const itemQuit = {
        title: 'Quit',
        tooltip: 'Quit Gesture Control',
        checked: false,
        enabled: true
      };

      this.tray = new SysTray({
        menu: {
          icon: iconBase64,
          title: 'Gesture Control',
          tooltip: 'Gesture Control Command Center',
          items: [
            itemOpen,
            SysTray.separator,
            itemQuit
          ]
        },
        debug: false,
        copyDir: true // copies binaries to temp dir
      });

      this.tray.onClick((action: any) => {
        if (action.seq_id === itemOpen.seq_id) {
          this.openBrowser(`http://localhost:${port}`);
        } else if (action.seq_id === itemQuit.seq_id) {
          Logger.info('Quit requested from System Tray');
          this.tray.kill(false);
          process.exit(0);
        }
      });

      this.tray.ready().then(() => {
        Logger.info('System Tray initialized successfully.');
      }).catch((err: any) => {
        Logger.warn('System Tray failed to initialize (this is normal in headless environments)', { error: err.message });
      });

    } catch (e: any) {
      Logger.error('Failed to setup System Tray', { error: e.message });
    }
  }

  public stop() {
    if (this.tray) {
      this.tray.kill(false);
      this.tray = null;
    }
  }

  private openBrowser(url: string) {
    const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
    exec(`${start} ${url}`);
  }
}
