export class LongTermMemory {
  /**
   * Stub for vector DB or SQLite backed persistent memory
   */
  public async storeFact(fact: string): Promise<void> {
    console.log(`[LongTermMemory] Stored fact: ${fact}`);
  }

  public async retrieveRelevantFacts(query: string): Promise<string[]> {
    return [];
  }
}
