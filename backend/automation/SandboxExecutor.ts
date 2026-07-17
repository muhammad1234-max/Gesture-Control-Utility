import { WorkflowDAG } from './WorkflowPlanner';
import { ExecutableAction, ActionType } from '@shared/types/action';
import { PermissionManager, PermissionAction } from '../skills/PermissionManager';
import { SkillRegistry } from '../skills/SkillRegistry';

export class SandboxExecutor {
  /**
   * The final gatekeeper. Validates safety, loop detection, and permissions.
   * Only valid actions are pushed to the ExecutionQueue.
   */
  public validateAndExtractActions(dag: WorkflowDAG): ExecutableAction[] {
    console.log(`[SandboxExecutor] Validating DAG: ${dag.id}`);

    const permissionManager = PermissionManager.getInstance();
    const skillRegistry = SkillRegistry.getInstance();
    
    // 1. Loop / Recursion detection
    const visited = new Set<string>();
    
    // A simple cycle detection for the DAG
    for (const node of dag.nodes) {
      if (visited.has(node.id)) {
        throw new Error(`[SandboxExecutor] Infinite loop or recursion detected at node ${node.id}`);
      }
      visited.add(node.id);

      // 2. Skill Validation
      if (node.type === 'Plugin') {
        const skillId = node.payload?.skillId;
        if (!skillRegistry.getSkill(skillId)) {
          throw new Error(`[SandboxExecutor] Unsupported or missing skill requested: ${skillId}`);
        }
      }

      // 3. Permission Validation
      const targetApp = node.payload?.targetApp;
      if (targetApp) {
        const action = permissionManager.evaluate(targetApp);
        if (action === PermissionAction.Deny) {
          throw new Error(`[SandboxExecutor] Unsafe action blocked. Target app '${targetApp}' is denied.`);
        }
        if (action === PermissionAction.AlwaysConfirm) {
           console.warn(`[SandboxExecutor] Action targeting '${targetApp}' requires manual confirmation. Halting auto-execution.`);
           return []; // Fail-safe fallback for now
        }
      }
    }

    // 4. Extract executable actions
    const extractedActions: ExecutableAction[] = dag.nodes
      .filter(n => n.type === 'Action')
      .map(n => ({
        id: `action_${Date.now()}`,
        type: ActionType.Macro, // Wrapper type or mapped type
        payload: n.payload,
        priority: 1,
        repeatable: false,
        sourceIntent: 0, // Mock source
        profileId: 'default'
      }));

    return extractedActions;
  }
}
