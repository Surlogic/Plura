export type SearchType = 'RUBRO' | 'PROFESIONAL' | 'LOCAL' | 'SERVICIO';

export type SearchSort = 'RELEVANCE' | 'DISTANCE' | 'RATING';

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

export type SearchQueryParams = {
  query?: string;
  type?: SearchType;
  categorySlug?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  date?: string;
  availableNow?: boolean;
  page?: number;
  size?: number;
  sort?: SearchSort;
};

export type SearchResponse = {
  page: number;
  size: number;
  total: number;
  items: SearchItem[];
};
