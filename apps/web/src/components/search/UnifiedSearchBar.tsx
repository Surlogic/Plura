import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useRouter } from 'next/router';
import DateFilter from '@/components/search/DateFilter';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';
import SearchField from '@/components/search/SearchField';
import SuggestDropdown, { type SuggestDropdownItem } from '@/components/search/SuggestDropdown';
import {
  SEARCH_CITY_SUGGESTIONS_LIMIT,
  SEARCH_DEFAULT_CITY_SUGGESTIONS,
  SEARCH_DEFAULT_PAGE,
  SEARCH_RECENT_ITEMS_LIMIT,
  SEARCH_RECENT_SEARCHES_LIMIT,
  SEARCH_SUGGESTIONS_LIMIT,
} from '@/config/search';
import { useCategories } from '@/hooks/useCategories';
import { autocompleteGeo, searchSuggestions } from '@/services/search';
import {
  normalizeSearchText,
  shouldOmitRubroQuery,
  slugToLabel,
} from '@/utils/searchQuery';
import type {
  GeoAutocompleteItem,
  RecentSearchEntry,
  SearchSuggestResponse,
  SearchSuggestionItem,
  SearchType,
} from '@/types/search';

export type UnifiedSearchValues = {
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
};

type UnifiedSearchBarProps = {
  initialValues?: Partial<UnifiedSearchValues>;
  fixedQuery?: Record<string, string | undefined>;
  variant?: 'hero' | 'panel' | 'explore';
  submitLabel?: string;
  className?: string;
  showClearButton?: boolean;
  citySuggestions?: string[];
};

const DEFAULT_VALUES: UnifiedSearchValues = {
  type: 'SERVICIO',
  query: '',
  categorySlug: undefined,
  city: '',
  date: '',
  from: undefined,
  to: undefined,
  availableNow: false,
};

const EMPTY_SUGGESTIONS: SearchSuggestResponse = {
  categories: [],
  services: [],
  professionals: [],
  locals: [],
  popularNearby: [],
};

const RECENT_CITIES_STORAGE_KEY = 'plura:search-recent-cities';
const RECENT_SEARCHES_STORAGE_KEY = 'plura:search-recent-queries';

const SURFACE_CLASSES: Record<NonNullable<UnifiedSearchBarProps['variant']>, string> = {
  hero: 'border border-[color:var(--border-strong)] bg-white/96 shadow-[var(--shadow-lift)] backdrop-blur-sm',
  panel: 'border border-[color:var(--border-strong)] bg-white shadow-[var(--shadow-card)]',
  explore: 'border border-[color:var(--border-soft)] bg-white shadow-[var(--shadow-card)]',
};

const normalizeType = (value?: string): SearchType => {
  const maybeType = value?.trim().toUpperCase();
  return maybeType === 'RUBRO' ||
    maybeType === 'PROFESIONAL' ||
    maybeType === 'LOCAL' ||
    maybeType === 'SERVICIO'
    ? maybeType
    : DEFAULT_VALUES.type;
};

const normalizeDate = (value?: string) => {
  if (!value) return '';
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
};

const normalizeInitialValues = (
  initialValues?: Partial<UnifiedSearchValues>,
): UnifiedSearchValues => {
  const categorySlug = initialValues?.categorySlug?.trim() || undefined;
  const query = initialValues?.query?.trim() || (categorySlug ? slugToLabel(categorySlug) : '');

  return {
    type: normalizeType(initialValues?.type),
    query,
    categorySlug,
    city: initialValues?.city?.trim() || '',
    lat: typeof initialValues?.lat === 'number' ? initialValues.lat : undefined,
    lng: typeof initialValues?.lng === 'number' ? initialValues.lng : undefined,
    date: normalizeDate(initialValues?.date),
    from: normalizeDate(initialValues?.from),
    to: normalizeDate(initialValues?.to),
    availableNow: Boolean(initialValues?.availableNow),
  };
};

const uniqueNonEmpty = (values: string[]) => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    const key = trimmed.toLocaleLowerCase('es-UY');
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
};

const recentSearchKey = (value: UnifiedSearchValues) =>
  [
    value.type,
    value.query.trim().toLocaleLowerCase('es-UY'),
    (value.categorySlug || '').toLocaleLowerCase('es-UY'),
    value.city.trim().toLocaleLowerCase('es-UY'),
    typeof value.lat === 'number' ? value.lat.toFixed(4) : '',
    typeof value.lng === 'number' ? value.lng.toFixed(4) : '',
    value.date,
    value.from || '',
    value.to || '',
    value.availableNow ? '1' : '0',
  ].join('|');

