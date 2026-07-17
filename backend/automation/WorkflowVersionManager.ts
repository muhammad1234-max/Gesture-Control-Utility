import { WorkflowDAG } from './WorkflowPlanner';
import * as fs from 'fs';
import * as path from 'path';

export class WorkflowVersionManager {
  private versions: Map<string, WorkflowDAG[]> = new Map();
  private storagePath = path.join(process.env.LOCALAPPDATA || '', 'GestureControl', 'workflows.json');

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(data);
        this.migrate(parsed);
        // Load into map...
      }
    } catch (e) {
      console.error('[WorkflowVersionManager] Failed to load workflows', e);
    }
  }

  private migrate(parsedData: any): void {
    console.log('[WorkflowVersionManager] Migrating older workflow schemas if necessary...');
  }

  private persist(): void {
    try {
      // Mock persistence
      // fs.writeFileSync(this.storagePath, JSON.stringify(Object.fromEntries(this.versions)));
      console.log(`[WorkflowVersionManager] Persisted workflows to ${this.storagePath}`);
    } catch (e) {
      console.error('[WorkflowVersionManager] Failed to persist workflows', e);
    }
  }

  public saveVersion(workflowName: string, dag: WorkflowDAG): void {
    if (!this.versions.has(workflowName)) {
      this.versions.set(workflowName, []);
    }
    this.versions.get(workflowName)?.push(dag);
    console.log(`[WorkflowVersionManager] Saved version ${this.versions.get(workflowName)?.length} of ${workflowName}`);
    this.persist();
  }

  public getVersion(workflowName: string, versionIndex: number): WorkflowDAG | undefined {
    const history = this.versions.get(workflowName);
    return history ? history[versionIndex] : undefined;
  }
}
