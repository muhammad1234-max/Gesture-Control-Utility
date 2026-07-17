import { ApplicationContextProvider } from './Providers/ApplicationContextProvider';
import { WindowContextProvider } from './Providers/WindowContextProvider';
import { DeviceContextProvider } from './Providers/DeviceContextProvider';
import { ContextCache } from './ContextCache';

export class ContextEngine {
  private static instance: ContextEngine;
  private appProvider = new ApplicationContextProvider();
  private winProvider = new WindowContextProvider();
  private devProvider = new DeviceContextProvider();

  private constructor() {}

  public static getInstance(): ContextEngine {
    if (!ContextEngine.instance) {
      ContextEngine.instance = new ContextEngine();
    }
    return ContextEngine.instance;
  }

  public start(): void {
    console.log('[ContextEngine] Starting all providers...');
    this.appProvider.start();
    this.winProvider.start();
    this.devProvider.start();
  }

  public stop(): void {
    console.log('[ContextEngine] Stopping all providers...');
    this.appProvider.stop();
    this.winProvider.stop();
    this.devProvider.stop();
  }

  public getCurrentContext(): Record<string, any> {
    return ContextCache.getInstance().getContext();
  }
}
