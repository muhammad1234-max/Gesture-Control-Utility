import { AgentBus } from './AgentBus';
import { Blackboard } from './Blackboard';

export interface AgentMetrics {
  cpuTime: number;
  tokensGenerated: number;
  messagesProcessed: number;
  errors: number;
}

export abstract class BaseAgent {
  protected id: string;
  protected permissions: string[];
  protected bus = AgentBus.getInstance();
  protected blackboard = Blackboard.getInstance();
  
  protected metrics: AgentMetrics = {
    cpuTime: 0,
    tokensGenerated: 0,
    messagesProcessed: 0,
    errors: 0
  };

  constructor(id: string, permissions: string[]) {
    this.id = id;
    this.permissions = permissions;
  }

  public getId(): string {
    return this.id;
  }

  public getPermissions(): string[] {
    return this.permissions;
  }

  public getMetrics(): AgentMetrics {
    return this.metrics;
  }

  // Contract Methods
  public abstract initialize(): Promise<void>;
  public abstract readyCheck(): boolean;
  public abstract healthCheck(): boolean;
  public abstract observe(data: any): Promise<void>;
  public abstract think(): Promise<void>;
  public abstract plan(): Promise<void>;
  public abstract execute(): Promise<void>;
  public abstract reflect(): Promise<void>;
  public abstract shutdown(): Promise<void>;
}
