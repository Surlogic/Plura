import api from './api';
import type { SearchQueryParams, SearchResponse } from '../types/search';
import {
  buildSearchRequestParams,
  normalizeSearchResponse,
} from '../../../../packages/shared/src/search/service';

export const searchProfessionals = async (
  params: SearchQueryParams,
): Promise<SearchResponse> => {
  const response = await api.get<SearchResponse>('/api/search', {
    params: buildSearchRequestParams(params),
  });

  return normalizeSearchResponse(response.data, {
    page: 0,
    size: 20,
    totalFromItems: true,
  });
};
