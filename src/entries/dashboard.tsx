import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import '../index.css';
import { IPCClient } from '../ipc/client';
import MainLayout from '../layouts/MainLayout';
import { useAppStore } from '../stores/appStore';

function DashboardApp() {
  const setConfigFromServer = useAppStore(state => state.setConfigFromServer);
  const setProfilesFromServer = useAppStore(state => state.setProfilesFromServer);

  useEffect(() => {
    IPCClient.connect();

    const unsubscribeConfig = IPCClient.subscribe((data) => {
      if (data.type === 'CONFIG_SYNC') setConfigFromServer(data as any);
    });
    
    const unsubscribeProfile = IPCClient.subscribe((data) => {
      if (data.type === 'PROFILE_SYNC') setProfilesFromServer(data as any);
    });

    // Fetch initial state natively
    // @ts-ignore
    if (window.api && window.api.getConfig) {
      // @ts-ignore
      window.api.getConfig().then(c => setConfigFromServer({ payload: c }));
      // @ts-ignore
      window.api.getProfiles().then(p => setProfilesFromServer({ payload: p }));
    }

    return () => {
      unsubscribeConfig();
      unsubscribeProfile();
      IPCClient.disconnect();
    };
  }, [setConfigFromServer, setProfilesFromServer]);

  return <MainLayout />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DashboardApp />
  </StrictMode>,
);
