export type SearchType = 'RUBRO' | 'PROFESIONAL' | 'LOCAL' | 'SERVICIO';
export type SearchResultKind = 'PROFESIONAL' | 'LOCAL';

export type SearchSort = 'RELEVANCE' | 'DISTANCE' | 'RATING';

export type SearchQueryParamsBase = {
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
