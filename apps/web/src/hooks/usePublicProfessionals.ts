import { useEffect, useState } from 'react';
import api from '@/services/api';
import type { PublicProfessionalSummary } from '@/types/professional';

export const usePublicProfessionals = (limit?: number) => {
  const [professionals, setProfessionals] = useState<
    PublicProfessionalSummary[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadProfessionals = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<PublicProfessionalSummary[]>(
          '/public/profesionales',
          {
            params: limit ? { limit } : undefined,
            signal: controller.signal,
          },
        );
        if (!isMounted) return;
        setProfessionals(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (!isMounted) return;
        if ((err as { name?: string }).name === 'CanceledError') return;
        setProfessionals([]);
        setError('No se pudieron cargar los profesionales.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfessionals();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [limit]);

  return { professionals, isLoading, error };
};
