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
import type { ProfessionalBookingTimelineResponse } from '@/types/professionalBookingTimeline';
import type { ProfessionalReservation, ReservationStatus } from '@/types/professional';
import {
  formatBookingDateKey,
  formatBookingTimeKey,
} from '@/utils/bookings';
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
    date: formatBookingDateKey(startDateTime, timezone, startDateTimeUtc),
    time: formatBookingTimeKey(startDateTime, timezone, startDateTimeUtc),
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
  invalidateCachedGet('/profesional/reservas/');
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const parseDateKeyUtc = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return Date.UTC(year, month - 1, day);
};

const buildContiguousDateRanges = (dates: string[]) => {
  const uniqueDates = Array.from(new Set(dates.filter(Boolean))).sort();
  if (uniqueDates.length === 0) return [];

  const ranges: Array<{ dateFrom: string; dateTo: string }> = [];
  let rangeStart = uniqueDates[0];
  let previousDate = uniqueDates[0];
  let previousTimestamp = parseDateKeyUtc(previousDate);

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const currentDate = uniqueDates[index];
    const currentTimestamp = parseDateKeyUtc(currentDate);
    const isContiguous =
      previousTimestamp !== null &&
      currentTimestamp !== null &&
      currentTimestamp - previousTimestamp === DAY_IN_MS;

    if (!isContiguous) {
      ranges.push({ dateFrom: rangeStart, dateTo: previousDate });
      rangeStart = currentDate;
    }

    previousDate = currentDate;
    previousTimestamp = currentTimestamp;
  }

  ranges.push({ dateFrom: rangeStart, dateTo: previousDate });
  return ranges;
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
  const ranges = buildContiguousDateRanges(dates);
  if (ranges.length === 0) return [];

  const responses = await Promise.all(
    ranges.map(({ dateFrom, dateTo }) => getProfessionalReservationsByRange(dateFrom, dateTo)),
  );

  const deduped = new Map<string, ProfessionalReservation>();
  responses.flat().forEach((reservation) => {
    deduped.set(reservation.id, reservation);
  });

  return Array.from(deduped.values());
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
  const response = await cachedGet<BookingActions>(
    `/reservas/${bookingId}/actions`,
    undefined,
    { ttlMs: 10000, staleWhileRevalidate: true },
  );
  return response.data;
};

export const getProfessionalBookingTimeline = async (bookingId: string) => {
  const response = await cachedGet<ProfessionalBookingTimelineResponse>(
    `/profesional/reservas/${bookingId}/timeline`,
    undefined,
    { ttlMs: 10000, staleWhileRevalidate: true },
  );
  return response.data;
};

export const prefetchProfessionalBookingDetail = async (bookingId: string) => {
  await Promise.allSettled([
    getProfessionalBookingActions(bookingId),
    getProfessionalBookingTimeline(bookingId),
  ]);
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
) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/reschedule`,
    {
      startDateTime,
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
