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