const recentSearchKeyFromEntry = (entry: RecentSearchEntry) =>
  recentSearchKey({
    type: normalizeType(entry.type),
    query: entry.query,
    categorySlug: entry.categorySlug,
    city: entry.city,
    lat: entry.lat,
    lng: entry.lng,
    date: entry.date,
    from: entry.from,
    to: entry.to,
    availableNow: entry.availableNow,
  });

const recentSearchIdentity = (entry: RecentSearchEntry) => {
  const normalizedQuery = normalizeSearchText(entry.query);
  if (normalizedQuery) {
    return `query:${normalizedQuery}`;
  }

  const normalizedCategory = normalizeSearchText((entry.categorySlug || '').replace(/-/g, ' '));
  if (normalizedCategory) {
    return `category:${normalizedCategory}`;
  }

  return `filters:${recentSearchKeyFromEntry(entry)}`;
};

const parseRecentCreatedAt = (value: string) => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const dedupeRecentSearches = (entries: RecentSearchEntry[]) => {
  const sorted = [...entries].sort(
    (left, right) => parseRecentCreatedAt(right.createdAt) - parseRecentCreatedAt(left.createdAt),
  );
  const deduped = new Map<string, RecentSearchEntry>();

  sorted.forEach((entry) => {
    const identity = recentSearchIdentity(entry);
    if (deduped.has(identity)) return;
    deduped.set(identity, entry);
  });

  return Array.from(deduped.values()).slice(0, SEARCH_RECENT_SEARCHES_LIMIT);
};

const normalizeRecentSearches = (raw: unknown): RecentSearchEntry[] => {
  if (!Array.isArray(raw)) return [];

  const sanitized = raw.map((item) => {
    const value = item as Partial<RecentSearchEntry>;
    const type = normalizeType(value.type);
    return {
      type,
      query: typeof value.query === 'string' ? value.query : '',
      categorySlug:
        typeof value.categorySlug === 'string' && value.categorySlug.trim()
          ? value.categorySlug.trim()
          : undefined,
      city: typeof value.city === 'string' ? value.city : '',
      lat: typeof value.lat === 'number' ? value.lat : undefined,
      lng: typeof value.lng === 'number' ? value.lng : undefined,
      date: typeof value.date === 'string' ? normalizeDate(value.date) : '',
      from: typeof value.from === 'string' ? normalizeDate(value.from) : undefined,
      to: typeof value.to === 'string' ? normalizeDate(value.to) : undefined,
      availableNow: Boolean(value.availableNow),
      createdAt:
        typeof value.createdAt === 'string' && value.createdAt.trim()
          ? value.createdAt
          : new Date().toISOString(),
    };
  });

  return dedupeRecentSearches(sanitized);
};

const hasMeaningfulSearch = (value: UnifiedSearchValues) =>
  Boolean(
    value.query.trim() ||
      value.categorySlug ||
      value.city.trim() ||
      (typeof value.lat === 'number' && typeof value.lng === 'number') ||
      value.date ||
      (value.from && value.to) ||
      value.availableNow,
  );

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('es-UY', {
    day: '2-digit',
    month: 'short',
  });
};

const recentSearchLabel = (entry: RecentSearchEntry) => {
  const query = entry.query.trim();
  if (query) return query;
  if (entry.categorySlug?.trim()) return slugToLabel(entry.categorySlug);
  return 'Busqueda reciente';
};

const recentSearchSecondary = (entry: RecentSearchEntry) => {
  const parts: string[] = ['Busqueda reciente'];
  if (entry.city.trim()) parts.push(entry.city.trim());
  if (entry.date) {
    parts.push(formatDateLabel(entry.date));
  } else if (entry.from && entry.to) {
    parts.push(`${formatDateLabel(entry.from)} - ${formatDateLabel(entry.to)}`);
  }
  if (entry.availableNow) parts.push('Disponible ahora');
  return parts.join(' · ');
};

const toUnifiedValuesFromRecent = (entry: RecentSearchEntry): UnifiedSearchValues => ({
  type: normalizeType(entry.type),
  query: entry.query,
  categorySlug: entry.categorySlug,
  city: entry.city,
  lat: entry.lat,
  lng: entry.lng,
  date: entry.date,
  from: entry.from,
  to: entry.to,
  availableNow: entry.availableNow,
});

const getAdaptiveValueClass = (value: string) => {
  const length = value.trim().length;
  if (length > 24) return 'text-sm';
  if (length > 14) return 'text-[0.95rem]';
  return 'text-[1.02rem]';
};

