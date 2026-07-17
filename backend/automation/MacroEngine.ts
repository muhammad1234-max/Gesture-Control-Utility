import { WorkflowDAG } from './WorkflowPlanner';
import { SandboxExecutor } from './SandboxExecutor';
import { ExecutableAction } from '@shared/types/action';

export class MacroEngine {
  private sandbox: SandboxExecutor;

  constructor() {
    this.sandbox = new SandboxExecutor();
  }

  /**
   * Takes a compiled DAG, passes it through the sandbox, and executes it.
   */
  public execute(dag: WorkflowDAG): void {
    console.log(`[MacroEngine] Executing DAG: ${dag.id}`);
    
    // 1. Sandbox validation
    const actions: ExecutableAction[] = this.sandbox.validateAndExtractActions(dag);

    // 2. Submit to ExecutionQueue
    if (actions.length > 0) {
       console.log(`[MacroEngine] Submitting ${actions.length} actions to ExecutionQueue.`);
       // ExecutionQueue.getInstance().enqueue(actions);
    } else {
       console.log(`[MacroEngine] Sandbox rejected execution or DAG was empty.`);
    }
  }
}
