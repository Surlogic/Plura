import api from '@/services/api';
import { cachedGet, invalidateCachedGet } from '@/services/cachedGet';
import type { BookingReviewPage } from '@/types/review';

export const getProfessionalReviews = async (
  page = 0,
  size = 10,
): Promise<BookingReviewPage> => {
  const response = await cachedGet<BookingReviewPage>(
    '/profesional/reviews',
    { params: { page, size } },
    { ttlMs: 10000, staleWhileRevalidate: true },
  );
  return response.data;
};

export const hideReviewText = async (reviewId: number): Promise<void> => {
  await api.patch(`/profesional/reviews/${reviewId}/hide-text`);
  invalidateCachedGet('/profesional/reviews');
};

export const showReviewText = async (reviewId: number): Promise<void> => {
  await api.patch(`/profesional/reviews/${reviewId}/show-text`);
  invalidateCachedGet('/profesional/reviews');
};
