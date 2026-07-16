import { ExecutableAction, ExecutionResult } from '@shared/types';
import { ExecutorRegistry } from './ExecutorRegistry';

export class ExecutionEngine {
  private registry = ExecutorRegistry.getInstance();

  public async execute(action: ExecutableAction): Promise<ExecutionResult> {
    const executor = this.registry.getExecutor(action.type);
    
    if (!executor) {
      return {
        success: false,
        actionId: action.id,
        executor: 'Unknown',
        queueWaitTimeMs: 0,
        bridgeRttMs: 0,
        pythonProcessingTimeMs: 0,
        win32ExecutionTimeMs: 0,
        totalLatencyMs: 0,
        failureReason: `No executor found for ActionType: ${action.type}`
      };
    }

    try {
      // The executor itself will handle calling the NativeBridge and returning the detailed result.
      return await executor.execute(action);
    } catch (err: any) {
      // Fallback boundary, executors should technically catch their own errors
      return {
        success: false,
        actionId: action.id,
        executor: action.type.toString(),
        queueWaitTimeMs: 0,
        bridgeRttMs: 0,
        pythonProcessingTimeMs: 0,
        win32ExecutionTimeMs: 0,
        totalLatencyMs: 0,
        failureReason: `Unhandled executor exception: ${err.message}`
      };
    }
  }
}
