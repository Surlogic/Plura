import api from '@/services/api';
import { mapboxAutocompleteLocations } from '@/services/mapbox';
import {
  SEARCH_DEFAULT_PAGE,
  SEARCH_DEFAULT_SIZE,
  SEARCH_GEO_AUTOCOMPLETE_LIMIT,
} from '@/config/search';
import type {
  GeoAutocompleteItem,
  SearchSuggestParams,
  SearchSuggestResponse,
  SearchQueryParams,
  SearchResponse,
} from '@/types/search';

export const searchProfessionals = async (
  params: SearchQueryParams,
  signal?: AbortSignal,
): Promise<SearchResponse> => {
  const response = await api.get<SearchResponse>('/api/search', {
    signal,
    params: {
      ...(params.query?.trim() ? { query: params.query.trim() } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.categorySlug?.trim() ? { categorySlug: params.categorySlug.trim() } : {}),
      ...(params.city?.trim() ? { city: params.city.trim() } : {}),
      ...(typeof params.lat === 'number' ? { lat: params.lat } : {}),
      ...(typeof params.lng === 'number' ? { lng: params.lng } : {}),
      ...(typeof params.radiusKm === 'number' ? { radiusKm: params.radiusKm } : {}),
      ...(params.date ? { date: params.date } : {}),
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
      ...(params.availableNow ? { availableNow: true } : {}),
      ...(typeof params.page === 'number' ? { page: params.page } : {}),
      ...(typeof params.size === 'number' ? { size: params.size } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
    },
  });

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

  const response = await api.get<GeoAutocompleteItem[]>('/api/geo/autocomplete', {
    signal,
    params: {
      q: query.trim(),
      limit: SEARCH_GEO_AUTOCOMPLETE_LIMIT,
    },
  });

  return Array.isArray(response.data) ? response.data : [];
};

export const searchSuggestions = async (
  params: SearchSuggestParams,
  signal?: AbortSignal,
): Promise<SearchSuggestResponse> => {
  const response = await api.get<SearchSuggestResponse>('/api/search/suggest', {
    signal,
    params: {
      ...(params.q?.trim() ? { q: params.q.trim() } : {}),
      ...(typeof params.lat === 'number' ? { lat: params.lat } : {}),
      ...(typeof params.lng === 'number' ? { lng: params.lng } : {}),
      ...(params.city?.trim() ? { city: params.city.trim() } : {}),
      ...(typeof params.radiusKm === 'number' ? { radiusKm: params.radiusKm } : {}),
      ...(typeof params.limit === 'number' ? { limit: params.limit } : {}),
    },
  });

  const payload = response.data;
  return {
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
    services: Array.isArray(payload?.services) ? payload.services : [],
    professionals: Array.isArray(payload?.professionals) ? payload.professionals : [],
    locals: Array.isArray(payload?.locals) ? payload.locals : [],
    popularNearby: Array.isArray(payload?.popularNearby) ? payload.popularNearby : [],
  };
};
