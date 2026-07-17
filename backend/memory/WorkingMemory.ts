export class WorkingMemory {
  private context: Record<string, any> = {};

  public set(key: string, value: any): void {
    this.context[key] = value;
  }

  public get(key: string): any {
    return this.context[key];
  }

  public clear(): void {
    this.context = {};
  }
}
