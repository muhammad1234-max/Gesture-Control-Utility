import { IntentType } from '@shared/types/intent';

export enum PolicyType {
  ImmediateExecution = 'ImmediateExecution',
  WorkflowGeneration = 'WorkflowGeneration',
  ManualConfirmation = 'ManualConfirmation',
  BackgroundAutomation = 'BackgroundAutomation',
  DryRun = 'DryRun',
  Simulation = 'Simulation'
}

export interface PolicyDecision {
  type: PolicyType;
  reason: string;
}

export class PlanningPolicy {
  private static instance: PlanningPolicy;

  private constructor() {}

  public static getInstance(): PlanningPolicy {
    if (!PlanningPolicy.instance) {
      PlanningPolicy.instance = new PlanningPolicy();
    }
    return PlanningPolicy.instance;
  }

  /**
   * Decides what the AI should do with an incoming intent or goal.
   */
  public evaluate(intent: IntentType, currentContext: Record<string, any>): PolicyDecision {
    // 1. Simulation Mode Override
    if (currentContext.isSimulationMode) {
      return { type: PolicyType.Simulation, reason: 'System is explicitly set to simulation mode.' };
    }

    // 2. Critical Safety Override
    if (intent === IntentType.SystemCritical) {
      return { type: PolicyType.ManualConfirmation, reason: 'System critical intent requires user approval.' };
    }

    // 3. Dry Run Override
    if (currentContext.dryRunRequested) {
      return { type: PolicyType.DryRun, reason: 'Dry run requested by user or diagnostic tool.' };
    }

    // 4. Background Automations
    if (currentContext.isScreenLocked || currentContext.isFocusAssistActive) {
      // If we need to do something while locked, it has to be a background automation
      return { type: PolicyType.BackgroundAutomation, reason: 'Screen is locked, routing to background automation queue.' };
    }

    // 5. Complexity Based Routing
    // E.g., if intent has natural language payload, it requires generation.
    if (currentContext.naturalLanguagePayload) {
      return { type: PolicyType.WorkflowGeneration, reason: 'Natural language payload detected, requires LLM planning.' };
    }

    // Default: Immediate Execution for simple, mapped gestures
    return { type: PolicyType.ImmediateExecution, reason: 'Standard mapped intent, executing immediately.' };
  }
}
