import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useClientProfileContext } from '@/context/ClientProfileContext';

export const useClientProfile = () => {
  const router = useRouter();
  const { profile, isLoading, hasLoaded, clearProfile } = useClientProfileContext();

  useEffect(() => {
    if (hasLoaded && !isLoading && !profile) {
      clearProfile();
      router.push('/cliente/auth/login');
    }
  }, [router, hasLoaded, isLoading, profile, clearProfile]);

  return { profile, isLoading, hasLoaded };
};
