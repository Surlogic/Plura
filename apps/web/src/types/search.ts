export type SearchType = 'RUBRO' | 'PROFESIONAL' | 'LOCAL' | 'SERVICIO';

export type SearchSort = 'RELEVANCE' | 'DISTANCE' | 'RATING';

export type SearchQueryParams = {
  query?: string;
  type?: SearchType;
  categorySlug?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  date?: string;
  from?: string;
  to?: string;
  availableNow?: boolean;
  page?: number;
  size?: number;
  sort?: SearchSort;
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
