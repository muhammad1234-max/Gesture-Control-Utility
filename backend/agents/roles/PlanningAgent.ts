import { BaseAgent } from '../BaseAgent';
import { AgentBus } from '../AgentBus';

export class PlanningAgent extends BaseAgent {
  private isolatedContext: any = {};

  constructor() {
    super('agent.planning', ['plan.create', 'plan.verify']);
  }

  public async initialize(): Promise<void> {
    this.bus.subscribe('goal.created', async (msg) => {
      this.isolatedContext.currentGoal = msg.payload.goal;
      await this.plan();
    });
    console.log(`[PlanningAgent] Initialized.`);
  }

  public readyCheck(): boolean { return true; }
  public healthCheck(): boolean { return true; }

  public async observe(data: any): Promise<void> {
    this.isolatedContext = { ...this.isolatedContext, ...data };
  }

  public async think(): Promise<void> {
    console.log(`[PlanningAgent] Thinking about goal...`);
    this.metrics.cpuTime += 50;
  }

  public async plan(): Promise<void> {
    await this.think();
    console.log(`[PlanningAgent] Generating plan...`);
    this.metrics.tokensGenerated += 150;
    
    // Simulate placing result on Blackboard and broadcasting reference
    const ref = this.blackboard.write('plan', { nodes: [] });
    this.bus.publish({
      sender: this.id,
      type: 'plan.ready',
      payload: { blackboardRef: ref }
    });
  }

  public async execute(): Promise<void> { /* Not responsible for execution */ }
  
  public async reflect(): Promise<void> { /* ... */ }
  
  public async shutdown(): Promise<void> {
    console.log(`[PlanningAgent] Shutting down.`);
  }
}
