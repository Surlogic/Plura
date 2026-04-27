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
  sampleDurationMs?: number;
  earlyAccuracyMeters?: number;
};

const mapBrowserGeoPosition = (position: GeolocationPosition): BrowserGeoPosition => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy:
    typeof position.coords.accuracy === 'number' && Number.isFinite(position.coords.accuracy)
      ? position.coords.accuracy
      : undefined,
});

const getAccuracyScore = (position?: BrowserGeoPosition | null) =>
  typeof position?.accuracy === 'number' && Number.isFinite(position.accuracy)
    ? position.accuracy
    : Number.POSITIVE_INFINITY;

const requestSingleBrowserCurrentPosition = (
  geolocation: Geolocation,
  options: BrowserGeoOptions,
): Promise<BrowserGeoPosition> =>
  new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => resolve(mapBrowserGeoPosition(position)),
      (error) => reject(error),
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 15000,
        maximumAge: options.maximumAge ?? 0,
      },
    );
  });

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

export const getBestBrowserCurrentPosition = (
  options: BrowserGeoOptions = {},
): Promise<BrowserGeoPosition> =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalizacion no disponible en este navegador.'));
      return;
    }

    const geolocation = navigator.geolocation;
    const timeout = options.timeout ?? 15000;
    const sampleDurationMs = Math.max(1500, Math.min(timeout, options.sampleDurationMs ?? 7000));
    const earlyAccuracyMeters = Math.max(1, options.earlyAccuracyMeters ?? 100);
    let settled = false;
    let watchId: number | null = null;
    let sampleTimer: ReturnType<typeof window.setTimeout> | null = null;
    let fallbackRequested = false;
    let bestPosition: BrowserGeoPosition | null = null;
    let lastError: GeolocationPositionError | Error | null = null;

    const cleanup = () => {
      if (watchId !== null) {
        geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (sampleTimer !== null) {
        window.clearTimeout(sampleTimer);
        sampleTimer = null;
      }
    };

    const resolveOnce = (position: BrowserGeoPosition) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(position);
    };

    const rejectOnce = (error: GeolocationPositionError | Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const considerPosition = (position: GeolocationPosition) => {
      const candidate = mapBrowserGeoPosition(position);
      if (bestPosition === null || getAccuracyScore(candidate) < getAccuracyScore(bestPosition)) {
        bestPosition = candidate;
      }
      if (getAccuracyScore(candidate) <= earlyAccuracyMeters) {
        resolveOnce(candidate);
      }
    };

    const fallbackToSingleRead = () => {
      if (settled || fallbackRequested) return;
      fallbackRequested = true;

      void requestSingleBrowserCurrentPosition(geolocation, {
        ...options,
        timeout: Math.max(1000, timeout - sampleDurationMs + 1000),
        maximumAge: 0,
      })
        .then(resolveOnce)
        .catch((error) => {
          lastError = error;
          if (bestPosition) {
            resolveOnce(bestPosition);
            return;
          }
          rejectOnce(error);
        });
    };

    sampleTimer = window.setTimeout(() => {
      if (bestPosition) {
        resolveOnce(bestPosition);
        return;
      }
      fallbackToSingleRead();
    }, sampleDurationMs);

    try {
      watchId = geolocation.watchPosition(
        (position) => {
          lastError = null;
          considerPosition(position);
        },
        (error) => {
          lastError = error;
          if (!bestPosition) {
            fallbackToSingleRead();
          }
        },
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout,
          maximumAge: 0,
        },
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('No se pudo iniciar la geolocalizacion.');
      fallbackToSingleRead();
    }

    if (watchId === null) {
      fallbackToSingleRead();
      return;
    }

    window.setTimeout(() => {
      if (settled) return;
      if (bestPosition) {
        resolveOnce(bestPosition);
        return;
      }
      rejectOnce(lastError || new Error('No pudimos obtener tu ubicacion.'));
    }, timeout + 1000);
  });

export const getBrowserCurrentPosition = (
  options: BrowserGeoOptions = {},
): Promise<BrowserGeoPosition> => getBestBrowserCurrentPosition(options);
