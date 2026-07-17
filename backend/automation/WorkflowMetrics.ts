import { WorkflowDAG } from './WorkflowPlanner';

export interface WorkflowScore {
  confidence: number;
  safety: number;
  complexity: number;
}

export class WorkflowMetrics {
  public static calculateQualityScore(dag: WorkflowDAG): WorkflowScore {
    // Stub algorithm
    const complexity = Math.min(dag.nodes.length * 10, 100);
    const safety = dag.nodes.some(n => n.payload?.isDestructive) ? 40 : 95;
    const confidence = 85; // Base confidence from LLM generation

    return { confidence, safety, complexity };
  }
}
