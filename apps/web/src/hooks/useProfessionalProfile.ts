import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '@/services/api';
import { getProfessionalToken } from '@/services/session';

export type ProfessionalProfile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  rubro: string;
  location: string | null;
  tipoCliente: string;
};

export const useProfessionalProfile = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = getProfessionalToken();
    if (!token) {
      setIsLoading(false);
      router.push('/profesional/auth/login');
      return () => {
        cancelled = true;
      };
    }

    api
      .get('/auth/me/profesional', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (!cancelled) {
          setProfile(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          router.push('/profesional/auth/login');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { profile, isLoading };
};
