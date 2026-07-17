import { ContextCache } from '../ContextCache';

export class WindowContextProvider {
  private pollingInterval: any;

  public start(): void {
    // Stub: Poll active window title
    this.pollingInterval = setInterval(() => {
      // Mock detection
      const windowTitle = 'Google Search - Google Chrome'; 
      ContextCache.getInstance().updateContext({ windowTitle });
    }, 1000);
  }

  public stop(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }
}
