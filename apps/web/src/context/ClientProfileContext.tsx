import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cachedGet } from '@/services/cachedGet';
import { invalidateCachedGet } from '@/services/cachedGet';
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
  autoLoad = false,
}: {
  children: ReactNode;
  autoLoad?: boolean;
}) {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const clearProfile = useCallback(() => {
    invalidateCachedGet('/auth/me/cliente');
    setProfile(null);
    setHasLoaded(true);
    setIsLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await cachedGet<ClientProfile>(
        '/auth/me/cliente',
        undefined,
        { ttlMs: 15000 },
      );
      setProfile(response.data);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  const refreshProfileRef = useRef(refreshProfile);

  useEffect(() => {
    refreshProfileRef.current = refreshProfile;
  }, [refreshProfile]);

  useEffect(() => {
    if (!autoLoad || hasLoaded || isLoading) return;
    void refreshProfileRef.current();
  }, [autoLoad, hasLoaded, isLoading]);

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
