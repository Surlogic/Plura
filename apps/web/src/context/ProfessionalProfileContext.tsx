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
}: {
  children: ReactNode;
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
          const response = await api.get<ProfessionalProfile>(endpoint);
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

  useEffect(() => {
    if (hasLoaded || isLoading) return;
    void refreshProfile();
  }, [hasLoaded, isLoading, refreshProfile]);

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
