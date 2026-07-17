import { WorkingMemory } from './WorkingMemory';
import { SessionMemory } from './SessionMemory';
import { LongTermMemory } from './LongTermMemory';
import { AIEventBus, AIEventType } from '../ai/AIEventBus';

export class MemorySynchronizer {
  private static instance: MemorySynchronizer;
  private syncInterval: any;

  private workingMemory = new WorkingMemory();
  private sessionMemory = new SessionMemory();
  private longTermMemory = new LongTermMemory();

  private constructor() {
    AIEventBus.getInstance().subscribe(AIEventType.WorkflowFinished, (event) => {
      // Auto-promote finished workflows to session memory
      this.sessionMemory.recordEvent(event);
    });
  }

  public static getInstance(): MemorySynchronizer {
    if (!MemorySynchronizer.instance) {
      MemorySynchronizer.instance = new MemorySynchronizer();
    }
    return MemorySynchronizer.instance;
  }

  public startSynchronization(): void {
    console.log('[MemorySynchronizer] Starting periodic sync...');
    this.syncInterval = setInterval(() => {
      this.promoteSessionToLongTerm();
      this.cleanup();
    }, 60 * 1000 * 15); // Every 15 minutes
  }

  public stopSynchronization(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    // Final sync on shutdown
    this.promoteSessionToLongTerm();
  }

  private async promoteSessionToLongTerm(): Promise<void> {
    console.log('[MemorySynchronizer] Promoting Session Memory to Long-Term Memory (Summarization)...');
    const recent = this.sessionMemory.getRecentEvents(100);
    if (recent.length > 0) {
      // Stub: Summarize array of events via LLM or simple aggregator, then store
      await this.longTermMemory.storeFact(`User performed ${recent.length} automations in the last session.`);
      this.sessionMemory.clear();
    }
  }

  private cleanup(): void {
    // Enforce retention limits
    this.workingMemory.clear(); // Clear transient execution state
    console.log('[MemorySynchronizer] Performed memory cleanup.');
  }
}
