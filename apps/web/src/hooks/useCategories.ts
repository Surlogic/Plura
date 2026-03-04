import { useEffect, useState } from 'react';
import api from '@/services/api';
import type { Category } from '@/types/category';

let cachedCategories: Category[] | null = null;
let inflightPromise: Promise<Category[]> | null = null;

const fetchCategories = (): Promise<Category[]> => {
  if (cachedCategories) return Promise.resolve(cachedCategories);
  if (inflightPromise) return inflightPromise;

  inflightPromise = api
    .get<Category[]>('/categories')
    .then((response) => {
      const data = Array.isArray(response.data) ? response.data : [];
      cachedCategories = data;
      return data;
    })
    .finally(() => {
      inflightPromise = null;
    });

  return inflightPromise;
};

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? []);
  const [isLoading, setIsLoading] = useState(!cachedCategories);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedCategories) {
      setCategories(cachedCategories);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    setIsLoading(true);
    setError(null);
    fetchCategories()
      .then((data) => {
        if (isMounted) setCategories(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        if ((err as { name?: string }).name === 'CanceledError') return;
        setCategories([]);
        setError('No se pudieron cargar los rubros.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, isLoading, error };
};