const GLOBAL_SEARCH_OPTION: SuggestDropdownItem = {
  id: 'all-services-or-categories',
  type: 'SERVICIO',
  label: 'Todos los servicios o rubros',
  secondary: 'Buscar en toda la plataforma',
  variant: 'global',
};

const POPULAR_CATEGORY_PATTERNS = ['barber', 'unas', 'depil', 'spa', 'cosmet'];

const interleaveSuggestionItems = (
  sources: SuggestDropdownItem[][],
  maxItems = 24,
) => {
  const buckets = sources.map((items) => [...items]);
  const mixed: SuggestDropdownItem[] = [];

  while (mixed.length < maxItems) {
    let progressed = false;
    buckets.forEach((bucket) => {
      if (mixed.length >= maxItems) return;
      const item = bucket.shift();
      if (!item) return;
      mixed.push(item);
      progressed = true;
    });
    if (!progressed) break;
  }

  return mixed;
};

export default function UnifiedSearchBar({
  initialValues,
  fixedQuery,
  variant = 'panel',
  submitLabel = 'Buscar',
  className,
  showClearButton = false,
  citySuggestions = [],
}: UnifiedSearchBarProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { categories } = useCategories();

  const [values, setValues] = useState<UnifiedSearchValues>(() =>
    normalizeInitialValues(initialValues),
  );
  const [searchInput, setSearchInput] = useState(values.query);
  const [locationInput, setLocationInput] = useState(values.city);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [geoMessage, setGeoMessage] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);

  const [suggestions, setSuggestions] = useState<SearchSuggestResponse>(EMPTY_SUGGESTIONS);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const [geoSuggestions, setGeoSuggestions] = useState<GeoAutocompleteItem[]>([]);

  useEffect(() => {
    const normalized = normalizeInitialValues(initialValues);
    setValues(normalized);
    setSearchInput(normalized.query);
    setLocationInput(normalized.city);
  }, [
    initialValues?.type,
    initialValues?.query,
    initialValues?.categorySlug,
    initialValues?.city,
    initialValues?.lat,
    initialValues?.lng,
    initialValues?.date,
    initialValues?.from,
    initialValues?.to,
    initialValues?.availableNow,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawCities = window.localStorage.getItem(RECENT_CITIES_STORAGE_KEY);
      if (rawCities) {
        const parsed = JSON.parse(rawCities) as unknown;
        if (Array.isArray(parsed)) {
          setRecentCities(
            uniqueNonEmpty(parsed.map((item) => String(item))).slice(0, SEARCH_RECENT_ITEMS_LIMIT),
          );
        }
      }

      const rawSearches = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (rawSearches) {
        const parsedSearches = JSON.parse(rawSearches) as unknown;
        setRecentSearches(normalizeRecentSearches(parsedSearches));
      }
    } catch {
      setRecentCities([]);
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    if (!isSearchOpen && !isDateOpen && !isLocationOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setIsDateOpen(false);
        setIsLocationOpen(false);
        setActiveSuggestionIndex(-1);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setIsDateOpen(false);
        setIsLocationOpen(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSearchOpen, isDateOpen, isLocationOpen]);

  useEffect(() => {
    if (!isLocationOpen) return;

    const query = locationInput.trim();
    if (query.length < 2) {
      setGeoSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      autocompleteGeo(query, controller.signal)
        .then((items) => setGeoSuggestions(items))
        .catch((error) => {
          if ((error as { code?: string; name?: string }).code === 'ERR_CANCELED') return;
          if ((error as { code?: string; name?: string }).name === 'CanceledError') return;
          setGeoSuggestions([]);
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isLocationOpen, locationInput]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsSuggestLoading(true);
      searchSuggestions(
        {
          q: searchInput.trim() || undefined,
          city: values.city.trim() || undefined,
          lat: typeof values.lat === 'number' ? values.lat : undefined,
          lng: typeof values.lng === 'number' ? values.lng : undefined,
          limit: SEARCH_SUGGESTIONS_LIMIT,
        },
        controller.signal,
      )
        .then((response) => {
          setSuggestions(response);
        })
        .catch((error) => {
          if ((error as { code?: string; name?: string }).code === 'ERR_CANCELED') return;
          if ((error as { code?: string; name?: string }).name === 'CanceledError') return;
          setSuggestions(EMPTY_SUGGESTIONS);
        })
        .finally(() => {
          setIsSuggestLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isSearchOpen, searchInput, values.city, values.lat, values.lng]);

  const rememberCity = (city: string) => {
    const normalized = city.trim();
    if (!normalized || typeof window === 'undefined') return;

    const next = uniqueNonEmpty([normalized, ...recentCities]).slice(0, SEARCH_RECENT_ITEMS_LIMIT);
    setRecentCities(next);
    window.localStorage.setItem(RECENT_CITIES_STORAGE_KEY, JSON.stringify(next));
  };

  const saveRecentSearch = (searchValues: UnifiedSearchValues) => {
    if (typeof window === 'undefined') return;

    const nextEntry: RecentSearchEntry = {
      type: searchValues.type,
      query: searchValues.query,
      categorySlug: searchValues.categorySlug,
      city: searchValues.city,
      lat: searchValues.lat,
      lng: searchValues.lng,
      date: searchValues.date,
      from: searchValues.from,
      to: searchValues.to,
      availableNow: searchValues.availableNow,
      createdAt: new Date().toISOString(),
    };

    setRecentSearches((previous) => {
      const next = dedupeRecentSearches([nextEntry, ...previous]);
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const buildExploreQuery = (formValues: UnifiedSearchValues) => {
    const query: Record<string, string> = {
      type: formValues.type,
      page: String(SEARCH_DEFAULT_PAGE),
      sort:
        typeof formValues.lat === 'number' && typeof formValues.lng === 'number'
          ? 'DISTANCE'
          : 'RATING',
    };

    const trimmedQuery = formValues.query.trim();
    const isDuplicateRubroQuery = shouldOmitRubroQuery(
      formValues.type,
      trimmedQuery,
      formValues.categorySlug,
    );

    if (trimmedQuery && !isDuplicateRubroQuery) {
      query.query = trimmedQuery;
    }
    if (formValues.categorySlug?.trim()) {
      query.categorySlug = formValues.categorySlug.trim();
    }

    if (formValues.city.trim()) {
      query.city = formValues.city.trim();
    }

    if (typeof formValues.lat === 'number' && typeof formValues.lng === 'number') {
      query.lat = String(formValues.lat);
      query.lng = String(formValues.lng);
    }

    if (formValues.date) {
      query.date = formValues.date;
    }

    if (formValues.from && formValues.to) {
      query.from = formValues.from;
      query.to = formValues.to;
    }

    if (formValues.availableNow) {
      query.availableNow = 'true';
    }

    if (fixedQuery) {
      Object.entries(fixedQuery).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          query[key] = value;
        }
      });
    }

    return query;
  };

  const runSearch = (rawValues: UnifiedSearchValues) => {
    const nextValues: UnifiedSearchValues = {
      ...rawValues,
      type: normalizeType(rawValues.type),
      query: rawValues.query.trim() || (rawValues.categorySlug ? slugToLabel(rawValues.categorySlug) : ''),
      categorySlug: rawValues.categorySlug?.trim() || undefined,
      city: rawValues.city.trim(),
      date: normalizeDate(rawValues.date),
      from: normalizeDate(rawValues.from),
      to: normalizeDate(rawValues.to),
    };

    if (nextValues.city) {
      rememberCity(nextValues.city);
    }

    if (hasMeaningfulSearch(nextValues)) {
      saveRecentSearch(nextValues);
    }

    setValues(nextValues);
    setSearchInput(nextValues.query);
    setLocationInput(nextValues.city);
    setIsSearchOpen(false);
    setIsDateOpen(false);
    setIsLocationOpen(false);
    setActiveSuggestionIndex(-1);

    void router.push(
      {
        pathname: '/explorar',
        query: buildExploreQuery(nextValues),
      },
      undefined,
      { shallow: true },
    );
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoStatus('error');
      setGeoMessage('Geolocalizacion no disponible en este navegador.');
      return;
    }

    setGeoStatus('loading');
    setGeoMessage('Buscando tu ubicacion...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setValues((previous) => ({
          ...previous,
          city: '',
          lat: latitude,
          lng: longitude,
        }));
        setLocationInput('');
        setGeoStatus('active');
        setGeoMessage('Usando ubicacion actual.');
      },
      () => {
        setGeoStatus('error');
        setGeoMessage('No pudimos acceder a tu ubicacion. Podes buscar por ciudad o barrio.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  };

  const selectGeoItem = (item: GeoAutocompleteItem) => {
    const location = item.city ? `${item.label}, ${item.city}` : item.label;
    setValues((previous) => ({
      ...previous,
      city: location,
      lat: typeof item.lat === 'number' ? item.lat : undefined,
      lng: typeof item.lng === 'number' ? item.lng : undefined,
    }));
    setLocationInput(location);
    rememberCity(location);
    setIsLocationOpen(false);
  };

  const selectCity = (city: string) => {
    setValues((previous) => ({
      ...previous,
      city,
      lat: undefined,
      lng: undefined,
    }));
    setLocationInput(city);
    setIsLocationOpen(false);
  };

  const applySuggestion = (item: SuggestDropdownItem, submitImmediately = false) => {
    if (item.recentSearch) {
      const nextValues = toUnifiedValuesFromRecent(item.recentSearch);
      setValues(nextValues);
      setSearchInput(nextValues.query);
      setLocationInput(nextValues.city);
      setIsSearchOpen(false);
      setIsDateOpen(false);
      setIsLocationOpen(false);
      setActiveSuggestionIndex(-1);

      if (submitImmediately) {
        runSearch(nextValues);
      }
      return;
    }

    const isGlobalOption = item.variant === 'global';
    const nextValues: UnifiedSearchValues = {
      ...values,
      type: isGlobalOption ? 'SERVICIO' : item.type,
      query: isGlobalOption ? '' : item.label,
      categorySlug: isGlobalOption
        ? undefined
        : item.type === 'RUBRO'
          ? item.categorySlug
          : undefined,
    };

    setValues(nextValues);
    setSearchInput(isGlobalOption ? '' : item.label);
    setIsSearchOpen(false);
    setActiveSuggestionIndex(-1);

    if (submitImmediately) {
      runSearch(nextValues);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch({
      ...values,
      query: searchInput.trim() || values.query,
    });
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (flatDropdownItems.length === 0) return;
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSuggestionIndex((current) =>
        current < flatDropdownItems.length - 1 ? current + 1 : flatDropdownItems.length - 1,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      if (flatDropdownItems.length === 0) return;
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSuggestionIndex((current) => (current > 0 ? current - 1 : 0));
      return;
    }

    if (event.key === 'Enter') {
      if (isSearchOpen && activeSuggestionIndex >= 0 && flatDropdownItems[activeSuggestionIndex]) {
        event.preventDefault();
        applySuggestion(flatDropdownItems[activeSuggestionIndex], true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsSearchOpen(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const setAnytime = () => {
    setValues((previous) => ({
      ...previous,
      date: '',
      from: undefined,
      to: undefined,
    }));
  };

  const pickToday = () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    setValues((previous) => ({
      ...previous,
      date: todayIso,
      from: undefined,
      to: undefined,
    }));
  };

  const pickTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setValues((previous) => ({
      ...previous,
      date: tomorrow.toISOString().slice(0, 10),
      from: undefined,
      to: undefined,
    }));
  };

  const pickThisWeek = () => {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 6);
    setValues((previous) => ({
      ...previous,
      date: '',
      from: today.toISOString().slice(0, 10),
      to: weekEnd.toISOString().slice(0, 10),
    }));
  };

  const handleClear = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const resetValues = normalizeInitialValues();
    setValues(resetValues);
    setSearchInput('');
    setLocationInput('');
    setGeoStatus('idle');
    setGeoMessage('');
    setGeoSuggestions([]);
    setSuggestions(EMPTY_SUGGESTIONS);
    setIsSearchOpen(false);
    setIsDateOpen(false);
    setIsLocationOpen(false);
    setActiveSuggestionIndex(-1);

    const preservedQuery: Record<string, string> = { page: String(SEARCH_DEFAULT_PAGE) };
    if (fixedQuery) {
      Object.entries(fixedQuery).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          preservedQuery[key] = value;
        }
      });
    }

    void router.push(
      {
        pathname: '/explorar',
        query: preservedQuery,
      },
      undefined,
      { shallow: true },
    );
  };

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const orderA =
          typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
        const orderB =
          typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name, 'es-UY');
      }),
    [categories],
  );

  const allCategoryDropdownItems = useMemo(() => {
    const bySlug = new Map<string, SuggestDropdownItem>();
    const orderBySlug = new Map<string, number>();

    sortedCategories.forEach((category, index) => {
      orderBySlug.set(category.slug, index);
      bySlug.set(category.slug, {
        id: `rubro-${category.slug}`,
        type: 'RUBRO',
        label: category.name,
        secondary: 'Rubro',
        categorySlug: category.slug,
      });
    });

    suggestions.categories.forEach((category) => {
      if (bySlug.has(category.slug)) return;
      bySlug.set(category.slug, {
        id: `rubro-suggest-${category.slug}`,
        type: 'RUBRO',
        label: category.name,
        secondary: 'Rubro',
        categorySlug: category.slug,
      });
    });

    return Array.from(bySlug.values()).sort((left, right) => {
      const leftOrder =
        orderBySlug.get(left.categorySlug || '') ?? Number.MAX_SAFE_INTEGER;
      const rightOrder =
        orderBySlug.get(right.categorySlug || '') ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.label.localeCompare(right.label, 'es-UY');
    });
  }, [sortedCategories, suggestions.categories]);

  const categoryDropdownItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchInput);
    if (!normalizedQuery) return allCategoryDropdownItems;

    return allCategoryDropdownItems.filter((item) => {
      const normalizedName = normalizeSearchText(item.label);
      const normalizedSlug = normalizeSearchText((item.categorySlug || '').replace(/-/g, ' '));
      return normalizedName.includes(normalizedQuery) || normalizedSlug.includes(normalizedQuery);
    });
  }, [allCategoryDropdownItems, searchInput]);

  const popularCategoryItems = useMemo(() => {
    if (allCategoryDropdownItems.length === 0) return [];

    const selected: SuggestDropdownItem[] = [];
    const used = new Set<string>();

    POPULAR_CATEGORY_PATTERNS.forEach((pattern) => {
      const match = allCategoryDropdownItems.find((item) => {
        const slug = normalizeSearchText(item.categorySlug || '');
        const label = normalizeSearchText(item.label);
        return (
          !used.has(item.id) &&
          (slug.includes(pattern) || label.includes(pattern))
        );
      });
      if (!match) return;
      used.add(match.id);
      selected.push(match);
    });

    allCategoryDropdownItems.forEach((item) => {
      if (selected.length >= 6) return;
      if (used.has(item.id)) return;
      used.add(item.id);
      selected.push(item);
    });

    return selected;
  }, [allCategoryDropdownItems]);

  const mixedSuggestionItems = useMemo(() => {
    const categoryItems = categoryDropdownItems.map((item, index) => ({
      ...item,
      id: `mix-rubro-${item.categorySlug || item.id}-${index}`,
      secondary: 'Rubro',
    }));
    const serviceItems = suggestions.services.map((item, index) => ({
      id: `mix-servicio-${item.id || item.name}-${index}`,
      type: 'SERVICIO' as const,
      label: item.name,
      secondary: 'Servicio',
    }));
    const professionalItems = suggestions.professionals.map((item, index) => ({
      id: `mix-profesional-${item.id || item.name}-${index}`,
      type: 'PROFESIONAL' as const,
      label: item.name,
      secondary: 'Profesional',
    }));
    const businessItems = suggestions.locals.map((item, index) => ({
      id: `mix-negocio-${item.id || item.name}-${index}`,
      type: 'LOCAL' as const,
      label: item.name,
      secondary: 'Negocio',
    }));

    return interleaveSuggestionItems(
      [serviceItems, categoryItems, professionalItems, businessItems],
      24,
    );
  }, [categoryDropdownItems, suggestions.locals, suggestions.professionals, suggestions.services]);

  const recentDropdownItems = useMemo(
    () =>
      recentSearches.map((entry, index) => ({
        id: `recent-search-${index}-${entry.createdAt}`,
        type: normalizeType(entry.type),
        label: recentSearchLabel(entry),
        secondary: recentSearchSecondary(entry),
        categorySlug: entry.categorySlug,
        recentSearch: entry,
        variant: 'recent' as const,
      })),
    [recentSearches],
  );

  const dropdownGroups = useMemo(() => {
    const groups: Array<{ title: string; items: SuggestDropdownItem[] }> = [
      {
        title: '',
        items: [GLOBAL_SEARCH_OPTION],
      },
    ];

    const normalizedQuery = normalizeSearchText(searchInput);
    if (!normalizedQuery) {
      if (recentDropdownItems.length > 0) {
        groups.push({
          title: 'Busquedas recientes',
          items: recentDropdownItems,
        });
      }

      if (popularCategoryItems.length > 0) {
        groups.push({
          title: 'Rubros populares',
          items: popularCategoryItems,
        });
      }

      const popularCategorySlugs = new Set(
        popularCategoryItems.map((item) => item.categorySlug).filter(Boolean),
      );
      const remainingCategories = allCategoryDropdownItems.filter((item) => {
        if (!item.categorySlug) return true;
        return !popularCategorySlugs.has(item.categorySlug);
      });

      if (remainingCategories.length > 0) {
        groups.push({
          title: 'Todos los rubros',
          items: remainingCategories,
        });
      }

      return groups;
    }

    if (mixedSuggestionItems.length > 0) {
      groups.push({
        title: 'Resultados',
        items: mixedSuggestionItems,
      });
    }

    return groups;
  }, [
    allCategoryDropdownItems,
    mixedSuggestionItems,
    popularCategoryItems,
    recentDropdownItems,
    searchInput,
  ]);

  const flatDropdownItems = useMemo(
    () => dropdownGroups.flatMap((group) => group.items),
    [dropdownGroups],
  );

  useEffect(() => {
    if (!isSearchOpen || flatDropdownItems.length === 0) {
      setActiveSuggestionIndex(-1);
      return;
    }
    if (activeSuggestionIndex >= flatDropdownItems.length) {
      setActiveSuggestionIndex(flatDropdownItems.length - 1);
    }
  }, [activeSuggestionIndex, flatDropdownItems.length, isSearchOpen]);

  const nearbyCandidates = useMemo<SearchSuggestionItem[]>(() => {
    if (!values.city.trim() && !(typeof values.lat === 'number' && typeof values.lng === 'number')) {
      return [];
    }
    return suggestions.popularNearby;
  }, [suggestions.popularNearby, values.city, values.lat, values.lng]);

  const mergedCitySuggestions = useMemo(
    () =>
      uniqueNonEmpty([...citySuggestions, ...SEARCH_DEFAULT_CITY_SUGGESTIONS, ...recentCities]).slice(
        0,
        SEARCH_CITY_SUGGESTIONS_LIMIT,
      ),
    [citySuggestions, recentCities],
  );

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const hasCoordinates = typeof values.lat === 'number' && typeof values.lng === 'number';

  const inputPlaceholder = values.categorySlug
    ? `Buscar en ${slugToLabel(values.categorySlug)}`
    : 'Servicio, rubro o profesional';

  const dateSummaryBase = values.date
    ? formatDateLabel(values.date)
    : values.from && values.to
      ? `${formatDateLabel(values.from)} - ${formatDateLabel(values.to)}`
      : 'Elegir fecha';
  const dateSummary = values.availableNow
    ? dateSummaryBase === 'Elegir fecha'
      ? 'Disponible ahora'
      : `${dateSummaryBase} + Ahora`
    : dateSummaryBase;

  const locationSummary = values.city.trim() || (hasCoordinates ? 'Cerca de mi' : '¿Donde?');
  const locationValueClass = getAdaptiveValueClass(locationSummary);
  const hasDateRange = Boolean(values.from && values.to);
  const isSearchActive = isSearchOpen;
  const isDateActive = isDateOpen || Boolean(values.date || hasDateRange || values.availableNow);
  const isLocationActive = isLocationOpen || Boolean(values.city.trim() || hasCoordinates);
  const hasDateSelection = Boolean(values.date || hasDateRange || values.availableNow);
  const hasLocationSelection = Boolean(values.city.trim() || hasCoordinates);
  const panelSurfaceClass =
    'w-full rounded-[28px] border border-[color:var(--border-strong)] bg-[color:var(--surface-strong)] p-3 shadow-[var(--shadow-lift)] ring-1 ring-black/5';

  return (
    <div ref={wrapperRef} className={`relative z-20 w-full overflow-visible ${className || ''}`}>
      <form onSubmit={handleSubmit} className="relative overflow-visible">
        <div className={`relative overflow-visible rounded-[30px] ${SURFACE_CLASSES[variant]}`}>
          <div className="grid gap-2 p-2.5 sm:p-3 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,0.95fr)_minmax(0,1.05fr)_auto] lg:items-stretch">
            <div className="relative min-w-0">
              <SearchField label="Servicio o rubro" active={isSearchActive} className="h-full">
                <div className="flex min-w-0 items-center gap-3">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-5 w-5 shrink-0 text-[color:var(--accent-strong)]"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSearchInput(nextValue);
                      setValues((previous) => ({
                        ...previous,
                        query: nextValue,
                        type: 'SERVICIO',
                        categorySlug: undefined,
                      }));
                      setIsSearchOpen(true);
                      setIsDateOpen(false);
                      setIsLocationOpen(false);
                      setActiveSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                      setIsSearchOpen(true);
                      setIsDateOpen(false);
                      setIsLocationOpen(false);
                    }}
                    onClick={() => {
                      setIsSearchOpen(true);
                      setIsDateOpen(false);
                      setIsLocationOpen(false);
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder={inputPlaceholder}
                    className="h-8 w-full min-w-0 bg-transparent text-[1.02rem] font-semibold leading-none text-[color:var(--ink)] placeholder:font-medium placeholder:text-[color:var(--ink-faint)] focus:outline-none"
                    aria-label="Buscar tratamiento, rubro, profesional o local"
                    autoComplete="off"
                  />
                </div>
              </SearchField>

              {isSearchOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+14px)] z-[70]">
                  <SuggestDropdown
                    open={isSearchOpen}
                    loading={isSuggestLoading}
                    groups={dropdownGroups}
                    activeIndex={activeSuggestionIndex}
                    onHoverIndex={setActiveSuggestionIndex}
                    onSelect={(item) => {
                      if (item.recentSearch) {
                        runSearch(toUnifiedValuesFromRecent(item.recentSearch));
                        return;
                      }
                      applySuggestion(item);
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="relative min-w-0">
              <SearchField
                label="Fecha"
                active={isDateActive}
                asButton
                className="h-full"
                onClick={() => {
                  setIsDateOpen((current) => !current);
                  setIsSearchOpen(false);
                  setIsLocationOpen(false);
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4.5 w-4.5 shrink-0 text-[color:var(--ink-faint)]"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4.5" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6.5 3v3M13.5 3v3M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span
                    className={`w-full truncate text-left text-[0.96rem] leading-5 ${
                      hasDateSelection
                        ? 'font-semibold text-[color:var(--ink)]'
                        : 'font-medium text-[color:var(--ink-muted)]'
                    }`}
                  >
                    {dateSummary}
                  </span>
                </div>
              </SearchField>

              {isDateOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+14px)] z-[70]">
                  <div className={panelSurfaceClass}>
                    <DateFilter
                      date={values.date}
                      availableNow={values.availableNow}
                      todayIso={todayIso}
                      onPickAnytime={setAnytime}
                      onPickToday={pickToday}
                      onPickTomorrow={pickTomorrow}
                      onPickThisWeek={pickThisWeek}
                      onPickDate={(value) => {
                        const nextDate = normalizeDate(value);
                        setValues((previous) => ({
                          ...previous,
                          date: nextDate,
                          from: undefined,
                          to: undefined,
                        }));
                      }}
                      onToggleAvailableNow={() =>
                        setValues((previous) => ({
                          ...previous,
                          availableNow: !previous.availableNow,
                        }))
                      }
                      showAvailableToggle
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative min-w-0">
              <SearchField
                label="Ubicacion"
                active={isLocationActive}
                asButton
                className="h-full"
                onClick={() => {
                  setIsLocationOpen((current) => !current);
                  setIsSearchOpen(false);
                  setIsDateOpen(false);
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4.5 w-4.5 shrink-0 text-[color:var(--ink-faint)]"
                    aria-hidden="true"
                  >
                    <path d="M10 17c2.8-3.4 4.2-6 4.2-7.7A4.2 4.2 0 105.8 9.3C5.8 11 7.2 13.6 10 17z" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="10" cy="9" r="1.6" fill="currentColor" />
                  </svg>
                  <span
                    className={`w-full truncate text-left leading-5 ${locationValueClass} ${
                      hasLocationSelection
                        ? 'font-semibold text-[color:var(--ink)]'
                        : 'font-medium text-[color:var(--ink-muted)]'
                    }`}
                  >
                    {locationSummary}
                  </span>
                </div>
              </SearchField>

              {isLocationOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+14px)] z-[70]">
                  <div className={panelSurfaceClass}>
                    <LocationAutocomplete
                      locationInput={locationInput}
                      onLocationInputChange={(value) => {
                        setLocationInput(value);
                        setValues((previous) => ({
                          ...previous,
                          city: value,
                          lat: undefined,
                          lng: undefined,
                        }));
                      }}
                      onUseCurrentLocation={handleUseCurrentLocation}
                      onSelectGeoItem={selectGeoItem}
                      onSelectCity={selectCity}
                      geoSuggestions={geoSuggestions}
                      recentCities={mergedCitySuggestions}
                      geoStatus={geoStatus}
                      geoMessage={geoMessage}
                      popularNearby={nearbyCandidates}
                      onPickPopularNearby={(item) => {
                        const nextValues: UnifiedSearchValues = {
                          ...values,
                          type: 'LOCAL',
                          query: item.name,
                          categorySlug: undefined,
                        };
                        setValues(nextValues);
                        setSearchInput(item.name);
                        setIsLocationOpen(false);
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:justify-stretch">
              <button
                type="submit"
                className="inline-flex h-[74px] w-full min-w-[8rem] items-center justify-center rounded-[24px] bg-[color:var(--primary)] px-6 text-base font-semibold text-white shadow-[0_18px_34px_-22px_rgba(13,35,58,0.9)] transition hover:bg-[color:var(--primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2"
                >
                {submitLabel}
              </button>
              {showClearButton ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex h-[74px] w-full items-center justify-center rounded-[22px] border border-[color:var(--border-soft)] bg-white px-4 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
                >
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
