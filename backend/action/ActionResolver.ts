import { ExecutableAction, IntentFrame } from '@shared/types';
import { ActionRegistry } from './ActionRegistry';
import { ProfileManager } from './ProfileManager';
import { ActionDiagnostics } from './ActionDiagnostics';

export class ActionResolver {
  private registry = ActionRegistry.getInstance();
  private profileManager = ProfileManager.getInstance();

  public resolve(intentFrame: IntentFrame): ExecutableAction | null {
    ActionDiagnostics.getInstance().recordIntentReceived();

    if (intentFrame.primaryIntent === 'NONE') {
      return null;
    }

    const activeProfile = this.profileManager.getActiveProfileId();
    const candidateActions = this.registry.getActions(activeProfile, intentFrame.primaryIntent);

    if (candidateActions.length === 0) {
      // Missing mapping
      return null;
    }

    // Since they are sorted by priority inside ActionRegistry, we can just check conditions from top to bottom
    for (const action of candidateActions) {
      if (this.checkConditions(action, intentFrame)) {
        ActionDiagnostics.getInstance().recordMappedAction();
        return action;
      }
    }

    // None matched conditions
    ActionDiagnostics.getInstance().recordConflictResolution();
    return null;
  }

  private checkConditions(action: ExecutableAction, intentFrame: IntentFrame): boolean {
    if (!action.conditions || action.conditions.length === 0) {
      return true; // Unconditional
    }

    for (const condition of action.conditions) {
      // Check confidence
      if (condition.minConfidence !== undefined) {
        if (intentFrame.confidence < condition.minConfidence) {
          return false;
        }
      }
      // Check hand
      // (Assuming intentFrame has a hand property, if not we skip for now since it's not fully populated)
    }

    return true;
  }
}
