import api from './api';

type GeoForwardGeocodeResponse = {
  latitude: number;
  longitude: number;
  placeName?: string;
};

export type GeoLocationSuggestion = {
  country?: string | null;
  city?: string | null;
  fullAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeName?: string | null;
};

export const geocodeAddress = async (query: string): Promise<GeoForwardGeocodeResponse | null> => {
  const normalized = query.trim();
  if (!normalized) return null;

  try {
    const response = await api.get<GeoForwardGeocodeResponse | null>('/api/geo/geocode', {
      params: { q: normalized },
      timeout: 8000,
    });

    const data = response.data;
    if (!data) return null;
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      return null;
    }
    return data;
  } catch {
    return null;
  }
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
      timeout: 6000,
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
};
