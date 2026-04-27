import api from '@/services/api';

export type GeoLocationSuggestion = {
  country?: string | null;
  city?: string | null;
  fullAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeName?: string | null;
};

export type BrowserGeoPosition = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type BrowserGeoOptions = {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
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

export const getBrowserCurrentPosition = (
  options: BrowserGeoOptions = {},
): Promise<BrowserGeoPosition> =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalizacion no disponible en este navegador.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy:
            typeof position.coords.accuracy === 'number' && Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : undefined,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 12000,
        maximumAge: options.maximumAge ?? 60000,
      },
    );
  });
