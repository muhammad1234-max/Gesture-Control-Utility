import { BaseAgent } from './BaseAgent';
import { DatabaseManager } from '../db/DatabaseManager';

export class AgentManager {
  private static instance: AgentManager;
  private agents: Map<string, BaseAgent> = new Map();

  private constructor() {}

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  public async registerAgent(agent: BaseAgent): Promise<void> {
    try {
      console.log(`[AgentManager] Registering agent: ${agent.getId()}`);
      
      // Initialize in isolated try/catch to ensure failure domains
      await agent.initialize();
      this.agents.set(agent.getId(), agent);
      
      this.persistCheckpoint(agent);
    } catch (e) {
      console.error(`[AgentManager] Failed to register agent ${agent.getId()}:`, e);
      // Other agents remain unaffected
    }
  }

  public getAgent(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  private persistCheckpoint(agent: BaseAgent): void {
    const db = DatabaseManager.getInstance().getConnection();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO agent_state (agent_id, cursor, state_data, last_heartbeat)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(agent.getId(), 'INIT', JSON.stringify({ permissions: agent.getPermissions() }), Date.now());
  }

  // Hook for the global RuntimeManager to monitor agents
  public getHealthStatuses(): Record<string, boolean> {
    const statuses: Record<string, boolean> = {};
    for (const [id, agent] of this.agents.entries()) {
      statuses[id] = agent.healthCheck();
    }
    return statuses;
  }

  public async shutdownAll(): Promise<void> {
    for (const agent of this.agents.values()) {
      try {
        await agent.shutdown();
      } catch (e) {
        console.error(`[AgentManager] Error shutting down ${agent.getId()}`, e);
      }
    }
  }
}
