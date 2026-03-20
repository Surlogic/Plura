import api from '@/services/api';

export type GeoLocationSuggestion = {
  country?: string | null;
  city?: string | null;
  fullAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeName?: string | null;
};

export const getGeoLocationSuggestions = async (
  query: string,
  limit = 6,
): Promise<GeoLocationSuggestion[]> => {
  const normalized = query.trim();
  if (normalized.length < 2) return [];

  try {
    const response = await api.get<GeoLocationSuggestion[]>('/api/geo/suggest', {
      params: { q: normalized, limit },
      timeout: 5000,
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
};
