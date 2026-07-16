import fs from 'fs';
import path from 'path';
import { Logger } from '../system/Logger';
import { RuntimeManager } from '../runtime/RuntimeManager';
import { PathManager } from '../system/PathManager';

export interface PluginManifest {
  name: string;
  version: string;
  apiVersion: string;
  capabilities: string[];
  permissions: string[];
  dependencies: string[];
  signature: string;
  memoryLimitMb: number;
  minRuntimeVersion: string;
  maxRuntimeVersion: string;
  requiredServices: string[];
  compatibleChannels: string[];
}

export interface IPlugin {
  manifest: PluginManifest;
  load(): Promise<boolean>;
  unload(): Promise<boolean>;
}

export class PluginManager {
  private static instance: PluginManager;
  private pluginsDir: string;
  private activePlugins: Map<string, IPlugin> = new Map();

  private constructor() {
    this.pluginsDir = PathManager.getInstance().pluginsDir;
  }

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  public async loadAllPlugins() {
    if (!fs.existsSync(this.pluginsDir)) return;
    const pluginFolders = fs.readdirSync(this.pluginsDir);
    for (const folder of pluginFolders) {
      await this.loadPlugin(folder);
    }
  }

  public async loadPlugin(pluginId: string): Promise<boolean> {
    try {
      const manifestPath = path.join(this.pluginsDir, pluginId, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        Logger.warn(`Plugin ${pluginId} missing manifest.json`);
        return false;
      }

      const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      const rejectionReason = this.validateSandbox(manifest);
      if (rejectionReason) {
        Logger.error(`Plugin ${manifest.name} rejected: ${rejectionReason}`);
        return false;
      }

      const entryFile = path.join(this.pluginsDir, pluginId, 'index.js');
      if (fs.existsSync(entryFile)) {
        const pluginModule = require(entryFile);
        const pluginInstance: IPlugin = new pluginModule.default();
        
        await pluginInstance.load();
        this.activePlugins.set(manifest.name, pluginInstance);
        
        Logger.info(`Loaded Plugin: ${manifest.name} v${manifest.version}`);
        RuntimeManager.getInstance().onPluginLoaded.forEach(cb => cb(manifest.name));
        return true;
      }
    } catch (err: any) {
      Logger.error(`Failed to load plugin ${pluginId}`, { error: err.message });
    }
    return false;
  }

  public async unloadPlugin(pluginName: string): Promise<boolean> {
    const plugin = this.activePlugins.get(pluginName);
    if (!plugin) return false;

    try {
      await plugin.unload();
      this.activePlugins.delete(pluginName);
      
      Logger.info(`Unloaded Plugin: ${pluginName}`);
      RuntimeManager.getInstance().onPluginUnloaded.forEach(cb => cb(pluginName));
      return true;
    } catch (err: any) {
      Logger.error(`Failed to unload plugin ${pluginName}`, { error: err.message });
      return false;
    }
  }

  public async reloadPlugin(pluginName: string): Promise<boolean> {
    Logger.info(`Reloading plugin: ${pluginName}...`);
    const unloaded = await this.unloadPlugin(pluginName);
    if (!unloaded) return false;
    
    const pluginId = pluginName.toLowerCase().replace(/\s+/g, '-');
    const entryFile = path.join(this.pluginsDir, pluginId, 'index.js');
    if (require.cache[require.resolve(entryFile)]) {
      delete require.cache[require.resolve(entryFile)];
    }

    return await this.loadPlugin(pluginId);
  }

  private validateSandbox(manifest: PluginManifest): string | null {
    if (!manifest.signature) return 'Missing cryptographic signature';
    if (manifest.apiVersion !== '1.0.0') return `Unsupported API version ${manifest.apiVersion}`;
    if (manifest.memoryLimitMb > 512) return `Excessive memory limit requested (${manifest.memoryLimitMb}MB)`;

    const { ReleaseManager } = require('../release/ReleaseManager');
    const currentVersion = ReleaseManager.getInstance().getVersion();
    const { VersionManager } = require('../release/VersionManager');

    if (manifest.minRuntimeVersion && VersionManager.compareSemver(currentVersion, manifest.minRuntimeVersion) < 0) {
      return `Requires Runtime >= ${manifest.minRuntimeVersion} (Current: ${currentVersion})`;
    }

    if (manifest.maxRuntimeVersion && VersionManager.compareSemver(currentVersion, manifest.maxRuntimeVersion) > 0) {
      return `Requires Runtime <= ${manifest.maxRuntimeVersion} (Current: ${currentVersion})`;
    }

    const { ServiceManager } = require('../system/ServiceManager');
    for (const reqSvc of manifest.requiredServices || []) {
      if (!ServiceManager.getInstance().getAllServices().some((s: any) => s.name === reqSvc)) {
        return `Missing required service dependency: ${reqSvc}`;
      }
    }

    return null; // Passed validation
  }
}
