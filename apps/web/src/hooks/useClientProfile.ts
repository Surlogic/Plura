import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useClientProfileContext } from '@/context/ClientProfileContext';

export const useClientProfile = () => {
  const router = useRouter();
  const { profile, isLoading, hasLoaded, authStatus, clearProfile } = useClientProfileContext();

  useEffect(() => {
    if (hasLoaded && !isLoading && !profile && authStatus === 'unauthenticated') {
      clearProfile();
      router.push('/cliente/auth/login');
    }
  }, [router, hasLoaded, isLoading, profile, authStatus, clearProfile]);

  return { profile, isLoading, hasLoaded, authStatus };
};
