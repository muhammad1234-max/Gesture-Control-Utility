import { contextBridge, ipcRenderer } from 'electron';

const apiObj = {
  // Generic IPC messaging
  send: (action: string, payload?: any) => {
    return ipcRenderer.invoke('ipc-message', JSON.stringify({ action, payload }));
  },
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  
  // Send data to python daemon process
  sendDaemonCommand: (payload: string) => ipcRenderer.invoke('send-daemon-command', payload),
  startDaemon: () => ipcRenderer.invoke('start-daemon'),
  stopDaemon: () => ipcRenderer.invoke('stop-daemon'),
  
  // Store access
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
  storeSet: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // Event Listeners
  onBroadcast: (callback: (data: any) => void) => {
    ipcRenderer.on('ipc-broadcast', (_event, value) => callback(JSON.parse(value)));
  },
  
  onBinary: (callback: (data: Uint8Array) => void) => {
    ipcRenderer.on('ipc-binary', (_event, value) => callback(new Uint8Array(value)));
  },

  // Cleanup
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('ipc-broadcast');
    ipcRenderer.removeAllListeners('ipc-binary');
  }
};

try {
  contextBridge.exposeInMainWorld('api', apiObj);
} catch (e) {
  // contextIsolation is false
  (window as any).api = apiObj;
}
