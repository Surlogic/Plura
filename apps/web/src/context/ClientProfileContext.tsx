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
import { isAuthSessionError } from '@/lib/auth/sessionErrors';
import type { ClientProfile } from '@/types/client';

type ClientProfileContextValue = {
  profile: ClientProfile | null;
  isLoading: boolean;
  hasLoaded: boolean;
  authStatus: 'unknown' | 'authenticated' | 'unauthenticated' | 'error';
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
  const [authStatus, setAuthStatus] = useState<
    'unknown' | 'authenticated' | 'unauthenticated' | 'error'
  >('unknown');

  const clearProfile = useCallback(() => {
    invalidateCachedGet('/auth/me/cliente');
    setProfile(null);
    setHasLoaded(true);
    setIsLoading(false);
    setAuthStatus('unauthenticated');
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
      setAuthStatus('authenticated');
    } catch (error) {
      if (isAuthSessionError(error)) {
        setProfile(null);
        setAuthStatus('unauthenticated');
      } else {
        setAuthStatus((prev) => (prev === 'authenticated' ? 'authenticated' : 'error'));
      }
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
    () => ({
      profile,
      isLoading,
      hasLoaded,
      authStatus,
      refreshProfile,
      clearProfile,
    }),
    [profile, isLoading, hasLoaded, authStatus, refreshProfile, clearProfile],
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
