export class SessionMemory {
  private events: any[] = [];

  public recordEvent(event: any): void {
    this.events.push(event);
  }

  public getRecentEvents(limit: number = 10): any[] {
    return this.events.slice(-limit);
  }

  public clear(): void {
    this.events = [];
  }
}
