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
import type { ProfessionalProfile } from '@/types/professional';

type ProfessionalProfileContextValue = {
  profile: ProfessionalProfile | null;
  isLoading: boolean;
  hasLoaded: boolean;
  authStatus: 'unknown' | 'authenticated' | 'unauthenticated' | 'error';
  refreshProfile: () => Promise<void>;
  clearProfile: () => void;
};

const ProfessionalProfileContext =
  createContext<ProfessionalProfileContextValue | null>(null);

const PROFESSIONAL_PROFILE_ENDPOINT = '/auth/me/profesional';

export function ProfessionalProfileProvider({
  children,
  autoLoad = false,
}: {
  children: ReactNode;
  autoLoad?: boolean;
}) {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [authStatus, setAuthStatus] = useState<
    'unknown' | 'authenticated' | 'unauthenticated' | 'error'
  >('unknown');

  const clearProfile = useCallback(() => {
    invalidateCachedGet(PROFESSIONAL_PROFILE_ENDPOINT);
    setProfile(null);
    setHasLoaded(true);
    setIsLoading(false);
    setAuthStatus('unauthenticated');
  }, []);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await cachedGet<ProfessionalProfile>(
        PROFESSIONAL_PROFILE_ENDPOINT,
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
        setAuthStatus(profile ? 'authenticated' : 'error');
      }
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [profile]);

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
    <ProfessionalProfileContext.Provider value={value}>
      {children}
    </ProfessionalProfileContext.Provider>
  );
}

export const useProfessionalProfileContext = () => {
  const context = useContext(ProfessionalProfileContext);
  if (!context) {
    throw new Error(
      'useProfessionalProfileContext must be used within ProfessionalProfileProvider',
    );
  }
  return context;
};
