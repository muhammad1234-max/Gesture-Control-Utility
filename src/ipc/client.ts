import { IPCMessage, IPCEventType } from '@shared/events';
import { useDiagnosticsStore } from '@stores/diagnosticsStore';

type MessageHandler = (data: IPCMessage) => void;
type BinaryHandler = (data: Uint8Array) => void;

class IPCClientClass {
  private handlers: Set<MessageHandler> = new Set();
  private binaryHandlers: Set<BinaryHandler> = new Set();

  public connect() {
    console.log('IPC Connected via Electron Context Bridge');
    useDiagnosticsStore.getState().addLog('IPC Bridge Connected natively.', 'success');

    // @ts-ignore
    if (window.api) {
      // @ts-ignore
      window.api.onBroadcast((data: IPCMessage) => {
        this.handlers.forEach(h => h(data));
        
        if (data.type === IPCEventType.INFO) useDiagnosticsStore.getState().addLog(data.message!, 'info');
        if (data.type === IPCEventType.SUCCESS) useDiagnosticsStore.getState().addLog(data.message!, 'success');
        if (data.type === IPCEventType.WARNING) useDiagnosticsStore.getState().addLog(data.message!, 'warning');
        if (data.type === IPCEventType.ERROR) useDiagnosticsStore.getState().addLog(data.message!, 'error');
      });

      // @ts-ignore
      window.api.onBinary((data: Uint8Array) => {
        this.binaryHandlers.forEach(h => h(data));
      });
    } else {
      console.error('Electron API not found in window. Are we running in Electron?');
    }
  }

  public disconnect() {
    // @ts-ignore
    if (window.api) {
      // @ts-ignore
      window.api.removeAllListeners();
    }
  }

  public async send(action: IPCEventType, payload: any) {
    // @ts-ignore
    if (window.api) {
      // @ts-ignore
      const result = await window.api.send(action, payload);
      // Dispatch immediate responses if necessary
      if (result && result.type) {
        this.handlers.forEach(h => h(result));
      }
    } else {
      console.warn('Cannot send IPC message: Electron API missing');
    }
  }

  public async invoke(channel: IPCEventType | string, ...args: any[]): Promise<any> {
    useDiagnosticsStore.getState().addLog(`[IPC] Invoking channel: ${channel}`, 'info');
    // @ts-ignore
    if (window.api && window.api.invoke) {
      // @ts-ignore
      const res = await window.api.invoke(channel, ...args);
      return res;
    }
    useDiagnosticsStore.getState().addLog(`[IPC] Failed to invoke channel: ${channel} (API missing)`, 'error');
    return null;
  }

  public async invokeWithAck(channel: IPCEventType | string, expectedAck: string, timeoutMs: number = 5000, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      useDiagnosticsStore.getState().addLog(`[IPC] Invoking ${channel}, waiting for ACK: ${expectedAck}`, 'info');

      const timeout = setTimeout(() => {
        unsubscribe();
        const err = `[IPC] Timeout (${timeoutMs}ms) waiting for ACK: ${expectedAck}`;
        useDiagnosticsStore.getState().addLog(err, 'error');
        reject(new Error(err));
      }, timeoutMs);

      const unsubscribe = this.subscribe((msg) => {
        if (msg.type === expectedAck || (msg.type === 'ERROR' && channel !== 'GET_STATUS')) {
          clearTimeout(timeout);
          unsubscribe();
          if (msg.type === 'ERROR') {
            const err = `[IPC] Backend reported error for ${channel}: ${msg.payload || msg.message}`;
            useDiagnosticsStore.getState().addLog(err, 'error');
            reject(new Error(err));
          } else {
            const elapsed = Date.now() - startTime;
            useDiagnosticsStore.getState().addLog(`[IPC] Received ACK ${expectedAck} in ${elapsed}ms`, 'success');
            resolve(msg.payload);
          }
        }
      });

      this.invoke(channel, ...args).catch((err) => {
        clearTimeout(timeout);
        unsubscribe();
        useDiagnosticsStore.getState().addLog(`[IPC] Invoke failed for ${channel}: ${err.message}`, 'error');
        reject(err);
      });
    });
  }

  public async storeGet(key: string): Promise<any> {
    // @ts-ignore
    if (window.api && window.api.storeGet) {
      // @ts-ignore
      return await window.api.storeGet(key);
    }
    return null;
  }

  public async storeSet(key: string, value: any): Promise<void> {
    // @ts-ignore
    if (window.api && window.api.storeSet) {
      // @ts-ignore
      await window.api.storeSet(key, value);
    }
  }

  public subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public subscribeBinary(handler: BinaryHandler) {
    this.binaryHandlers.add(handler);
    return () => this.binaryHandlers.delete(handler);
  }
}

export const IPCClient = new IPCClientClass();
