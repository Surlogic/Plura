import api from '@/services/api';
import { cachedGet, invalidateCachedGet } from '@/services/cachedGet';
import type {
  BookingReviewPage,
  BookingReviewReportResponse,
  CreateProfessionalReviewReportRequest,
} from '@/types/review';

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
  invalidateCachedGet('/auth/me/profesional');
};

export const showReviewText = async (reviewId: number): Promise<void> => {
  await api.patch(`/profesional/reviews/${reviewId}/show-text`);
  invalidateCachedGet('/profesional/reviews');
  invalidateCachedGet('/auth/me/profesional');
};

export const reportProfessionalReview = async (
  reviewId: number,
  request: CreateProfessionalReviewReportRequest,
): Promise<BookingReviewReportResponse> => {
  const response = await api.post<BookingReviewReportResponse>(
    `/profesional/reviews/${reviewId}/report`,
    request,
  );
  invalidateCachedGet('/profesional/reviews');
  invalidateCachedGet('/auth/me/profesional');
  return response.data;
};
