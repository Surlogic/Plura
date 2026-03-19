import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';

export const useProfessionalProfile = () => {
  const router = useRouter();
  const { profile, isLoading, hasLoaded, refreshProfile, clearProfile } =
    useProfessionalProfileContext();

  useEffect(() => {
    if (hasLoaded && !isLoading && !profile) {
      clearProfile();
      router.push('/profesional/auth/login');
    }
  }, [router, hasLoaded, isLoading, profile, clearProfile]);

  return { profile, isLoading, hasLoaded, refreshProfile };
};
