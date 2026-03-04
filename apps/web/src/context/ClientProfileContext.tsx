'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
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

const CLIENT_SESSION_ROUTES = ['/cliente', '/reservar', '/reserva-confirmada'];

const isRouteOrChild = (path: string, route: string) =>
  path === route || path.startsWith(`${route}/`);

const shouldSkipClientProfileLoad = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return !CLIENT_SESSION_ROUTES.some((route) => isRouteOrChild(path, route));
};

export function ClientProfileProvider({
  children,
}: {
  children: ReactNode;
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
    if (shouldSkipClientProfileLoad()) {
      setProfile(null);
      setHasLoaded(true);
      setIsLoading(false);
      return;
    }
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
