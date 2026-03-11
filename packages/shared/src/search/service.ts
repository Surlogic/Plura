import type { SearchQueryParamsBase } from '../types/search';

export type SearchRequestParams = SearchQueryParamsBase & {
  from?: string;
  to?: string;
};

export type SearchResponseShape<TItem> = {
  page: number;
  size: number;
  total: number;
  items: TItem[];
};

export type SearchSuggestRequestParams = {
  q?: string;
  lat?: number;
  lng?: number;
  city?: string;
  radiusKm?: number;
  limit?: number;
};

export type SearchSuggestResponseShape<TCategory, TItem> = {
  categories: TCategory[];
  services: TItem[];
  professionals: TItem[];
  locals: TItem[];
  popularNearby: TItem[];
};

const trimToUndefined = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const buildSearchRequestParams = (params: SearchRequestParams) => ({
  ...(trimToUndefined(params.query) ? { query: trimToUndefined(params.query) } : {}),
  ...(params.type ? { type: params.type } : {}),
  ...(trimToUndefined(params.categorySlug) ? { categorySlug: trimToUndefined(params.categorySlug) } : {}),
  ...(trimToUndefined(params.city) ? { city: trimToUndefined(params.city) } : {}),
  ...(typeof params.lat === 'number' ? { lat: params.lat } : {}),
  ...(typeof params.lng === 'number' ? { lng: params.lng } : {}),
  ...(typeof params.radiusKm === 'number' ? { radiusKm: params.radiusKm } : {}),
  ...(trimToUndefined(params.date) ? { date: trimToUndefined(params.date) } : {}),
  ...(trimToUndefined(params.from) ? { from: trimToUndefined(params.from) } : {}),
  ...(trimToUndefined(params.to) ? { to: trimToUndefined(params.to) } : {}),
  ...(params.availableNow ? { availableNow: true } : {}),
  ...(typeof params.page === 'number' ? { page: params.page } : {}),
  ...(typeof params.size === 'number' ? { size: params.size } : {}),
  ...(params.sort ? { sort: params.sort } : {}),
});

export const normalizeSearchResponse = <TItem>(
  payload: unknown,
  defaults: { page: number; size: number; totalFromItems?: boolean },
): SearchResponseShape<TItem> => {
  if (!payload || typeof payload !== 'object') {
    return {
      page: defaults.page,
      size: defaults.size,
      total: 0,
      items: [],
    };
  }

  const data = payload as Partial<SearchResponseShape<TItem>>;
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    page: typeof data.page === 'number' ? data.page : defaults.page,
    size: typeof data.size === 'number' ? data.size : defaults.size,
    total: typeof data.total === 'number'
      ? data.total
      : (defaults.totalFromItems ? items.length : 0),
    items,
  };
};

export const buildSearchSuggestRequestParams = (params: SearchSuggestRequestParams) => ({
  ...(trimToUndefined(params.q) ? { q: trimToUndefined(params.q) } : {}),
  ...(typeof params.lat === 'number' ? { lat: params.lat } : {}),
  ...(typeof params.lng === 'number' ? { lng: params.lng } : {}),
  ...(trimToUndefined(params.city) ? { city: trimToUndefined(params.city) } : {}),
  ...(typeof params.radiusKm === 'number' ? { radiusKm: params.radiusKm } : {}),
  ...(typeof params.limit === 'number' ? { limit: params.limit } : {}),
});

export const normalizeSearchSuggestResponse = <TCategory, TItem>(
  payload: unknown,
): SearchSuggestResponseShape<TCategory, TItem> => {
  const data = payload && typeof payload === 'object'
    ? (payload as Partial<SearchSuggestResponseShape<TCategory, TItem>>)
    : {};

  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    services: Array.isArray(data.services) ? data.services : [],
    professionals: Array.isArray(data.professionals) ? data.professionals : [],
    locals: Array.isArray(data.locals) ? data.locals : [],
    popularNearby: Array.isArray(data.popularNearby) ? data.popularNearby : [],
  };
};
