'use client';

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
import type { ProfessionalProfile } from '@/types/professional';

type ProfessionalProfileContextValue = {
  profile: ProfessionalProfile | null;
  isLoading: boolean;
  hasLoaded: boolean;
  refreshProfile: () => Promise<void>;
  clearProfile: () => void;
};

const ProfessionalProfileContext =
  createContext<ProfessionalProfileContextValue | null>(null);

const PROFESSIONAL_PROFILE_ENDPOINTS = [
  '/auth/me/profesional',
  '/auth/me/professional',
];

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

  const clearProfile = useCallback(() => {
    setProfile(null);
    setHasLoaded(true);
    setIsLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      let loadedProfile: ProfessionalProfile | null = null;

      for (let index = 0; index < PROFESSIONAL_PROFILE_ENDPOINTS.length; index += 1) {
        const endpoint = PROFESSIONAL_PROFILE_ENDPOINTS[index];
        try {
          const response = await cachedGet<ProfessionalProfile>(endpoint, undefined, {
            ttlMs: 15000,
          });
          loadedProfile = response.data;
          break;
        } catch (error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          const isLastEndpoint = index === PROFESSIONAL_PROFILE_ENDPOINTS.length - 1;
          if (status === 401 || status === 403) {
            loadedProfile = null;
            break;
          }
          if (status !== 404 || isLastEndpoint) {
            throw error;
          }
        }
      }

      setProfile(loadedProfile);
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
