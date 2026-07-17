import { AIEventBus, AIEventType } from './AIEventBus';

export class AIDiagnostics {
  private static instance: AIDiagnostics;

  public plannerLatencyMs: number = 0;
  public llmLatencyMs: number = 0;
  public routingLatencyMs: number = 0;
  public activeTokens: number = 0;
  public workflowsExecuted: number = 0;
  public skillsInvoked: number = 0;

  private constructor() {
    AIEventBus.getInstance().subscribe(AIEventType.WorkflowFinished, () => {
      this.workflowsExecuted++;
    });
    AIEventBus.getInstance().subscribe(AIEventType.SkillExecuted, () => {
      this.skillsInvoked++;
    });
  }

  public static getInstance(): AIDiagnostics {
    if (!AIDiagnostics.instance) {
      AIDiagnostics.instance = new AIDiagnostics();
    }
    return AIDiagnostics.instance;
  }

  public getSnapshot(): Record<string, number> {
    return {
      plannerLatencyMs: this.plannerLatencyMs,
      llmLatencyMs: this.llmLatencyMs,
      routingLatencyMs: this.routingLatencyMs,
      activeTokens: this.activeTokens,
      workflowsExecuted: this.workflowsExecuted,
      skillsInvoked: this.skillsInvoked
    };
  }
}
