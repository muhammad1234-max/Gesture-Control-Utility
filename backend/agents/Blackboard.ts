export class Blackboard {
  private static instance: Blackboard;
  private memory: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): Blackboard {
    if (!Blackboard.instance) {
      Blackboard.instance = new Blackboard();
    }
    return Blackboard.instance;
  }

  public write(key: string, data: any): string {
    const referenceId = `ref_${key}_${Date.now()}`;
    this.memory.set(referenceId, data);
    return referenceId;
  }

  public read(referenceId: string): any {
    return this.memory.get(referenceId);
  }

  public clear(referenceId: string): void {
    this.memory.delete(referenceId);
  }
}
