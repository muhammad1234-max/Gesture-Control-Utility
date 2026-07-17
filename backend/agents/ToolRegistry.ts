export interface ToolMetadata {
  id: string;
  name: string;
  version: string;
  permissions: string[];
  latencyMs: number;
  costTokens: number;
  hasSideEffects: boolean;
  supportsRollback: boolean;
  requiredServices: string[];
}

export interface AgentTool {
  metadata: ToolMetadata;
  execute(args: any): Promise<any>;
  rollback?(args: any): Promise<void>;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, AgentTool> = new Map();

  private constructor() {
    // Stub some built-in tools
    this.register({
      metadata: {
        id: 'tool.browser.search',
        name: 'Web Search',
        version: '1.0.0',
        permissions: ['network'],
        latencyMs: 1500,
        costTokens: 50,
        hasSideEffects: false,
        supportsRollback: false,
        requiredServices: []
      },
      execute: async (args) => { return { results: [] }; }
    });
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public register(tool: AgentTool): void {
    this.tools.set(tool.metadata.id, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.metadata.name} (v${tool.metadata.version})`);
  }

  public getTool(id: string): AgentTool | undefined {
    return this.tools.get(id);
  }

  public findToolsForTask(requiredPermissions: string[]): AgentTool[] {
    // Return tools that match the required permissions
    return Array.from(this.tools.values()).filter(tool => 
      requiredPermissions.every(p => tool.metadata.permissions.includes(p))
    );
  }
}
