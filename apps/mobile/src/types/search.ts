import type {
  SearchQueryParamsBase,
  SearchResultKind,
  SearchSort,
  SearchType,
} from '../../../../packages/shared/src/types/search';

export type { SearchResultKind, SearchSort, SearchType };

export type SearchItem = {
  id: string;
  slug: string;
  name: string;
  professionalName?: string | null;
  businessName?: string | null;
  resultKind?: SearchResultKind | null;
  headline?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  categorySlugs: string[];
  distanceKm?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  priceFrom?: number | null;
  coverImageUrl?: string | null;
  locationText?: string | null;
};

export type SearchQueryParams = SearchQueryParamsBase;

export type SearchResponse = {
  page: number;
  size: number;
  total: number;
  items: SearchItem[];
};
