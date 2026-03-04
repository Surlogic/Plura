import type { GeoAutocompleteItem } from '@/types/search';

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

const MAPBOX_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '').trim();
const MAPBOX_GEOCODING_BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_LANGUAGE = 'es';
const MAPBOX_COUNTRIES = 'uy,ar';
const MAPBOX_REQUEST_TIMEOUT_MS = 3500;

const hasUsableCoordinates = (feature: MapboxFeature) =>
  Array.isArray(feature.center) &&
  feature.center.length >= 2 &&
  Number.isFinite(feature.center[0]) &&
  Number.isFinite(feature.center[1]);

const extractCity = (feature: MapboxFeature) => {
  if (!Array.isArray(feature.context)) return '';
  const city = feature.context.find((item) => item.id?.startsWith('place.'))?.text || '';
  const region = feature.context.find((item) => item.id?.startsWith('region.'))?.text || '';
  return [city, region].filter(Boolean).join(', ');
};

const fetchMapboxGeocoding = async (
  query: string,
  {
    limit,
    types,
    signal,
  }: { limit: number; types: string; signal?: AbortSignal },
): Promise<MapboxFeature[]> => {
  if (!MAPBOX_TOKEN || !query.trim()) return [];

  const encodedQuery = encodeURIComponent(query.trim());
  const url = new URL(`${MAPBOX_GEOCODING_BASE_URL}/${encodedQuery}.json`);
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('autocomplete', 'true');
  url.searchParams.set('types', types);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('language', MAPBOX_LANGUAGE);
  url.searchParams.set('country', MAPBOX_COUNTRIES);

  const requestController = new AbortController();
  const onExternalAbort = () => {
    requestController.abort();
  };

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

export const mapboxAutocompleteLocations = async (
  query: string,
  signal?: AbortSignal,
): Promise<GeoAutocompleteItem[]> => {
  const features = await fetchMapboxGeocoding(query, {
    limit: 8,
    types: 'place,locality,neighborhood,address',
    signal,
  });

  const items = features
    .filter(hasUsableCoordinates)
    .map((feature) => ({
      label: (feature.text || feature.place_name || '').trim(),
      city: extractCity(feature),
      lat: feature.center?.[1],
      lng: feature.center?.[0],
    }))
    .filter((item) => item.label);

  return items.slice(0, 8);
};

export const mapboxForwardGeocode = async (
  rawAddress: string,
  signal?: AbortSignal,
): Promise<ForwardGeocodeResult | null> => {
  const address = rawAddress.trim();
  if (!MAPBOX_TOKEN || !address) return null;

  const features = await fetchMapboxGeocoding(address, {
    limit: 1,
    types: 'address,place,locality,neighborhood',
    signal,
  });

  const first = features.find(hasUsableCoordinates);
  if (!first || !first.center) {
    return null;
  }

  return {
    latitude: first.center[1],
    longitude: first.center[0],
    placeName: (first.place_name || first.text || address).trim(),
  };
};
