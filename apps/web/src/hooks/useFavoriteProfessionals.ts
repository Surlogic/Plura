import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getFavoriteProfessionals,
  removeFavoriteProfessional,
  subscribeFavoriteProfessionals,
  toggleFavoriteProfessional,
  type ClientFavoriteProfessional,
} from '@/services/clientFeatures';

export const useFavoriteProfessionals = () => {
  const [favorites, setFavorites] = useState<ClientFavoriteProfessional[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getFavoriteProfessionals()
      .then((items) => {
        if (!isMounted) return;
        setFavorites(items);
        setHasHydrated(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setFavorites([]);
        setHasHydrated(true);
      });

    const unsubscribe = subscribeFavoriteProfessionals((next) => {
      setFavorites(next);
      setHasHydrated(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const favoriteSlugs = useMemo(
    () => new Set(favorites.map((item) => item.slug)),
    [favorites],
  );

  const isFavorite = useCallback(
    (slug?: string | null) => {
      const normalizedSlug = typeof slug === 'string' ? slug.trim() : '';
      return normalizedSlug ? favoriteSlugs.has(normalizedSlug) : false;
    },
    [favoriteSlugs],
  );

  const toggleFavorite = useCallback(
    async (favorite: ClientFavoriteProfessional) => {
      try {
        const next = await toggleFavoriteProfessional(favorite);
        setFavorites(next);
        setHasHydrated(true);
        return next;
      } catch {
        return favorites;
      }
    },
    [favorites],
  );

  const removeFavorite = useCallback(async (slug: string) => {
    try {
      const next = await removeFavoriteProfessional(slug);
      setFavorites(next);
      setHasHydrated(true);
      return next;
    } catch {
      return favorites;
    }
  }, [favorites]);

  return {
    favorites,
    hasHydrated,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  };
};
