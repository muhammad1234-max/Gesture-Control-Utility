import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import '../index.css';
import { IPCClient } from '../ipc/client';
import SettingsView from '../views/SettingsView';
import { useAppStore } from '../stores/appStore';

function SettingsApp() {
  const setConfigFromServer = useAppStore(state => state.setConfigFromServer);

  useEffect(() => {
    IPCClient.connect();

    // Fetch initial state natively
    // @ts-ignore
    if (window.api && window.api.getConfig) {
      // @ts-ignore
      window.api.getConfig().then(c => setConfigFromServer({ payload: c }));
    }

    return () => {
      IPCClient.disconnect();
    };
  }, [setConfigFromServer]);

  return (
    <div className="bg-[#0c0e12] h-screen max-h-screen text-slate-200 font-sans p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>
        <SettingsView />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>,
);
