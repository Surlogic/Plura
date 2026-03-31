import type {
  SearchQueryParamsBase,
  SearchSort,
  SearchType,
} from '../../../../packages/shared/src/types/search';
import type { ProfessionalMediaPresentation } from '@/types/professional';

export type { SearchSort, SearchType };

export type SearchQueryParams = SearchQueryParamsBase & {
  from?: string;
  to?: string;
};

export type SearchItem = {
  id: string;
  slug: string;
  name: string;
  headline?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  categorySlugs: string[];
  distanceKm?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  priceFrom?: number | null;
  coverImageUrl?: string | null;
  bannerUrl?: string | null;
  bannerMedia?: ProfessionalMediaPresentation | null;
  logoUrl?: string | null;
  logoMedia?: ProfessionalMediaPresentation | null;
  fallbackPhotoUrl?: string | null;
  locationText?: string | null;
};

export type SearchResponse = {
  page: number;
  size: number;
  total: number;
  items: SearchItem[];
};

export type GeoAutocompleteItem = {
  label: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
};

export type SearchSuggestionCategory = {
  name: string;
  slug: string;
};

export type SearchSuggestionItem = {
  id?: string | null;
  name: string;
};

export type SearchSuggestResponse = {
  categories: SearchSuggestionCategory[];
  services: SearchSuggestionItem[];
  professionals: SearchSuggestionItem[];
  locals: SearchSuggestionItem[];
  popularNearby: SearchSuggestionItem[];
};

export type SearchSuggestParams = {
  q?: string;
  lat?: number;
  lng?: number;
  city?: string;
  radiusKm?: number;
  limit?: number;
};

export type RecentSearchEntry = {
  type: SearchType;
  query: string;
  categorySlug?: string;
  city: string;
  lat?: number;
  lng?: number;
  date: string;
  from?: string;
  to?: string;
  availableNow: boolean;
  createdAt: string;
};
