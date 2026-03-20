import api from '@/services/api';
import { cachedGet, invalidateCachedGet } from '@/services/cachedGet';
import type { ClientBookingTimelineResponse } from '@/types/clientBookingTimeline';
import type {
  BookingActions,
  BookingCommandResponse,
  BookingFinancialStatus,
  BookingFinancialSummary,
  BookingOperationalStatus,
  BookingPaymentSession,
  BookingPaymentType,
  BookingPolicySnapshot,
  BookingPayoutRecord,
  BookingPayoutStatus,
  BookingRefundRecord,
  BookingRefundStatus,
} from '@/types/bookings';
import { formatBookingDateLabel, formatBookingTimeLabel } from '@/utils/bookings';
import { buildIdempotencyKey } from '../../../../packages/shared/src/bookings/idempotency';
import {
  type ClientBookingDtoBase,
  type ClientBookingsResponseDto,
  mapClientBookingBase,
  resolveClientBookingsArray,
} from '../../../../packages/shared/src/bookings/mappers';

export type ClientDashboardNextBooking = {
  id: string;
  professional: string;
  service: string;
  date: string;
  time: string;
  location: string;
  status: 'CONFIRMED' | 'PENDING';
  professionalSlug?: string | null;
  serviceId?: string | null;
  paymentType?: BookingPaymentType | null;
  financialSummary?: BookingFinancialSummary | null;
  timezone?: string | null;
  startDateTimeUtc?: string | null;
  paymentStatus?: BookingFinancialStatus | null;
  refundStatus?: BookingRefundStatus | null;
  payoutStatus?: BookingPayoutStatus | null;
  latestRefund?: BookingRefundRecord | null;
  latestPayout?: BookingPayoutRecord | null;
  policySnapshot?: BookingPolicySnapshot | null;
};

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
  timezone?: string | null;
  startDateTimeUtc?: string | null;
  paymentStatus?: BookingFinancialStatus | null;
  refundStatus?: BookingRefundStatus | null;
  payoutStatus?: BookingPayoutStatus | null;
  latestRefund?: BookingRefundRecord | null;
  latestPayout?: BookingPayoutRecord | null;
  policySnapshot?: BookingPolicySnapshot | null;
};

type ClientBookingDto = ClientBookingDtoBase<
  BookingPaymentType,
  BookingFinancialSummary,
  BookingFinancialStatus,
  BookingRefundStatus,
  BookingPayoutStatus,
  BookingRefundRecord,
  BookingPayoutRecord,
  BookingPolicySnapshot
>;

type ClientBookingsPayload = ClientBookingsResponseDto<ClientBookingDto>;

const mapBooking = (booking: ClientBookingDto): ClientDashboardBooking | null => {
  return mapClientBookingBase(booking, ({ startDateTime, timezone, startDateTimeUtc }) => ({
    date: formatBookingDateLabel(startDateTime, timezone, startDateTimeUtc),
    time: formatBookingTimeLabel(startDateTime, timezone, startDateTimeUtc),
  }));
};

const invalidateBookingCaches = () => {
  invalidateCachedGet('/bookings/me');
  invalidateCachedGet('/cliente/reservas');
  invalidateCachedGet('/cliente/reservas/proxima');
  invalidateCachedGet('/reservas/');
  invalidateCachedGet('/cliente/reservas/');
};

export const getClientBookings = async (): Promise<ClientDashboardBooking[]> => {
  const response = await cachedGet<ClientBookingsPayload>(
    '/bookings/me',
    undefined,
    { ttlMs: 8000, staleWhileRevalidate: true },
  );

  return resolveClientBookingsArray(response.data)
    .map(mapBooking)
    .filter((booking): booking is ClientDashboardBooking => Boolean(booking));
};

export const getClientNextBooking = async (): Promise<ClientDashboardNextBooking | null> => {
  const response = await cachedGet<ClientBookingDto | ''>(
    '/cliente/reservas/proxima',
    undefined,
    { ttlMs: 8000, staleWhileRevalidate: true },
  );

  if (!response.data || typeof response.data === 'string') {
    return null;
  }

  const mapped = mapBooking(response.data);
  if (!mapped) return null;

  return {
    id: mapped.id,
    professional: mapped.professional,
    service: mapped.service,
    date: mapped.date,
    time: mapped.time,
    location: mapped.location,
    status: mapped.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
    professionalSlug: mapped.professionalSlug,
    serviceId: mapped.serviceId,
    paymentType: mapped.paymentType,
    financialSummary: mapped.financialSummary,
    timezone: mapped.timezone,
    startDateTimeUtc: mapped.startDateTimeUtc,
    paymentStatus: mapped.paymentStatus,
    refundStatus: mapped.refundStatus,
    payoutStatus: mapped.payoutStatus,
    latestRefund: mapped.latestRefund,
    latestPayout: mapped.latestPayout,
    policySnapshot: mapped.policySnapshot,
  };
};

export const getBookingActions = async (bookingId: string) => {
  const response = await cachedGet<BookingActions>(
    `/reservas/${bookingId}/actions`,
    undefined,
    { ttlMs: 10000, staleWhileRevalidate: true },
  );
  return response.data;
};

export const getClientBookingTimeline = async (bookingId: string) => {
  const response = await cachedGet<ClientBookingTimelineResponse>(
    `/cliente/reservas/${bookingId}/timeline`,
    undefined,
    { ttlMs: 10000, staleWhileRevalidate: true },
  );
  return response.data;
};

export const prefetchClientBookingDetail = async (bookingId: string) => {
  await Promise.allSettled([
    getBookingActions(bookingId),
    getClientBookingTimeline(bookingId),
  ]);
};

export const createClientBookingPaymentSession = async (
  bookingId: string,
) => {
  const response = await api.post<BookingPaymentSession>(
    `/cliente/reservas/${bookingId}/payment-session`,
    {},
  );
  invalidateBookingCaches();
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
  invalidateBookingCaches();
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
  invalidateBookingCaches();
  return response.data;
};
