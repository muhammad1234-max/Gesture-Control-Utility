import { ContextCache } from '../ContextCache';

export class DeviceContextProvider {
  public start(): void {
    // Stub: Read battery, displays etc.
    ContextCache.getInstance().updateContext({ 
      isBatteryLow: false,
      connectedDisplays: 2
    });
  }

  public stop(): void {
    // Cleanup if needed
  }
}
