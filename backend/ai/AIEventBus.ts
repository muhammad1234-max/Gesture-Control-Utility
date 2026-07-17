export enum AIEventType {
  WorkflowCreated = 'workflow.created',
  WorkflowStarted = 'workflow.started',
  WorkflowFinished = 'workflow.finished',
  WorkflowFailed = 'workflow.failed',
  PlannerCompleted = 'planner.completed',
  LLMResponse = 'llm.response',
  ContextUpdated = 'context.updated',
  SkillExecuted = 'skill.executed',
  TokenBudgetWarning = 'budget.warning'
}

export interface AIEvent {
  type: AIEventType;
  timestamp: number;
  payload: Record<string, any>;
}

export type AIEventSubscriber = (event: AIEvent) => void;

export class AIEventBus {
  private static instance: AIEventBus;
  private subscribers: Map<AIEventType, Set<AIEventSubscriber>> = new Map();

  private constructor() {
    for (const type of Object.values(AIEventType)) {
      this.subscribers.set(type, new Set());
    }
  }

  public static getInstance(): AIEventBus {
    if (!AIEventBus.instance) {
      AIEventBus.instance = new AIEventBus();
    }
    return AIEventBus.instance;
  }

  public subscribe(type: AIEventType, handler: AIEventSubscriber): () => void {
    const subs = this.subscribers.get(type);
    if (subs) {
      subs.add(handler);
    }
    return () => {
      subs?.delete(handler);
    };
  }

  public publish(event: AIEvent): void {
    const subs = this.subscribers.get(event.type);
    if (subs) {
      for (const sub of subs) {
        try {
          sub(event);
        } catch (err) {
          console.error(`[AIEventBus] Subscriber error for event ${event.type}:`, err);
        }
      }
    }
  }
}
