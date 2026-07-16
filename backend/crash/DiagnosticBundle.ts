import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../system/Logger';
import { PathManager } from '../system/PathManager';

const execAsync = promisify(exec);

export class DiagnosticBundle {
  /**
   * Automatically creates logs/, config/, crash/ into a single ZIP for troubleshooting.
   */
  public static async generate(incidentId: string): Promise<string> {
    const pm = PathManager.getInstance();
    const bundleRoot = path.join(pm.tempDir, `bundle_${incidentId}`);
    const zipPath = path.join(pm.reportsDir, `DiagnosticBundle_${incidentId}.zip`);

    try {
      Logger.info(`Generating diagnostic bundle: ${incidentId}`);
      fs.mkdirSync(bundleRoot, { recursive: true });

      const targets = [
        { src: pm.logsDir, dest: 'runtime/logs' },
        { src: pm.getConfigPath(), dest: 'runtime/config.json' },
        { src: pm.getCalibrationPath(), dest: 'runtime/calibrations.json' },
        { src: path.join(process.cwd(), 'release-manifest.json'), dest: 'app/release-manifest.json' },
        { src: pm.profilesDir, dest: 'runtime/profiles' },
        { src: pm.pluginsDir, dest: 'runtime/plugins' }
      ];

      for (const target of targets) {
        const srcPath = path.join(process.cwd(), target.src);
        const destPath = path.join(bundleRoot, target.dest);
        if (!fs.existsSync(srcPath)) continue;

        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
          this.copyDirectory(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Generate System Info
      const sysInfo = {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        env: process.env.NODE_ENV || 'production',
        time: new Date().toISOString()
      };
      fs.writeFileSync(path.join(bundleRoot, 'system-info.json'), JSON.stringify(sysInfo, null, 2));

      // Compress to ZIP using built-in tar (available in Windows 10+ and macOS/Linux)
      // tar.exe -a -c -f output.zip inputDir\*
      if (process.platform === 'win32') {
        await execAsync(`tar.exe -a -c -f "${zipPath}" "${bundleRoot}\\*"`);
      } else {
        // Fallback for *nix just in case
        await execAsync(`zip -r "${zipPath}" "${bundleRoot}"`);
      }

      // Cleanup raw bundle directory
      fs.rmSync(bundleRoot, { recursive: true, force: true });
      Logger.info(`Diagnostic bundle created at ${zipPath}`);
      return zipPath;
      
    } catch (err: any) {
      Logger.error(`Failed to generate diagnostic bundle`, { error: err.message });
      throw err;
    }
  }

  private static copyDirectory(src: string, dest: string) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      entry.isDirectory() ? this.copyDirectory(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
    }
  }
}
