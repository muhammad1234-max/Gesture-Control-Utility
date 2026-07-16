import { IPCMessage, IPCEventType } from '@shared/events';
import { SYSTEM_CONSTANTS } from '@shared/constants';
import { useDiagnosticsStore } from '@stores/diagnosticsStore';

type MessageHandler = (data: IPCMessage) => void;
type BinaryHandler = (data: ArrayBuffer) => void;

class IPCClientClass {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private binaryHandlers: Set<BinaryHandler> = new Set();
  private isConnecting = false;

  public connect() {
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}/api/ws`;
    
    try {
      this.ws = new WebSocket(socketUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('IPC Connected');
        useDiagnosticsStore.getState().addLog('IPC Bridge Connected to backend daemon.', 'success');
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this.binaryHandlers.forEach(h => h(event.data as ArrayBuffer));
          return;
        }

        try {
          const data: IPCMessage = JSON.parse(event.data);
          this.handlers.forEach(h => h(data));
          
          if (data.type === IPCEventType.INFO) useDiagnosticsStore.getState().addLog(data.message!, 'info');
          if (data.type === IPCEventType.SUCCESS) useDiagnosticsStore.getState().addLog(data.message!, 'success');
          if (data.type === IPCEventType.WARNING) useDiagnosticsStore.getState().addLog(data.message!, 'warning');
          if (data.type === IPCEventType.ERROR) useDiagnosticsStore.getState().addLog(data.message!, 'error');
        } catch (err) {
          console.error('Failed to parse IPC message', err);
        }
      };

      this.ws.onclose = () => {
        useDiagnosticsStore.getState().addLog('IPC Bridge Disconnected from backend daemon.', 'error');
        this.ws = null;
        this.isConnecting = false;
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      this.isConnecting = false;
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public send(action: IPCEventType, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, payload }));
    } else {
      console.warn('Cannot send IPC message: WebSocket not connected');
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
