import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useClientProfileContext } from '@/context/ClientProfileContext';

export const useClientProfile = () => {
  const router = useRouter();
  const { profile, isLoading, hasLoaded, refreshProfile, clearProfile } =
    useClientProfileContext();

  useEffect(() => {
    if (!hasLoaded && !isLoading) {
      refreshProfile();
      return;
    }

    if (hasLoaded && !isLoading && !profile) {
      clearProfile();
      router.push('/cliente/auth/login');
    }
  }, [router, hasLoaded, isLoading, profile, refreshProfile, clearProfile]);

  return { profile, isLoading, hasLoaded };
};
