import React, { useEffect } from 'react';
import MainLayout from '@layouts/MainLayout';
import { IPCClient } from './ipc/client';
import { IPCEventType } from '@shared/events';
import { useAppStore } from './stores/appStore';

export default function App() {
  const setConfigFromServer = useAppStore(state => state.setConfigFromServer);
  const setProfilesFromServer = useAppStore(state => state.setProfilesFromServer);

  useEffect(() => {
    const unsubscribeConfig = IPCClient.subscribe(IPCEventType.CONFIG_SYNC, (data) => {
      setConfigFromServer(data as any);
    });
    
    const unsubscribeProfile = IPCClient.subscribe(IPCEventType.PROFILE_SYNC, (data) => {
      setProfilesFromServer(data as any);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeProfile();
    };
  }, [setConfigFromServer, setProfilesFromServer]);

  return <MainLayout />;
}
