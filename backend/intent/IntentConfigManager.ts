import { IntentConfig, DEFAULT_INTENT_CONFIG } from '@shared/types';

/**
 * Centralized Configuration Manager for Intent Engine.
 * Supports hot-reloading configurations in the future without restarting the engine.
 */
export class IntentConfigManager {
  private static instance: IntentConfigManager;
  private config: IntentConfig;

  private constructor() {
    // Clone default config to ensure we don't mutate the constant
    this.config = { ...DEFAULT_INTENT_CONFIG };
  }

  public static getInstance(): IntentConfigManager {
    if (!IntentConfigManager.instance) {
      IntentConfigManager.instance = new IntentConfigManager();
    }
    return IntentConfigManager.instance;
  }

  public getConfig(): IntentConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<IntentConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}
