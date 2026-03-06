import api from './api';
import { getJsonItem, setJsonItem } from './storage';

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
const PREFERENCES_KEY = 'plura_client_preferences';

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

export const getFavoriteProfessionalSlugs = async (): Promise<string[]> =>
  getJsonItem<string[]>(FAVORITES_KEY, []);

export const toggleFavoriteProfessionalSlug = async (slug: string): Promise<string[]> => {
  const favorites = await getFavoriteProfessionalSlugs();
  const exists = favorites.includes(slug);
  const next = exists ? favorites.filter((item) => item !== slug) : [slug, ...favorites];
  await setJsonItem(FAVORITES_KEY, next);
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
