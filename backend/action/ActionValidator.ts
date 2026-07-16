import { ExecutableAction, ValidationResult, IntentFrame } from '@shared/types';
import { ActionDiagnostics } from './ActionDiagnostics';

export class ActionValidator {
  private lastExecutedActionId: string | null = null;
  private lastExecutionTime: number = 0;

  public validate(action: ExecutableAction, intentFrame: IntentFrame): ValidationResult {
    // 1. Check intent confidence baseline
    if (intentFrame.confidence < 0.5) {
      ActionDiagnostics.getInstance().recordRejectedAction();
      return { isValid: false, action, reason: 'Confidence Too Low' };
    }

    // 2. Check repeatability
    if (!action.repeatable) {
      if (this.lastExecutedActionId === action.id) {
        // Prevent spamming non-repeatable actions from the same sustained intent
        ActionDiagnostics.getInstance().recordRejectedAction();
        return { isValid: false, action, reason: 'Action Not Repeatable' };
      }
    }

    this.lastExecutedActionId = action.id;
    this.lastExecutionTime = Date.now();

    return { isValid: true, action };
  }
  
  public resetThrottle() {
     this.lastExecutedActionId = null;
  }
}
