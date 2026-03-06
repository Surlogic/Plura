import api from './api';
import type { SearchQueryParams, SearchResponse } from '../types/search';

const defaultResponse: SearchResponse = {
  page: 0,
  size: 20,
  total: 0,
  items: [],
};

export const searchProfessionals = async (
  params: SearchQueryParams,
): Promise<SearchResponse> => {
  const response = await api.get<SearchResponse>('/api/search', {
    params: {
      ...(params.query ? { query: params.query } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.categorySlug ? { categorySlug: params.categorySlug } : {}),
      ...(params.city ? { city: params.city } : {}),
      ...(typeof params.lat === 'number' ? { lat: params.lat } : {}),
      ...(typeof params.lng === 'number' ? { lng: params.lng } : {}),
      ...(typeof params.radiusKm === 'number' ? { radiusKm: params.radiusKm } : {}),
      ...(params.date ? { date: params.date } : {}),
      ...(params.availableNow ? { availableNow: true } : {}),
      ...(typeof params.page === 'number' ? { page: params.page } : {}),
      ...(typeof params.size === 'number' ? { size: params.size } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
    },
  });

  if (!response.data || typeof response.data !== 'object') {
    return defaultResponse;
  }

  const items = Array.isArray(response.data.items) ? response.data.items : [];
  return {
    page: typeof response.data.page === 'number' ? response.data.page : 0,
    size: typeof response.data.size === 'number' ? response.data.size : 20,
    total: typeof response.data.total === 'number' ? response.data.total : items.length,
    items,
  };
};
