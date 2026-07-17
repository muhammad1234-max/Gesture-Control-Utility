import { ContextCache } from '../ContextCache';

export class ApplicationContextProvider {
  public start(): void {
    console.log('[ApplicationContextProvider] Hooked into NativeBridge for active app events.');
    // Simulated subscription to NativeBridge
    // NativeBridge.on('ActiveAppChanged', this.onAppChanged.bind(this));
  }

  public onAppChanged(activeApp: string): void {
    ContextCache.getInstance().updateContext({ activeApp });
  }

  public stop(): void {
    // NativeBridge.off('ActiveAppChanged', this.onAppChanged.bind(this));
  }
}
