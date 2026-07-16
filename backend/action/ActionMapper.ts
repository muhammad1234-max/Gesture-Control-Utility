import { IntentFrame, ExecutableAction } from '@shared/types';
import { ActionResolver } from './ActionResolver';
import { ActionValidator } from './ActionValidator';
import { ActionDiagnostics } from './ActionDiagnostics';

export class ActionMapper {
  private resolver = new ActionResolver();
  private validator = new ActionValidator();

  public process(intentFrame: IntentFrame): ExecutableAction | null {
    const t0 = performance.now();
    const action = this.resolver.resolve(intentFrame);
    const lookupMs = performance.now() - t0;
    
    ActionDiagnostics.getInstance().recordLookupTime(lookupMs);

    if (!action) {
      return null;
    }

    const t1 = performance.now();
    const result = this.validator.validate(action, intentFrame);
    const valMs = performance.now() - t1;
    
    ActionDiagnostics.getInstance().recordValidationTime(valMs);

    if (result.isValid) {
      return result.action;
    } else {
      // It was rejected by validator
      return null;
    }
  }
  
  public resetThrottle() {
     this.validator.resetThrottle();
  }
}
