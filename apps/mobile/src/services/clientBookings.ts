import api from './api';
import type {
  BookingActions,
  BookingCommandResponse,
  BookingFinancialSummary,
  BookingOperationalStatus,
  BookingPaymentSession,
  BookingPaymentType,
} from '../types/bookings';

export type ClientDashboardBooking = {
  id: string;
  professional: string;
  service: string;
  dateTime: string;
  date: string;
  time: string;
  location: string;
  status: BookingOperationalStatus;
  professionalSlug?: string | null;
  serviceId?: string | null;
  paymentType?: BookingPaymentType | null;
  financialSummary?: BookingFinancialSummary | null;
};

type ClientBookingDto = {
  id: number | string;
  status?: string | null;
  dateTime?: string | null;
  startDateTime?: string | null;
  timezone?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  paymentType?: BookingPaymentType | null;
  financialSummary?: BookingFinancialSummary | null;
  professionalName?: string | null;
  professionalSlug?: string | null;
  professionalLocation?: string | null;
  service?: {
    id?: string | null;
    name?: string | null;
  } | null;
  professional?: {
    name?: string | null;
    fullName?: string | null;
    location?: string | null;
    slug?: string | null;
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

const normalizeBookingStatus = (rawStatus: unknown): BookingOperationalStatus => {
  if (typeof rawStatus !== 'string') return 'PENDING';
  const status = rawStatus.toUpperCase().trim();
  if (status === 'CONFIRMED') return 'CONFIRMED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'NO_SHOW') return 'NO_SHOW';
  return 'PENDING';
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

const mapBooking = (booking: ClientBookingDto): ClientDashboardBooking | null => {
  const dateTime = (booking.dateTime || booking.startDateTime || '').trim();
  if (!dateTime) return null;

  return {
    id: String(booking.id),
    professional:
      booking.professional?.name
      || booking.professional?.fullName
      || booking.professionalName
      || 'Profesional',
    service: booking.service?.name || booking.serviceName || 'Servicio',
    dateTime,
    date: formatDateLabel(dateTime),
    time: formatTimeLabel(dateTime),
    location: booking.professional?.location || booking.professionalLocation || 'Ubicacion a confirmar',
    status: normalizeBookingStatus(booking.status),
    professionalSlug: booking.professional?.slug || booking.professionalSlug || null,
    serviceId: booking.service?.id || booking.serviceId || null,
    paymentType: booking.paymentType || null,
    financialSummary: booking.financialSummary || null,
  };
};

const buildIdempotencyKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getClientBookings = async (): Promise<ClientDashboardBooking[]> => {
  const response = await api.get<ClientBookingsResponseDto>('/bookings/me');

  return resolveBookingsArray(response.data)
    .map(mapBooking)
    .filter((booking): booking is ClientDashboardBooking => Boolean(booking));
};

export const getBookingActions = async (bookingId: string) => {
  const response = await api.get<BookingActions>(`/reservas/${bookingId}/actions`);
  return response.data;
};

export const createClientBookingPaymentSession = async (
  bookingId: string,
  provider?: string,
) => {
  const response = await api.post<BookingPaymentSession>(
    `/cliente/reservas/${bookingId}/payment-session`,
    provider ? { provider } : {},
  );
  return response.data;
};

export const cancelClientBooking = async (
  bookingId: string,
  reason?: string,
) => {
  const response = await api.post<BookingCommandResponse<ClientDashboardBooking>>(
    `/cliente/reservas/${bookingId}/cancel`,
    reason?.trim() ? { reason: reason.trim() } : {},
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`client-cancel-${bookingId}`),
      },
    },
  );
  return response.data;
};

export const rescheduleClientBooking = async (
  bookingId: string,
  startDateTime: string,
  timezone?: string,
) => {
  const response = await api.post<BookingCommandResponse<ClientDashboardBooking>>(
    `/cliente/reservas/${bookingId}/reschedule`,
    {
      startDateTime,
      timezone: timezone?.trim() || undefined,
    },
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`client-reschedule-${bookingId}`),
      },
    },
  );
  return response.data;
};
