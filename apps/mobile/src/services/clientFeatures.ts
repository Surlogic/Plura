import api from './api';
import { getJsonItem, setJsonItem } from './storage';
import { getProfessionalToken } from './session';

export type ClientNextBooking = {
  id: string;
  professional: string;
  service: string;
  date: string;
  time: string;
  location: string;
  status: 'CONFIRMED' | 'PENDING';
};

type ClientNextBookingDto = {
  id: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  startDateTime: string;
  serviceName: string;
  professionalName: string;
  professionalLocation?: string | null;
};

type ClientPreferenceState = {
  emailReminders: boolean;
  pushReminders: boolean;
  marketing: boolean;
};

const FAVORITES_KEY = 'plura_client_favorites';
const FAVORITES_ENDPOINT = '/cliente/favoritos';
const PREFERENCES_KEY = 'plura_client_preferences';
type FavoritesListener = (favorites: string[]) => void;
const favoriteListeners = new Set<FavoritesListener>();

type FavoriteProfessionalDto = {
  slug?: string | null;
};

const parseDate = (dateTime: string) => {
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    const [date = '', time = ''] = dateTime.split('T');
    return { date, time: time.slice(0, 5) };
  }

  return {
    date: parsed.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }),
    time: parsed.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
};

export const getClientNextBooking = async (): Promise<ClientNextBooking | null> => {
  const response = await api.get<ClientNextBookingDto | ''>('/cliente/reservas/proxima');

  if (!response.data || typeof response.data === 'string') {
    return null;
  }

  const parsed = parseDate(response.data.startDateTime);
  return {
    id: String(response.data.id),
    professional: response.data.professionalName,
    service: response.data.serviceName,
    date: parsed.date,
    time: parsed.time,
    location: response.data.professionalLocation || 'Ubicacion a confirmar',
    status: response.data.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
  };
};

export const getFavoriteProfessionalSlugs = async (): Promise<string[]> => {
  const token = await getProfessionalToken();
  if (!token) {
    return getJsonItem<string[]>(FAVORITES_KEY, []);
  }

  try {
    const response = await api.get<FavoriteProfessionalDto[]>(FAVORITES_ENDPOINT);
    const next = Array.isArray(response.data)
      ? response.data
          .map((item) => (typeof item?.slug === 'string' ? item.slug.trim() : ''))
          .filter(Boolean)
      : [];
    await setJsonItem(FAVORITES_KEY, next);
    return next;
  } catch {
    return getJsonItem<string[]>(FAVORITES_KEY, []);
  }
};

const notifyFavoriteListeners = (favorites: string[]) => {
  favoriteListeners.forEach((listener) => {
    try {
      listener(favorites);
    } catch {
      // Ignore listener failures to avoid breaking favorites persistence.
    }
  });
};

export const subscribeFavoriteProfessionalSlugs = (listener: FavoritesListener): (() => void) => {
  favoriteListeners.add(listener);
  return () => {
    favoriteListeners.delete(listener);
  };
};

export const toggleFavoriteProfessionalSlug = async (slug: string): Promise<string[]> => {
  const favorites = await getFavoriteProfessionalSlugs();
  const exists = favorites.includes(slug);
  const token = await getProfessionalToken();

  if (token) {
    try {
      if (exists) {
        await api.delete(`${FAVORITES_ENDPOINT}/${encodeURIComponent(slug)}`);
      } else {
        await api.post(`${FAVORITES_ENDPOINT}/${encodeURIComponent(slug)}`);
      }
    } catch {
      // Fall back to local persistence if backend sync is unavailable.
    }
  }

  const next = exists ? favorites.filter((item) => item !== slug) : [slug, ...favorites];
  await setJsonItem(FAVORITES_KEY, next);
  notifyFavoriteListeners(next);
  return next;
};

export const getClientPreferences = async (): Promise<ClientPreferenceState> =>
  getJsonItem<ClientPreferenceState>(PREFERENCES_KEY, {
    emailReminders: true,
    pushReminders: false,
    marketing: false,
  });

export const updateClientPreferences = async (
  patch: Partial<ClientPreferenceState>,
): Promise<ClientPreferenceState> => {
  const current = await getClientPreferences();
  const next = { ...current, ...patch };
  await setJsonItem(PREFERENCES_KEY, next);
  return next;
};

export type MobileNotification = {
  id: string;
  title: string;
  body: string;
  type: 'booking' | 'system';
  createdAt: string;
};

export const buildClientNotifications = async (): Promise<MobileNotification[]> => {
  const items: MobileNotification[] = [
    {
      id: 'system-welcome',
      title: 'Bienvenido a Plura Mobile',
      body: 'Tu experiencia mobile ya incluye exploracion, reservas y panel profesional.',
      type: 'system',
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    const nextBooking = await getClientNextBooking();
    if (nextBooking) {
      items.unshift({
        id: `booking-${nextBooking.id}`,
        title: 'Tu proximo turno esta confirmado',
        body: `${nextBooking.service} con ${nextBooking.professional} - ${nextBooking.date} ${nextBooking.time}`,
        type: 'booking',
        createdAt: new Date().toISOString(),
      });
    }
  } catch {
    // Keep system notifications only.
  }

  return items;
};
