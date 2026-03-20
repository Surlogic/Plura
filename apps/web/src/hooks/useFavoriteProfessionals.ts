import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getFavoriteProfessionals,
  removeFavoriteProfessional,
  subscribeFavoriteProfessionals,
  toggleFavoriteProfessional,
  type ClientFavoriteProfessional,
} from '@/services/clientFeatures';

export const useFavoriteProfessionals = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) => {
  return useFavoriteProfessionalsState({ enabled });
};

export const useFavoriteProfessionalsState = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) => {
  const [favorites, setFavorites] = useState<ClientFavoriteProfessional[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  useEffect(() => {
    if (!enabled) {
      setFavorites([]);
      setHasHydrated(true);
      return () => undefined;
    }

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
  }, [enabled]);

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
        return favoritesRef.current;
      }
    },
    [],
  );

  const removeFavorite = useCallback(async (slug: string) => {
    try {
      const next = await removeFavoriteProfessional(slug);
      setFavorites(next);
      setHasHydrated(true);
      return next;
    } catch {
      return favoritesRef.current;
    }
  }, []);

  return {
    favorites,
    hasHydrated,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  };
};
