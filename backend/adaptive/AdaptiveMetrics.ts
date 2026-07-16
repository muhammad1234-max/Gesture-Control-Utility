import { AdaptiveHistory } from './AdaptiveHistory';
import { UserProfiler } from './UserProfiler';

export class AdaptiveMetrics {
  /**
   * Evaluates if a change resulted in a statistical improvement.
   */
  public static evaluateSuccess(recId: string): boolean {
    // In the future: compare accuracy/latency before and after the timestamp of this recId.
    // If it improved, call AdaptiveHistory.updateOutcome(recId, 'success');
    return true;
  }
}
