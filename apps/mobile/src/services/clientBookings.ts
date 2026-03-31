import api from './api';
import type {
  BookingActions,
  BookingCommandResponse,
  BookingFinancialSummary,
  BookingOperationalStatus,
  BookingPaymentSession,
  BookingPaymentType,
} from '../types/bookings';
import { buildIdempotencyKey } from '../../../../packages/shared/src/bookings/idempotency';
import {
  type ClientBookingDtoBase,
  type ClientBookingsResponseDto,
  mapClientBookingBase,
  resolveClientBookingsArray,
} from '../../../../packages/shared/src/bookings/mappers';
import { isAllowedMercadoPagoUrl } from './mercadoPagoBrowser';

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

type ClientBookingDto = ClientBookingDtoBase<
  BookingPaymentType,
  BookingFinancialSummary
>;

type ClientBookingsPayload = ClientBookingsResponseDto<ClientBookingDto>;

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

const mapBooking = (booking: ClientBookingDto): ClientDashboardBooking | null => {
  return mapClientBookingBase(booking, ({ startDateTime }) => ({
    date: formatDateLabel(startDateTime),
    time: formatTimeLabel(startDateTime),
  }));
};

export const getClientBookings = async (): Promise<ClientDashboardBooking[]> => {
  const response = await api.get<ClientBookingsPayload>('/bookings/me');

  return resolveClientBookingsArray(response.data)
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

  if (response.data.checkoutUrl && !isAllowedMercadoPagoUrl(response.data.checkoutUrl)) {
    throw new Error('URL de checkout no permitida');
  }

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
) => {
  const response = await api.post<BookingCommandResponse<ClientDashboardBooking>>(
    `/cliente/reservas/${bookingId}/reschedule`,
    {
      startDateTime,
    },
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`client-reschedule-${bookingId}`),
      },
    },
  );
  return response.data;
};
