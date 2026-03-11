import type {
  SearchQueryParamsBase,
  SearchSort,
  SearchType,
} from '../../../../packages/shared/src/types/search';

export type { SearchSort, SearchType };

export type SearchItem = {
  id: string;
  slug: string;
  fullName: string;
  rubro?: string;
  locationText?: string;
  headline?: string;
  minPrice?: number | null;
  rating?: number | null;
};

export type SearchQueryParams = SearchQueryParamsBase;

export type SearchResponse = {
  page: number;
  size: number;
  total: number;
  items: SearchItem[];
};
