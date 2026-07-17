import { AIEventBus, AIEventType } from './AIEventBus';
import { BudgetManager } from './BudgetManager';
import { PlanningPolicy, PolicyType } from './PlanningPolicy';
import { WorkflowPlanner } from '../automation/WorkflowPlanner';
import { WorkflowSimulator } from '../automation/WorkflowSimulator';
import { MacroEngine } from '../automation/MacroEngine';
import { ActionBus } from '../action/ActionBus';
import { ActionType } from '@shared/types';

export class AIOrchestrator {
  private static instance: AIOrchestrator;
  
  private isInitialized = false;
  private planner = new WorkflowPlanner();
  private simulator = new WorkflowSimulator();
  private macroEngine = new MacroEngine();

  private constructor() {}

  public static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator();
    }
    return AIOrchestrator.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Initialize subsystem listeners here
    AIEventBus.getInstance().subscribe(AIEventType.WorkflowStarted, (event) => {
      console.log(`[AIOrchestrator] Workflow started:`, event.payload);
    });

    this.isInitialized = true;
    console.log('[AIOrchestrator] Initialized successfully.');
  }

  public healthCheck(): boolean {
    // Check if critical AI subsystems are responding
    return this.isInitialized;
  }

  public readyCheck(): boolean {
    return this.isInitialized;
  }

  public metrics(): any {
    return {}; // Hook into AIDiagnostics.getInstance().getSnapshot() later
  }

  /**
   * The single entry point for processing high-level intents via AI.
   */
  public async processIntent(intent: any, context: any): Promise<void> {
    if (!BudgetManager.getInstance().canProcessRequest(100)) {
      console.warn('[AIOrchestrator] Budget exceeded, aborting intent processing.');
      return;
    }

    const decision = PlanningPolicy.getInstance().evaluate(intent, context);

    switch (decision.type) {
      case PolicyType.ImmediateExecution:
        console.log('[AIOrchestrator] Executing immediately (no planning required).');
        ActionBus.getInstance().publish({
          id: `ai_action_${Date.now()}`,
          type: ActionType.Macro,
          payload: { intent },
          priority: 1,
          repeatable: false,
          sourceIntent: intent,
          profileId: context.profileId || 'default'
        });
        break;

      case PolicyType.WorkflowGeneration:
      case PolicyType.BackgroundAutomation:
        console.log('[AIOrchestrator] Sending to WorkflowPlanner...');
        const dag = await this.planner.planWorkflow(intent.toString(), context);
        AIEventBus.getInstance().publish({
          type: AIEventType.PlannerCompleted,
          timestamp: Date.now(),
          payload: { dag }
        });
        this.macroEngine.execute(dag);
        break;

      case PolicyType.Simulation:
      case PolicyType.DryRun:
        console.log('[AIOrchestrator] Simulating workflow...');
        const simDag = await this.planner.planWorkflow(intent.toString(), context);
        const simResult = this.simulator.simulate(simDag, context);
        console.log('[AIOrchestrator] Simulation Result:', simResult);
        break;

      case PolicyType.ManualConfirmation:
        console.log('[AIOrchestrator] Manual confirmation required. Halting execution.');
        break;

      default:
        console.log(`[AIOrchestrator] Unhandled policy type: ${decision.type}`);
    }
  }

  public async shutdown(): Promise<void> {
    console.log('[AIOrchestrator] Shutting down gracefully.');
    this.isInitialized = false;
  }
}
