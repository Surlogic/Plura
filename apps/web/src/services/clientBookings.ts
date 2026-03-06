import { cachedGet } from '@/services/cachedGet';

type ClientNextBookingDto = {
  id: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  startDateTime: string;
  serviceName: string;
  professionalName: string;
  professionalSlug?: string | null;
  professionalLocation?: string | null;
};

export type ClientDashboardNextBooking = {
  id: string;
  professional: string;
  service: string;
  date: string;
  time: string;
  location: string;
  status: 'CONFIRMED' | 'PENDING';
};

type ClientBookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

type ClientBookingDto = {
  id: number | string;
  status?: ClientBookingStatus | string | null;
  dateTime?: string | null;
  startDateTime?: string | null;
  serviceName?: string | null;
  professionalName?: string | null;
  professionalSlug?: string | null;
  professionalLocation?: string | null;
  service?: {
    name?: string | null;
  } | null;
  professional?: {
    name?: string | null;
    fullName?: string | null;
    location?: string | null;
  } | null;
};

type ClientBookingsResponseDto =
  | ClientBookingDto[]
  | {
      bookings?: ClientBookingDto[] | null;
      data?: ClientBookingDto[] | null;
      items?: ClientBookingDto[] | null;
      content?: ClientBookingDto[] | null;
    }
  | null;

export type ClientDashboardBooking = {
  id: string;
  professional: string;
  service: string;
  dateTime: string;
  date: string;
  time: string;
  location: string;
  status: ClientBookingStatus;
};

const formatDateLabel = (startDateTime: string) => {
  const parsed = new Date(startDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return startDateTime.split('T')[0] ?? '';
  }
  return parsed.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

const formatTimeLabel = (startDateTime: string) => {
  const parsed = new Date(startDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return startDateTime.split('T')[1]?.slice(0, 5) ?? '';
  }
  return parsed.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const normalizeBookingStatus = (rawStatus: unknown): ClientBookingStatus => {
  if (typeof rawStatus !== 'string') return 'PENDING';
  const status = rawStatus.toUpperCase().trim();
  if (status === 'CONFIRMED') return 'CONFIRMED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'COMPLETED') return 'COMPLETED';
  return 'PENDING';
};

const mapBooking = (booking: ClientBookingDto): ClientDashboardBooking | null => {
  const dateTime = (booking.dateTime || booking.startDateTime || '').trim();
  if (!dateTime) return null;

  return {
    id: String(booking.id),
    professional:
      booking.professional?.name ||
      booking.professional?.fullName ||
      booking.professionalName ||
      'Profesional',
    service: booking.service?.name || booking.serviceName || 'Servicio',
    dateTime,
    date: formatDateLabel(dateTime),
    time: formatTimeLabel(dateTime),
    location: booking.professional?.location || booking.professionalLocation || 'Ubicacion a confirmar',
    status: normalizeBookingStatus(booking.status),
  };
};

const resolveBookingsArray = (payload: ClientBookingsResponseDto): ClientBookingDto[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.bookings)) return payload.bookings;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  return [];
};

export const getClientBookings = async (): Promise<ClientDashboardBooking[]> => {
  const response = await cachedGet<ClientBookingsResponseDto>(
    '/bookings/me',
    undefined,
    { ttlMs: 15000, staleWhileRevalidate: true },
  );

  return resolveBookingsArray(response.data)
    .map(mapBooking)
    .filter((booking): booking is ClientDashboardBooking => Boolean(booking));
};

export const getClientNextBooking = async (): Promise<ClientDashboardNextBooking | null> => {
  const response = await cachedGet<ClientNextBookingDto | ''>(
    '/cliente/reservas/proxima',
    undefined,
    { ttlMs: 15000, staleWhileRevalidate: true },
  );

  if (!response.data || typeof response.data === 'string') {
    return null;
  }

  const status = response.data.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING';

  return {
    id: String(response.data.id),
    professional: response.data.professionalName,
    service: response.data.serviceName,
    date: formatDateLabel(response.data.startDateTime),
    time: formatTimeLabel(response.data.startDateTime),
    location: response.data.professionalLocation || 'Ubicacion a confirmar',
    status,
  };
};
