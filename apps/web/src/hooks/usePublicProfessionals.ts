import { useEffect, useState } from 'react';
import { cachedGet } from '@/services/cachedGet';
import type { PublicProfessionalSummary } from '@/types/professional';

type UsePublicProfessionalsOptions = {
  limit?: number;
  categoryId?: string;
  categorySlug?: string;
};

export const usePublicProfessionals = (options?: UsePublicProfessionalsOptions) => {
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
        const response = await cachedGet<PublicProfessionalSummary[]>(
          '/public/profesionales',
          {
            params: {
              ...(options?.limit ? { limit: options.limit } : {}),
              ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
              ...(options?.categorySlug ? { categorySlug: options.categorySlug } : {}),
            },
            signal: controller.signal,
          },
          {
            ttlMs: 30000,
            staleWhileRevalidate: true,
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
  }, [options?.limit, options?.categoryId, options?.categorySlug]);

  return { professionals, isLoading, error };
};
