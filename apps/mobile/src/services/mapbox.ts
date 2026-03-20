const MAPBOX_TOKEN = (
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN
  || process.env.MAPBOX_TOKEN
  || ''
).trim();

const MAPBOX_GEOCODING_BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_STATIC_BASE_URL = 'https://api.mapbox.com/styles/v1/mapbox/light-v11/static';
const MAPBOX_LANGUAGE = 'es';
const MAPBOX_COUNTRIES = 'uy,ar';
const MAPBOX_REQUEST_TIMEOUT_MS = 3500;

type MapboxContextItem = {
  id?: string;
  text?: string;
};

type MapboxFeature = {
  id?: string;
  text?: string;
  place_name?: string;
  center?: [number, number];
  context?: MapboxContextItem[];
};

type MapboxGeocodingResponse = {
  features?: MapboxFeature[];
};

type ForwardGeocodeResult = {
  latitude: number;
  longitude: number;
  placeName: string;
};

type StaticMapUrlInput = {
  latitude: number;
  longitude: number;
  width?: number;
  height?: number;
  zoom?: number;
};

const hasUsableCoordinates = (feature: MapboxFeature) =>
  Array.isArray(feature.center)
  && feature.center.length >= 2
  && Number.isFinite(feature.center[0])
  && Number.isFinite(feature.center[1]);

const fetchMapboxGeocoding = async (
  query: string,
  signal?: AbortSignal,
): Promise<MapboxFeature[]> => {
  if (!MAPBOX_TOKEN || !query.trim()) return [];

  const encodedQuery = encodeURIComponent(query.trim());
  const url = new URL(`${MAPBOX_GEOCODING_BASE_URL}/${encodedQuery}.json`);
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('autocomplete', 'true');
  url.searchParams.set('types', 'address,place,locality,neighborhood');
  url.searchParams.set('limit', '1');
  url.searchParams.set('language', MAPBOX_LANGUAGE);
  url.searchParams.set('country', MAPBOX_COUNTRIES);

  const requestController = new AbortController();
  const onExternalAbort = () => requestController.abort();

  if (signal) {
    if (signal.aborted) {
      requestController.abort();
    } else {
      signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    requestController.abort();
  }, MAPBOX_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      signal: requestController.signal,
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as MapboxGeocodingResponse;
  return Array.isArray(payload.features) ? payload.features : [];
};

export const hasMobileMapboxToken = Boolean(MAPBOX_TOKEN);

export const mapboxForwardGeocode = async (
  rawAddress: string,
  signal?: AbortSignal,
): Promise<ForwardGeocodeResult | null> => {
  const address = rawAddress.trim();
  if (!MAPBOX_TOKEN || !address) return null;

  const features = await fetchMapboxGeocoding(address, signal);
  const first = features.find(hasUsableCoordinates);

  if (!first?.center) {
    return null;
  }

  return {
    latitude: first.center[1],
    longitude: first.center[0],
    placeName: (first.place_name || first.text || address).trim(),
  };
};

export const buildMapboxStaticMapUrl = ({
  latitude,
  longitude,
  width = 1200,
  height = 720,
  zoom = 14,
}: StaticMapUrlInput): string | null => {
  if (!MAPBOX_TOKEN) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const pinOverlay = `pin-s+0A7A43(${longitude},${latitude})`;
  const viewport = `${longitude},${latitude},${zoom},0`;
  return `${MAPBOX_STATIC_BASE_URL}/${pinOverlay}/${viewport}/${width}x${height}@2x?access_token=${encodeURIComponent(MAPBOX_TOKEN)}`;
};
