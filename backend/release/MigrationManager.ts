import fs from 'fs';
import { Logger } from '../system/Logger';
import { SYSTEM_CONSTANTS } from '@shared/constants';

export class MigrationManager {
  private static instance: MigrationManager;
  private currentSchemaVersion = 2; // Hardcoded current target schema version

  private constructor() {}

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  /**
   * Automatically migrates config files upon boot if the schema version is outdated.
   */
  public applyMigrations() {
    try {
      if (!fs.existsSync(SYSTEM_CONSTANTS.CONFIG_PATH)) return;

      const configRaw = fs.readFileSync(SYSTEM_CONSTANTS.CONFIG_PATH, 'utf8');
      const config = JSON.parse(configRaw);

      const fileSchemaVersion = config.schemaVersion || 1;

      if (fileSchemaVersion < this.currentSchemaVersion) {
        Logger.info(`Migrating configuration from schema v${fileSchemaVersion} to v${this.currentSchemaVersion}`);
        
        let migratedConfig = { ...config };

        // Perform step-by-step migrations
        if (fileSchemaVersion < 2) {
          migratedConfig = this.migrateV1toV2(migratedConfig);
        }
        
        // Update to current
        migratedConfig.schemaVersion = this.currentSchemaVersion;

        fs.writeFileSync(SYSTEM_CONSTANTS.CONFIG_PATH, JSON.stringify(migratedConfig, null, 2));
        Logger.info('Configuration migration successful.');
      }
    } catch (err: any) {
      Logger.error('Failed to apply migrations', { error: err.message });
    }
  }

  private migrateV1toV2(oldConfig: any): any {
    // Example: V1 had "sensitivity", V2 split it into "scrollSensitivity" and "cursorSensitivity"
    return {
      ...oldConfig,
      gesture: {
        ...oldConfig.gesture,
        scrollSensitivity: oldConfig.gesture?.sensitivity || 1.0,
        cursorSensitivity: oldConfig.gesture?.sensitivity || 1.0,
      }
    };
  }
}
