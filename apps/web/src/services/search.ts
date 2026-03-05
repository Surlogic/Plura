import { cachedGet } from '@/services/cachedGet';
import { mapboxAutocompleteLocations } from '@/services/mapbox';
import {
  SEARCH_DEFAULT_PAGE,
  SEARCH_DEFAULT_SIZE,
  SEARCH_GEO_AUTOCOMPLETE_LIMIT,
} from '@/config/search';
import { shouldOmitRubroQuery } from '@/utils/searchQuery';
import type {
  GeoAutocompleteItem,
  SearchSuggestParams,
  SearchSuggestResponse,
  SearchQueryParams,
  SearchResponse,
} from '@/types/search';

const sanitizeSearchParams = (params: SearchQueryParams): SearchQueryParams => {
  const query = params.query?.trim() || undefined;
  const categorySlug = params.categorySlug?.trim() || undefined;
  const sanitizedQuery = shouldOmitRubroQuery(params.type, query, categorySlug)
    ? undefined
    : query;

  return {
    ...params,
    query: sanitizedQuery,
    categorySlug,
    city: params.city?.trim() || undefined,
  };
};

export const searchProfessionals = async (
  params: SearchQueryParams,
  signal?: AbortSignal,
): Promise<SearchResponse> => {
  const sanitized = sanitizeSearchParams(params);

  const response = await cachedGet<SearchResponse>(
    '/api/search',
    {
      signal,
      params: {
        ...(sanitized.query ? { query: sanitized.query } : {}),
        ...(sanitized.type ? { type: sanitized.type } : {}),
        ...(sanitized.categorySlug ? { categorySlug: sanitized.categorySlug } : {}),
        ...(sanitized.city ? { city: sanitized.city } : {}),
        ...(typeof sanitized.lat === 'number' ? { lat: sanitized.lat } : {}),
        ...(typeof sanitized.lng === 'number' ? { lng: sanitized.lng } : {}),
        ...(typeof sanitized.radiusKm === 'number' ? { radiusKm: sanitized.radiusKm } : {}),
        ...(sanitized.date ? { date: sanitized.date } : {}),
        ...(sanitized.from ? { from: sanitized.from } : {}),
        ...(sanitized.to ? { to: sanitized.to } : {}),
        ...(sanitized.availableNow ? { availableNow: true } : {}),
        ...(typeof sanitized.page === 'number' ? { page: sanitized.page } : {}),
        ...(typeof sanitized.size === 'number' ? { size: sanitized.size } : {}),
        ...(sanitized.sort ? { sort: sanitized.sort } : {}),
      },
    },
    {
      ttlMs: 20000,
      staleWhileRevalidate: true,
    },
  );

  const payload = response.data;
  return {
    page: typeof payload?.page === 'number' ? payload.page : SEARCH_DEFAULT_PAGE,
    size: typeof payload?.size === 'number' ? payload.size : SEARCH_DEFAULT_SIZE,
    total: typeof payload?.total === 'number' ? payload.total : 0,
    items: Array.isArray(payload?.items) ? payload.items : [],
  };
};

export const autocompleteGeo = async (
  query: string,
  signal?: AbortSignal,
): Promise<GeoAutocompleteItem[]> => {
  if (!query.trim()) return [];

  let mapboxItems: GeoAutocompleteItem[] = [];
  try {
    mapboxItems = await mapboxAutocompleteLocations(query, signal);
  } catch {
    mapboxItems = [];
  }
  if (mapboxItems.length > 0) {
    return mapboxItems;
  }

  const response = await cachedGet<GeoAutocompleteItem[]>(
    '/api/geo/autocomplete',
    {
      signal,
      params: {
        q: query.trim(),
        limit: SEARCH_GEO_AUTOCOMPLETE_LIMIT,
      },
    },
    {
      ttlMs: 30000,
      staleWhileRevalidate: true,
    },
  );

  return Array.isArray(response.data) ? response.data : [];
};

export const searchSuggestions = async (
  params: SearchSuggestParams,
  signal?: AbortSignal,
): Promise<SearchSuggestResponse> => {
  const response = await cachedGet<SearchSuggestResponse>(
    '/api/search/suggest',
    {
      signal,
      params: {
        ...(params.q?.trim() ? { q: params.q.trim() } : {}),
        ...(typeof params.lat === 'number' ? { lat: params.lat } : {}),
        ...(typeof params.lng === 'number' ? { lng: params.lng } : {}),
        ...(params.city?.trim() ? { city: params.city.trim() } : {}),
        ...(typeof params.radiusKm === 'number' ? { radiusKm: params.radiusKm } : {}),
        ...(typeof params.limit === 'number' ? { limit: params.limit } : {}),
      },
    },
    {
      ttlMs: 15000,
      staleWhileRevalidate: true,
    },
  );

  const payload = response.data;
  return {
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
    services: Array.isArray(payload?.services) ? payload.services : [],
    professionals: Array.isArray(payload?.professionals) ? payload.professionals : [],
    locals: Array.isArray(payload?.locals) ? payload.locals : [],
    popularNearby: Array.isArray(payload?.popularNearby) ? payload.popularNearby : [],
  };
};
