'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api from '@/services/api';
import type { ClientProfile } from '@/types/client';

type ClientProfileContextValue = {
  profile: ClientProfile | null;
  isLoading: boolean;
  hasLoaded: boolean;
  refreshProfile: () => Promise<void>;
  clearProfile: () => void;
};

const ClientProfileContext =
  createContext<ClientProfileContextValue | null>(null);

export function ClientProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setHasLoaded(true);
    setIsLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/auth/me/cliente');
      setProfile(response.data);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (hasLoaded || isLoading) return;
    refreshProfile();
  }, [hasLoaded, isLoading, refreshProfile]);

  const value = useMemo(
    () => ({ profile, isLoading, hasLoaded, refreshProfile, clearProfile }),
    [profile, isLoading, hasLoaded, refreshProfile, clearProfile],
  );

  return (
    <ClientProfileContext.Provider value={value}>
      {children}
    </ClientProfileContext.Provider>
  );
}

export const useClientProfileContext = () => {
  const context = useContext(ClientProfileContext);
  if (!context) {
    throw new Error(
      'useClientProfileContext must be used within ClientProfileProvider',
    );
  }
  return context;
};
