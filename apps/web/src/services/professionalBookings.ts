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
import { buildIdempotencyKey } from '../../../../packages/shared/src/bookings/idempotency';
import {
  type ProfessionalBookingDtoBase,
  filterActiveItems,
  mapBookingCommandResponse,
  mapProfessionalBookingBase,
  normalizeArrayPayload,
  toApiReservationStatus,
} from '../../../../packages/shared/src/bookings/mappers';

type ProfessionalBookingDto = ProfessionalBookingDtoBase<
  BookingPaymentType,
  BookingFinancialSummary,
  BookingFinancialStatus,
  BookingRefundStatus,
  BookingPayoutStatus,
  BookingRefundRecord,
  BookingPayoutRecord,
  BookingPolicySnapshot
>;

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

const mapBooking = (booking: ProfessionalBookingDto): ProfessionalReservation => {
  return mapProfessionalBookingBase(booking, ({ startDateTime, timezone, startDateTimeUtc }) => ({
    date: formatBookingDateLabel(startDateTime, timezone, startDateTimeUtc),
    time: formatBookingTimeLabel(startDateTime, timezone, startDateTimeUtc),
  }));
};

const mapCommandResponse = (
  response: BookingCommandResponse<ProfessionalBookingDto>,
) => {
  return mapBookingCommandResponse(response, mapBooking);
};

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
  return normalizeArrayPayload<ProfessionalBookingDto>(response.data).map(mapBooking);
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
    { status: toApiReservationStatus(status as ReservationStatus) },
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
  return filterActiveItems<ProfessionalServiceDto>(response.data);
};
