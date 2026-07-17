import { DatabaseManager } from '../db/DatabaseManager';

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  relationType: string;
  weight: number;
}

export class MemoryGraph {
  private static instance: MemoryGraph;

  private constructor() {
    this.initializeSchema();
  }

  public static getInstance(): MemoryGraph {
    if (!MemoryGraph.instance) {
      MemoryGraph.instance = new MemoryGraph();
    }
    return MemoryGraph.instance;
  }

  private initializeSchema(): void {
    const db = DatabaseManager.getInstance().getConnection();
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_edges (
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        PRIMARY KEY (source_id, target_id, relation_type)
      );
    `);
  }

  public addRelation(sourceId: string, targetId: string, relationType: string, weight: number = 1.0): void {
    const db = DatabaseManager.getInstance().getConnection();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO memory_edges (source_id, target_id, relation_type, weight)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(sourceId, targetId, relationType, weight);
    console.log(`[MemoryGraph] Added edge: ${sourceId} -[${relationType}]-> ${targetId}`);
  }

  public getRelated(nodeId: string, relationType?: string): any[] {
    const db = DatabaseManager.getInstance().getConnection();
    let sql = 'SELECT * FROM memory_edges WHERE source_id = ? OR target_id = ?';
    const params = [nodeId, nodeId];
    
    if (relationType) {
      sql += ' AND relation_type = ?';
      params.push(relationType);
    }
    
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }
}
