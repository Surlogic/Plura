import api from '@/services/api';
import { cachedGet, invalidateCachedGet } from '@/services/cachedGet';
import type {
  BookingReviewLookupResponse,
  BookingReviewResponse,
  CreateBookingReviewRequest,
  ReviewEligibilityResponse,
} from '@/types/review';

export const getReviewEligibility = async (
  bookingId: string,
): Promise<ReviewEligibilityResponse> => {
  const response = await cachedGet<ReviewEligibilityResponse>(
    `/cliente/reservas/${bookingId}/review-eligibility`,
    undefined,
    { ttlMs: 15000, staleWhileRevalidate: true },
  );
  return response.data;
};

export const getBookingReview = async (
  bookingId: string,
): Promise<BookingReviewLookupResponse> => {
  const response = await cachedGet<BookingReviewLookupResponse>(
    `/cliente/reservas/${bookingId}/review`,
    undefined,
    { ttlMs: 15000, staleWhileRevalidate: true },
  );
  return response.data;
};

export const createBookingReview = async (
  bookingId: string,
  request: CreateBookingReviewRequest,
): Promise<BookingReviewResponse> => {
  const response = await api.post<BookingReviewResponse>(
    `/cliente/reservas/${bookingId}/review`,
    request,
  );
  invalidateCachedGet(`/cliente/reservas/${bookingId}/review-eligibility`);
  invalidateCachedGet(`/cliente/reservas/${bookingId}/review`);
  return response.data;
};

export const deleteBookingReview = async (bookingId: string): Promise<void> => {
  await api.delete(`/cliente/reservas/${bookingId}/review`);
  invalidateCachedGet(`/cliente/reservas/${bookingId}/review-eligibility`);
  invalidateCachedGet(`/cliente/reservas/${bookingId}/review`);
};
