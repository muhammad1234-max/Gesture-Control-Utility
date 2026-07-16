import fs from 'fs';
import path from 'path';
import { AppConfig, DEFAULT_CONFIG } from '../../shared/types/config';
import { Logger } from '../system/Logger';

export class ConfigManager {
  private static instance: ConfigManager;
  private configPath: string;
  private config: AppConfig;
  private subscribers: ((config: AppConfig) => void)[] = [];

  private constructor() {
    const { PathManager } = require('../system/PathManager');
    this.configPath = PathManager.getInstance().getConfigPath();
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(data);
        Logger.info('Configuration loaded successfully.');
        return { ...DEFAULT_CONFIG, ...parsed }; // Merge defaults
      } catch (err: any) {
        Logger.error('Failed to parse config.json, falling back to defaults', { error: err.message });
      }
    }
    return { ...DEFAULT_CONFIG };
  }

  public saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      Logger.debug('Configuration saved to disk.');
    } catch (err: any) {
      Logger.error('Failed to save config', { error: err.message });
    }
  }

  public getConfig(): AppConfig {
    return this.mergeAdaptiveOverrides(this.config);
  }

  public getRawConfig(): AppConfig {
    return { ...this.config };
  }

  public updateConfig(partialConfig: Partial<AppConfig>): void {
    this.config = {
      ...this.config,
      ...partialConfig
    };
    this.saveConfig();
    this.notifySubscribers();
    Logger.info('Configuration updated', partialConfig);
  }

  public applyAdaptiveOverride(keyPath: string, value: any): void {
    if (!this.config.adaptive) {
      this.config.adaptive = { mode: 'assisted', overrides: {} };
    }
    this.config.adaptive.overrides[keyPath] = value;
    this.saveConfig();
    this.notifySubscribers();
  }

  public removeAdaptiveOverride(keyPath: string): void {
    if (this.config.adaptive?.overrides[keyPath] !== undefined) {
      delete this.config.adaptive.overrides[keyPath];
      this.saveConfig();
      this.notifySubscribers();
    }
  }

  private mergeAdaptiveOverrides(base: AppConfig): AppConfig {
    // We deep clone to prevent mutations
    const merged = JSON.parse(JSON.stringify(base)) as AppConfig;
    if (merged.adaptive?.mode === 'disabled') {
      return merged;
    }
    
    // Apply flat key paths (e.g. "tracking.minDetectionConfidence") to nested objects
    const overrides = merged.adaptive?.overrides || {};
    for (const [keyPath, value] of Object.entries(overrides)) {
      const keys = keyPath.split('.');
      let current: any = merged;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    }
    
    return merged;
  }

  public subscribe(callback: (config: AppConfig) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers() {
    const activeConfig = this.getConfig();
    for (const callback of this.subscribers) {
      try {
        callback(activeConfig);
      } catch (err: any) {
        Logger.error('Error in config subscriber', { error: err.message });
      }
    }
  }
}
