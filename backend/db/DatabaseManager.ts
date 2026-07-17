import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database;

  private constructor() {
    const dbDir = path.join(process.env.LOCALAPPDATA || '', 'GestureControl', 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new Database(path.join(dbDir, 'agents.sqlite'));
    this.db.pragma('journal_mode = WAL');
    this.initializeSchemas();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initializeSchemas(): void {
    console.log('[DatabaseManager] Initializing schemas...');
    
    // Core tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_state (
        agent_id TEXT PRIMARY KEY,
        cursor TEXT,
        state_data TEXT,
        last_heartbeat INTEGER
      );

      CREATE TABLE IF NOT EXISTS memory_episodic (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        content TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS memory_semantic (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        metadata TEXT NOT NULL,
        confidence REAL NOT NULL
      );
    `);
  }

  public getConnection(): Database.Database {
    return this.db;
  }

  public shutdown(): void {
    if (this.db) {
      this.db.close();
      console.log('[DatabaseManager] Database connection closed.');
    }
  }
}
