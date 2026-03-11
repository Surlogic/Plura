import api from '@/services/api';
import { cachedGet } from '@/services/cachedGet';
import type { ProfessionalSchedule } from '@/types/professional';
import type { Category } from '@/types/category';
import type { BookingPaymentType, BookingPolicySnapshot } from '@/types/bookings';
import {
  type PublicBookingRequest,
  type PublicBookingResponseBase,
  type PublicBookingStatus,
  type PublicProfessionalPageBase,
  type PublicProfessionalServiceBase,
  normalizePublicProfessionalPage,
  normalizePublicSlots,
} from '../../../../packages/shared/src/publicBookings/contracts';

export type PublicProfessionalService = PublicProfessionalServiceBase<BookingPaymentType>;

export type PublicProfessionalPage = PublicProfessionalPageBase<
  BookingPaymentType,
  Category,
  ProfessionalSchedule,
  BookingPolicySnapshot
>;

export type { PublicBookingStatus, PublicBookingRequest };

type PublicBookingResponse = PublicBookingResponseBase;

const PUBLIC_PROFILE_TIMEOUT_MS = 10000;
const PUBLIC_SLOTS_TIMEOUT_MS = 10000;
const PUBLIC_BOOKING_TIMEOUT_MS = 15000;

export const getPublicProfessionalBySlug = async (
  slug: string,
): Promise<PublicProfessionalPage> => {
  const response = await cachedGet<PublicProfessionalPage>(
    `/public/profesionales/${slug}`,
    {
      timeout: PUBLIC_PROFILE_TIMEOUT_MS,
    },
    {
      ttlMs: 45000,
      staleWhileRevalidate: true,
    },
  );
  return normalizePublicProfessionalPage(response.data);
};

export const getPublicSlots = async (
  slug: string,
  date: string,
  serviceId: string,
): Promise<string[]> => {
  const response = await cachedGet<string[]>(
    `/public/profesionales/${slug}/slots`,
    {
      params: { date, serviceId },
      timeout: PUBLIC_SLOTS_TIMEOUT_MS,
    },
    {
      ttlMs: 10000,
    },
  );
  return normalizePublicSlots(response.data);
};

export const createPublicReservation = async (
  slug: string,
  payload: PublicBookingRequest,
): Promise<PublicBookingResponse> => {
  const response = await api.post<PublicBookingResponse>(
    `/public/profesionales/${slug}/reservas`,
    payload,
    {
      timeout: PUBLIC_BOOKING_TIMEOUT_MS,
      timeoutErrorMessage: 'Reservation request timed out',
    },
  );
  return response.data;
};
