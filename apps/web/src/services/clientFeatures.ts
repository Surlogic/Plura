import { isAxiosError } from 'axios';
import api from '@/services/api';

export type ClientFavoriteProfessional = {
  slug: string;
  name: string;
  category: string;
  location?: string;
  imageUrl?: string;
  headline?: string;
};

const FAVORITES_KEY = 'plura_client_favorite_professionals';
const FAVORITES_ENDPOINT = '/cliente/favoritos';
const FAVORITES_SERVER_SYNC_TTL_MS = 15000;

type FavoritesListener = (favorites: ClientFavoriteProfessional[]) => void;

const favoriteListeners = new Set<FavoritesListener>();
let hasStorageListener = false;
let lastServerFavoritesSyncAt = 0;

type FavoriteProfessionalDto = {
  slug?: string | null;
  fullName?: string | null;
  rubro?: string | null;
  location?: string | null;
  headline?: string | null;
  logoUrl?: string | null;
  categories?: Array<{ name?: string | null }> | null;
};

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const sanitizeFavorite = (value: unknown): ClientFavoriteProfessional | null => {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const slug = normalizeText(raw.slug);
  if (!slug) return null;

  const name = normalizeText(raw.name) || 'Profesional';
  const category = normalizeText(raw.category) || 'Profesional';
  const location = normalizeText(raw.location) || undefined;
  const imageUrl = normalizeText(raw.imageUrl) || undefined;
  const headline = normalizeText(raw.headline) || undefined;

  return {
    slug,
    name,
    category,
    ...(location ? { location } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(headline ? { headline } : {}),
  };
};

const dtoToFavorite = (value: FavoriteProfessionalDto): ClientFavoriteProfessional | null => {
  const categoryFromCategories = Array.isArray(value.categories)
    ? normalizeText(value.categories[0]?.name)
    : '';

  return sanitizeFavorite({
    slug: value.slug,
    name: value.fullName,
    category: categoryFromCategories || value.rubro,
    location: value.location,
    imageUrl: value.logoUrl,
    headline: value.headline,
  });
};

const readFavorites = (): ClientFavoriteProfessional[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();

    return parsed.reduce<ClientFavoriteProfessional[]>((accumulator, item) => {
      const favorite = sanitizeFavorite(item);
      if (!favorite || seen.has(favorite.slug)) return accumulator;

      seen.add(favorite.slug);
      accumulator.push(favorite);
      return accumulator;
    }, []);
  } catch {
    return [];
  }
};

const notifyFavoriteListeners = (favorites: ClientFavoriteProfessional[]) => {
  favoriteListeners.forEach((listener) => {
    try {
      listener(favorites);
    } catch {
      // Ignore listener failures to avoid breaking favorites persistence.
    }
  });
};

const writeFavorites = (favorites: ClientFavoriteProfessional[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
  notifyFavoriteListeners(favorites);
  return favorites;
};

const fetchServerFavorites = async (): Promise<ClientFavoriteProfessional[]> => {
  const response = await api.get<FavoriteProfessionalDto[]>(FAVORITES_ENDPOINT);
  const favorites = Array.isArray(response.data)
    ? response.data
        .map((item) => dtoToFavorite(item))
        .filter((item): item is ClientFavoriteProfessional => Boolean(item))
    : [];

  lastServerFavoritesSyncAt = Date.now();
  writeFavorites(favorites);
  return favorites;
};

const shouldRefreshServerFavorites = () =>
  Date.now() - lastServerFavoritesSyncAt > FAVORITES_SERVER_SYNC_TTL_MS;

const syncFavoritesFromServerIfPossible = async (): Promise<ClientFavoriteProfessional[] | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return await fetchServerFavorites();
  } catch (error) {
    if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
      return null;
    }
    throw error;
  }
};

const ensureStorageListener = () => {
  if (hasStorageListener || typeof window === 'undefined') return;

  window.addEventListener('storage', (event) => {
    if (event.key !== FAVORITES_KEY) return;
    notifyFavoriteListeners(readFavorites());
  });

  hasStorageListener = true;
};

export const getFavoriteProfessionals = async (): Promise<ClientFavoriteProfessional[]> => {
  if (typeof window === 'undefined') {
    return readFavorites();
  }

  try {
    return await fetchServerFavorites();
  } catch {
    return readFavorites();
  }
};

export const subscribeFavoriteProfessionals = (
  listener: FavoritesListener,
): (() => void) => {
  ensureStorageListener();
  favoriteListeners.add(listener);
  return () => {
    favoriteListeners.delete(listener);
  };
};

export const toggleFavoriteProfessional = async (
  favorite: ClientFavoriteProfessional,
): Promise<ClientFavoriteProfessional[]> => {
  const sanitized = sanitizeFavorite(favorite);
  if (!sanitized) return readFavorites();

  let favorites = readFavorites();
  if (shouldRefreshServerFavorites()) {
    const syncedFavorites = await syncFavoritesFromServerIfPossible();
    if (syncedFavorites) {
      favorites = syncedFavorites;
    }
  }
  const exists = favorites.some((item) => item.slug === sanitized.slug);

  if (typeof window !== 'undefined') {
    try {
      if (exists) {
        await api.delete(`${FAVORITES_ENDPOINT}/${encodeURIComponent(sanitized.slug)}`);
        return writeFavorites(favorites.filter((item) => item.slug !== sanitized.slug));
      }

      const response = await api.post<FavoriteProfessionalDto>(
        `${FAVORITES_ENDPOINT}/${encodeURIComponent(sanitized.slug)}`,
      );
      const saved = dtoToFavorite(response.data) || sanitized;
      return writeFavorites([saved, ...favorites.filter((item) => item.slug !== saved.slug)]);
    } catch (error) {
      if (!isAxiosError(error) || ![401, 403].includes(error.response?.status ?? 0)) {
        throw error;
      }
    }
  }

  const next = exists
    ? favorites.filter((item) => item.slug !== sanitized.slug)
    : [sanitized, ...favorites];
  return writeFavorites(next);
};

export const removeFavoriteProfessional = async (
  slug: string,
): Promise<ClientFavoriteProfessional[]> => {
  const normalizedSlug = normalizeText(slug);
  if (!normalizedSlug) return readFavorites();

  let favorites = readFavorites();
  if (shouldRefreshServerFavorites()) {
    const syncedFavorites = await syncFavoritesFromServerIfPossible();
    if (syncedFavorites) {
      favorites = syncedFavorites;
    }
  }

  if (typeof window !== 'undefined') {
    try {
      await api.delete(`${FAVORITES_ENDPOINT}/${encodeURIComponent(normalizedSlug)}`);
    } catch (error) {
      if (!isAxiosError(error) || ![401, 403].includes(error.response?.status ?? 0)) {
        throw error;
      }
    }
  }

  const next = favorites.filter((item) => item.slug !== normalizedSlug);
  return writeFavorites(next);
};

export const clearFavoriteProfessionals = () => {
  lastServerFavoritesSyncAt = 0;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(FAVORITES_KEY);
  }
  notifyFavoriteListeners([]);
};
