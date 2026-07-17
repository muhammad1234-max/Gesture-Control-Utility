import { WorkflowDAG } from './WorkflowPlanner';

export class WorkflowCompiler {
  /**
   * Optimizes the workflow DAG (e.g., dead node elimination, delay merging, action batching).
   */
  public compile(rawDag: WorkflowDAG): WorkflowDAG {
    console.log(`[WorkflowCompiler] Compiling DAG: ${rawDag.id}`);
    
    // 1. Dead Node Elimination
    // Remove nodes that have no incoming dependencies and aren't root nodes, or empty actions
    let optimizedNodes = rawDag.nodes.filter(n => !(n.type === 'Action' && !n.payload));

    // 2. Delay Merging
    // Combine consecutive delays into a single delay
    const mergedNodes: any[] = [];
    let currentDelay = 0;

    for (const node of optimizedNodes) {
      if (node.type === 'Delay') {
        currentDelay += node.payload?.durationMs || 0;
      } else {
        if (currentDelay > 0) {
          mergedNodes.push({
            id: `delay_merged_${Date.now()}`,
            type: 'Delay',
            payload: { durationMs: currentDelay },
            dependencies: []
          });
          currentDelay = 0;
        }
        mergedNodes.push(node);
      }
    }

    if (currentDelay > 0) {
      mergedNodes.push({
        id: `delay_merged_${Date.now()}`,
        type: 'Delay',
        payload: { durationMs: currentDelay },
        dependencies: []
      });
    }

    // 3. Action Batching (Future improvement: combining consecutive typing actions)

    return {
      ...rawDag,
      nodes: mergedNodes
    };
  }
}
