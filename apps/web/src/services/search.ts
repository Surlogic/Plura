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
import {
  buildSearchRequestParams,
  buildSearchSuggestRequestParams,
  normalizeSearchResponse,
  normalizeSearchSuggestResponse,
} from '../../../../packages/shared/src/search/service';

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
      params: buildSearchRequestParams(sanitized),
    },
    {
      ttlMs: 20000,
      staleWhileRevalidate: true,
    },
  );

  return normalizeSearchResponse(response.data, {
    page: SEARCH_DEFAULT_PAGE,
    size: SEARCH_DEFAULT_SIZE,
  });
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
      params: buildSearchSuggestRequestParams(params),
    },
    {
      ttlMs: 15000,
      staleWhileRevalidate: true,
    },
  );

  return normalizeSearchSuggestResponse(response.data);
};
