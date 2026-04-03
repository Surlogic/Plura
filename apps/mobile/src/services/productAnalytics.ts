import api from './api';

export type ProductAnalyticsEventPayload = {
  eventKey: string;
  sourceSurface?: string;
  stepName?: string;
  professionalId?: number | null;
  professionalSlug?: string | null;
  professionalRubro?: string | null;
  categorySlug?: string | null;
  categoryLabel?: string | null;
  serviceId?: string | null;
  bookingId?: number | null;
  city?: string | null;
  country?: string | null;
  metadata?: Record<string, unknown>;
};

export const trackProductAnalyticsEvent = async (
  payload: ProductAnalyticsEventPayload,
) => {
  if (!payload?.eventKey?.trim()) {
    return;
  }

  try {
    await api.post('/public/product-analytics/events', payload, {
      timeout: 4000,
    });
  } catch {
    // Analytics interno: no debe romper UX mobile.
  }
};
