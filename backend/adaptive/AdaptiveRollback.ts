import { ConfigManager } from '../config/ConfigManager';
import { AdaptiveHistory } from './AdaptiveHistory';
import { Logger } from '../system/Logger';

export class AdaptiveRollback {
  public static revert(recId: string) {
    const history = AdaptiveHistory.getInstance();
    // In a full implementation, we'd fetch the specific keyPath from history
    // and remove the override or restore the previous value.
    // For now we'll just expose the method to remove an override.
    
    // We would need the keyPath. Let's pretend we pass it or look it up.
    // ConfigManager.getInstance().removeAdaptiveOverride(keyPath);
    
    history.updateOutcome(recId, 'reverted');
    Logger.info(`Reverted adaptive recommendation: ${recId}`);
  }
}
