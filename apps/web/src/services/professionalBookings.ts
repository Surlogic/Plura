import api from '@/services/api';
import { cachedGet, invalidateCachedGet } from '@/services/cachedGet';
import type {
  BookingActions,
  BookingCommandResponse,
  BookingFinancialStatus,
  BookingFinancialSummary,
  BookingPaymentType,
  BookingPolicySnapshot,
  BookingPayoutRecord,
  BookingPayoutStatus,
  BookingRefundRecord,
  BookingRefundStatus,
} from '@/types/bookings';
import type { ProfessionalReservation, ReservationStatus } from '@/types/professional';
import { formatBookingDateLabel, formatBookingTimeLabel } from '@/utils/bookings';

type ApiReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

type ProfessionalBookingDto = {
  id: number;
  userId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  startDateTime: string;
  startDateTimeUtc?: string | null;
  timezone?: string | null;
  duration?: string;
  postBufferMinutes?: number;
  effectiveDurationMinutes?: number;
  paymentType?: BookingPaymentType | null;
  rescheduleCount?: number;
  paymentStatus?: BookingFinancialStatus | null;
  refundStatus?: BookingRefundStatus | null;
  payoutStatus?: BookingPayoutStatus | null;
  financialSummary?: BookingFinancialSummary | null;
  latestRefund?: BookingRefundRecord | null;
  latestPayout?: BookingPayoutRecord | null;
  policySnapshot?: BookingPolicySnapshot | null;
  status: ApiReservationStatus;
};

type ProfessionalBookingCreatePayload = {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceId: string;
  startDateTime: string;
};

type ProfessionalServiceDto = {
  id: string;
  name: string;
  active?: boolean;
};

const toFrontendStatus = (status: ApiReservationStatus): ReservationStatus => {
  switch (status) {
    case 'PENDING':
      return 'pending';
    case 'CONFIRMED':
      return 'confirmed';
    case 'CANCELLED':
      return 'cancelled';
    case 'COMPLETED':
      return 'completed';
    case 'NO_SHOW':
      return 'no_show';
    default:
      return 'pending';
  }
};

const toApiStatus = (status: ReservationStatus): ApiReservationStatus => {
  switch (status) {
    case 'pending':
      return 'PENDING';
    case 'confirmed':
      return 'CONFIRMED';
    case 'cancelled':
      return 'CANCELLED';
    case 'completed':
      return 'COMPLETED';
    case 'no_show':
      return 'NO_SHOW';
    default:
      return 'PENDING';
  }
};

const mapBooking = (booking: ProfessionalBookingDto): ProfessionalReservation => {
  const timezone = booking.timezone || null;
  const startDateTimeUtc = booking.startDateTimeUtc || null;
  return {
    id: String(booking.id),
    serviceName: booking.serviceName,
    clientName: booking.clientName,
    date: formatBookingDateLabel(booking.startDateTime, timezone, startDateTimeUtc),
    time: formatBookingTimeLabel(booking.startDateTime, timezone, startDateTimeUtc),
    duration: booking.duration,
    postBufferMinutes: booking.postBufferMinutes ?? 0,
    effectiveDurationMinutes: booking.effectiveDurationMinutes,
    status: toFrontendStatus(booking.status),
    serviceId: booking.serviceId,
    userId: booking.userId,
    paymentType: booking.paymentType || null,
    financialSummary: booking.financialSummary || null,
    paymentStatus: booking.paymentStatus || booking.financialSummary?.financialStatus || null,
    refundStatus: booking.refundStatus || 'NONE',
    payoutStatus: booking.payoutStatus || 'NONE',
    latestRefund: booking.latestRefund || null,
    latestPayout: booking.latestPayout || null,
    policySnapshot: booking.policySnapshot || null,
    timezone,
    startDateTimeUtc,
  };
};

const mapCommandResponse = (
  response: BookingCommandResponse<ProfessionalBookingDto>,
) => {
  const booking = response.booking ? mapBooking(response.booking) : null;
  return {
    ...response,
    booking,
  };
};

const buildIdempotencyKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const invalidateProfessionalBookingCaches = () => {
  invalidateCachedGet('/profesional/reservas');
  invalidateCachedGet('/reservas/');
};

export const getProfessionalReservationsByDate = async (
  date: string,
): Promise<ProfessionalReservation[]> => {
  return getProfessionalReservationsByRange(date, date);
};

export const getProfessionalReservationsByRange = async (
  dateFrom: string,
  dateTo: string,
): Promise<ProfessionalReservation[]> => {
  const response = await cachedGet<ProfessionalBookingDto[]>(
    '/profesional/reservas',
    {
      params: { dateFrom, dateTo },
    },
    {
      ttlMs: 8000,
      staleWhileRevalidate: true,
    },
  );
  return response.data.map(mapBooking);
};

export const getProfessionalReservationsForDates = async (
  dates: string[],
): Promise<ProfessionalReservation[]> => {
  const uniqueDates = Array.from(new Set(dates.filter(Boolean))).sort();
  if (uniqueDates.length === 0) return [];
  const dateFrom = uniqueDates[0];
  const dateTo = uniqueDates[uniqueDates.length - 1];
  return getProfessionalReservationsByRange(dateFrom, dateTo);
};

export const updateProfessionalReservationStatus = async (
  id: string,
  status: ReservationStatus,
): Promise<ProfessionalReservation> => {
  const response = await api.put<ProfessionalBookingDto>(
    `/profesional/reservas/${id}`,
    { status: toApiStatus(status) },
  );
  invalidateProfessionalBookingCaches();
  return mapBooking(response.data);
};

export const createProfessionalReservation = async (
  payload: ProfessionalBookingCreatePayload,
): Promise<ProfessionalReservation> => {
  const response = await api.post<ProfessionalBookingDto>('/profesional/reservas', payload);
  invalidateProfessionalBookingCaches();
  return mapBooking(response.data);
};

export const getProfessionalBookingActions = async (bookingId: string) => {
  const response = await api.get<BookingActions>(`/reservas/${bookingId}/actions`);
  return response.data;
};

export const cancelProfessionalBooking = async (
  bookingId: string,
  reason?: string,
) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/cancel`,
    reason?.trim() ? { reason: reason.trim() } : {},
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-cancel-${bookingId}`),
      },
    },
  );
  invalidateProfessionalBookingCaches();
  return mapCommandResponse(response.data);
};

export const rescheduleProfessionalBooking = async (
  bookingId: string,
  startDateTime: string,
  timezone?: string,
) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/reschedule`,
    {
      startDateTime,
      timezone: timezone?.trim() || undefined,
    },
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-reschedule-${bookingId}`),
      },
    },
  );
  invalidateProfessionalBookingCaches();
  return mapCommandResponse(response.data);
};

export const markProfessionalBookingNoShow = async (bookingId: string) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/no-show`,
    {},
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-no-show-${bookingId}`),
      },
    },
  );
  invalidateProfessionalBookingCaches();
  return mapCommandResponse(response.data);
};

export const completeProfessionalBooking = async (bookingId: string) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/complete`,
    {},
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-complete-${bookingId}`),
      },
    },
  );
  invalidateProfessionalBookingCaches();
  return mapCommandResponse(response.data);
};

export const retryProfessionalBookingPayout = async (bookingId: string) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/payout/retry`,
    {},
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-retry-payout-${bookingId}`),
      },
    },
  );
  invalidateProfessionalBookingCaches();
  return mapCommandResponse(response.data);
};

export const listProfessionalServices = async (): Promise<ProfessionalServiceDto[]> => {
  const response = await cachedGet<ProfessionalServiceDto[]>(
    '/profesional/services',
    undefined,
    {
      ttlMs: 15000,
      staleWhileRevalidate: true,
    },
  );
  const services = Array.isArray(response.data) ? response.data : [];
  return services.filter((service) => service?.active !== false);
};
