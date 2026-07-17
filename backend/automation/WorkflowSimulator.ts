import { WorkflowDAG } from './WorkflowPlanner';

export interface SimulationResult {
  success: boolean;
  estimatedDurationMs: number;
  requiredPermissions: string[];
  failurePoints: string[];
  executionOrder: string[];
  canRollback: boolean;
}

export class WorkflowSimulator {
  /**
   * Simulates the DAG execution to find failure points before actual runtime.
   */
  public simulate(dag: WorkflowDAG, currentContext: Record<string, any>): SimulationResult {
    console.log(`[WorkflowSimulator] Simulating DAG: ${dag.id}`);

    let estimatedDurationMs = 0;
    const requiredPermissions = new Set<string>();
    const failurePoints: string[] = [];
    const executionOrder: string[] = [];
    let canRollback = true;

    for (const node of dag.nodes) {
      executionOrder.push(node.id);
      
      // Calculate duration
      if (node.type === 'Delay') {
        estimatedDurationMs += node.payload?.durationMs || 0;
      } else if (node.type === 'Action') {
        estimatedDurationMs += 150; // Mock action duration
      }

      // Collect permissions
      if (node.payload?.targetApp) {
        requiredPermissions.add(node.payload.targetApp);
        // Simulate missing app failure
        if (currentContext.activeApp !== node.payload.targetApp && !currentContext.backgroundAllowed) {
           failurePoints.push(`Target app '${node.payload.targetApp}' is not active and background execution is disabled.`);
        }
      }

      // Rollback check
      if (node.payload?.isDestructive) {
        canRollback = false;
      }
    }

    return {
      success: failurePoints.length === 0,
      estimatedDurationMs,
      requiredPermissions: Array.from(requiredPermissions),
      failurePoints,
      executionOrder,
      canRollback
    };
  }
}
