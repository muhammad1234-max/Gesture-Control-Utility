import { ExecutableAction, ExecutionResult } from '@shared/types';

export interface IActionExecutor {
  execute(action: ExecutableAction): Promise<ExecutionResult>;
}
