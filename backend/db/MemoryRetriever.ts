import { DatabaseManager } from './DatabaseManager';

export interface MemoryQuery {
  limit?: number;
  type?: string;
  keyword?: string;
}

export abstract class MemoryRetriever {
  abstract retrieve(query: MemoryQuery): any[];
  abstract store(data: any): void;
}

export class SQLiteRetriever extends MemoryRetriever {
  public retrieve(query: MemoryQuery): any[] {
    const db = DatabaseManager.getInstance().getConnection();
    const limit = query.limit || 10;
    
    // Simple naive retrieval for now
    let sql = 'SELECT * FROM memory_episodic';
    const params: any[] = [];
    
    if (query.type) {
      sql += ' WHERE event_type = ?';
      params.push(query.type);
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    try {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    } catch (e) {
      console.error('[SQLiteRetriever] Retrieval failed:', e);
      return [];
    }
  }

  public store(data: any): void {
    const db = DatabaseManager.getInstance().getConnection();
    try {
      const stmt = db.prepare(`
        INSERT INTO memory_episodic (id, timestamp, event_type, content) 
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(data.id, data.timestamp, data.type, JSON.stringify(data.content));
    } catch (e) {
      console.error('[SQLiteRetriever] Storage failed:', e);
    }
  }
}
