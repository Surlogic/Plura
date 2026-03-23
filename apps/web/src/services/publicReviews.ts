import { cachedGet } from '@/services/cachedGet';
import type { BookingReviewPage } from '@/types/review';

export const getPublicProfessionalReviews = async (
  slug: string,
  page = 0,
  size = 10,
): Promise<BookingReviewPage> => {
  const response = await cachedGet<BookingReviewPage>(
    `/public/profesionales/${slug}/reviews`,
    { params: { page, size } },
    { ttlMs: 30000, staleWhileRevalidate: true },
  );
  return response.data;
};
