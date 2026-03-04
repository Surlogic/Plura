const parseCitySuggestions = (rawValue: string | undefined): string[] => {
  if (!rawValue) return [];

  const seen = new Set<string>();
  const values: string[] = [];

  rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const key = value.toLocaleLowerCase('es-UY');
      if (seen.has(key)) return;

      seen.add(key);
      values.push(value);
    });

  return values;
};

export const SEARCH_DEFAULT_PAGE = 0;
export const SEARCH_DEFAULT_SIZE = 24;
export const SEARCH_MAX_SIZE = 60;
export const SEARCH_GEO_AUTOCOMPLETE_LIMIT = 8;
export const SEARCH_SUGGESTIONS_LIMIT = 6;
export const SEARCH_RECENT_ITEMS_LIMIT = 8;
export const SEARCH_RECENT_SEARCHES_LIMIT = 5;
export const SEARCH_CITY_SUGGESTIONS_LIMIT = 12;
export const SEARCH_DEFAULT_RADIUS_KM = 10;

export const SEARCH_DEFAULT_CITY_SUGGESTIONS = parseCitySuggestions(
  process.env.NEXT_PUBLIC_SEARCH_DEFAULT_CITY_SUGGESTIONS,
);
