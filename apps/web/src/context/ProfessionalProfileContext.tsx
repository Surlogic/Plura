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
import { getProfessionalToken } from '@/services/session';
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

export function ProfessionalProfileProvider({
  children,
}: {
  children: React.ReactNode;
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
    const token = getProfessionalToken();
    if (!token) {
      clearProfile();
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get('/auth/me/profesional', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(response.data);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [clearProfile]);

  useEffect(() => {
    if (hasLoaded || isLoading) return;
    refreshProfile();
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
