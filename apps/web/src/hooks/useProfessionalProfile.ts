import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getProfessionalToken } from '@/services/session';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';

export const useProfessionalProfile = () => {
  const router = useRouter();
  const { profile, isLoading, hasLoaded, refreshProfile, clearProfile } =
    useProfessionalProfileContext();

  useEffect(() => {
    const token = getProfessionalToken();
    if (!token) {
      clearProfile();
      router.push('/profesional/auth/login');
      return;
    }

    if (!hasLoaded && !isLoading) {
      refreshProfile();
      return;
    }

    if (hasLoaded && !isLoading && !profile) {
      router.push('/profesional/auth/login');
    }
  }, [router, hasLoaded, isLoading, profile, refreshProfile, clearProfile]);

  return { profile, isLoading, hasLoaded };
};
