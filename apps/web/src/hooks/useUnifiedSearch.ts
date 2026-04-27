import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import type { SuggestDropdownItem } from '@/components/search/SuggestDropdown';
import {
  SEARCH_CITY_SUGGESTIONS_LIMIT,
  SEARCH_DEFAULT_CITY_SUGGESTIONS,
  SEARCH_DEFAULT_PAGE,
  SEARCH_DEFAULT_RADIUS_KM,
  SEARCH_RECENT_ITEMS_LIMIT,
  SEARCH_SUGGESTIONS_LIMIT,
} from '@/config/search';
import { useCategories } from '@/hooks/useCategories';
import { getBestBrowserCurrentPosition } from '@/services/geo';
import { autocompleteGeo, searchSuggestions } from '@/services/search';
import {
  normalizeSearchText,
  shouldOmitRubroQuery,
  slugToLabel,
} from '@/utils/searchQuery';
import type {
  GeoAutocompleteItem,
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
  radiusKm: number;
  date: string;
  from?: string;
  to?: string;
  availableNow: boolean;
};

const DEFAULT_VALUES: UnifiedSearchValues = {
  type: 'SERVICIO',
  query: '',
  categorySlug: undefined,
  city: '',
  radiusKm: SEARCH_DEFAULT_RADIUS_KM,
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
function readRecentCities(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_CITIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: unknown) => String(item)).filter((s: string) => s.trim()).slice(0, SEARCH_RECENT_ITEMS_LIMIT);
  } catch {
    return [];
  }
}

export const normalizeType = (value?: string): SearchType => {
  const maybeType = value?.trim().toUpperCase();
  return maybeType === 'RUBRO' ||
    maybeType === 'PROFESIONAL' ||
    maybeType === 'LOCAL' ||
    maybeType === 'SERVICIO'
    ? maybeType
    : DEFAULT_VALUES.type;
};

export const normalizeDate = (value?: string) => {
  if (!value) return '';
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
};

const normalizeRadiusKm = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return SEARCH_DEFAULT_RADIUS_KM;
  }
  return Math.max(1, Math.min(100, Math.round(value)));
};

export const normalizeInitialValues = (
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
    radiusKm: normalizeRadiusKm(initialValues?.radiusKm),
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

export const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('es-UY', {
    day: '2-digit',
    month: 'short',
  });
};

export const getAdaptiveValueClass = (value: string) => {
  const length = value.trim().length;
  if (length > 24) return 'text-[0.82rem]';
  if (length > 14) return 'text-[0.88rem]';
  return 'text-[0.93rem]';
};

const GLOBAL_SEARCH_OPTION: SuggestDropdownItem = {
  id: 'all-services-or-categories',
  type: 'SERVICIO',
  label: 'Explorar todo',
  secondary: 'Sin restringir tipo',
  variant: 'global',
};

const LOCATION_AUTOCOMPLETE_DEBOUNCE_MS = 300;
const SEARCH_SUGGEST_DEBOUNCE_MS = 350;

const interleaveSuggestionItems = (
  sources: SuggestDropdownItem[][],
  maxItems = 12,
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

type UseUnifiedSearchOptions = {
  initialValues?: Partial<UnifiedSearchValues>;
  fixedQuery?: Record<string, string | undefined>;
  citySuggestions?: string[];
};

export function useUnifiedSearch({
  initialValues,
  fixedQuery,
  citySuggestions = [],
}: UseUnifiedSearchOptions) {
  const router = useRouter();
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
  const [recentCities, setRecentCities] = useState<string[]>(readRecentCities);

  const [suggestions, setSuggestions] = useState<SearchSuggestResponse>(EMPTY_SUGGESTIONS);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const [geoSuggestions, setGeoSuggestions] = useState<GeoAutocompleteItem[]>([]);

  const normalizedInitialValues = useMemo(
    () => normalizeInitialValues(initialValues),
    [initialValues],
  );
  const hasExplicitInitialRadius = typeof initialValues?.radiusKm === 'number'
    && Number.isFinite(initialValues.radiusKm);
  const [isRadiusExplicit, setIsRadiusExplicit] = useState(hasExplicitInitialRadius);

  useEffect(() => {
    setValues(normalizedInitialValues);
    setSearchInput(normalizedInitialValues.query);
    setLocationInput(normalizedInitialValues.city);
    setIsRadiusExplicit(hasExplicitInitialRadius);
  }, [hasExplicitInitialRadius, normalizedInitialValues]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('plura:search-recent-queries');
  }, []);


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
    }, LOCATION_AUTOCOMPLETE_DEBOUNCE_MS);

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
    }, SEARCH_SUGGEST_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isSearchOpen, searchInput, values.city, values.lat, values.lng]);

  const rememberCity = useCallback((city: string) => {
    const normalized = city.trim();
    if (!normalized || typeof window === 'undefined') return;

    setRecentCities((prev) => {
      const next = uniqueNonEmpty([normalized, ...prev]).slice(0, SEARCH_RECENT_ITEMS_LIMIT);
      window.localStorage.setItem(RECENT_CITIES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const buildExploreQuery = useCallback((formValues: UnifiedSearchValues) => {
    const hasCoordinateLocation =
      typeof formValues.lat === 'number' && typeof formValues.lng === 'number';
    const hasLocationSelection = Boolean(formValues.city.trim() || hasCoordinateLocation);
    const query: Record<string, string> = {
      type: formValues.type,
      page: String(SEARCH_DEFAULT_PAGE),
      sort:
        hasCoordinateLocation
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

    if (hasCoordinateLocation) {
      query.lat = String(formValues.lat);
      query.lng = String(formValues.lng);
    }

    if (
      hasLocationSelection
      && isRadiusExplicit
      && typeof formValues.radiusKm === 'number'
      && Number.isFinite(formValues.radiusKm)
    ) {
      query.radiusKm = String(normalizeRadiusKm(formValues.radiusKm));
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
        if ((key === 'radiusKm' || key === 'locationSource') && !hasLocationSelection) {
          return;
        }
        if (key === 'locationSource' && formValues.city.trim()) {
          return;
        }
        if (typeof value === 'string' && value.trim()) {
          query[key] = value;
        }
      });
    }

    return query;
  }, [fixedQuery, isRadiusExplicit]);

  const closeAllDropdowns = useCallback(() => {
    setIsSearchOpen(false);
    setIsDateOpen(false);
    setIsLocationOpen(false);
    setActiveSuggestionIndex(-1);
  }, []);

  const runSearch = useCallback((rawValues: UnifiedSearchValues) => {
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

    setValues(nextValues);
    setSearchInput(nextValues.query);
    setLocationInput(nextValues.city);
    closeAllDropdowns();

    void router.push(
      {
        pathname: '/explorar',
        query: buildExploreQuery(nextValues),
      },
      undefined,
      { shallow: true },
    );
  }, [buildExploreQuery, closeAllDropdowns, rememberCity, router]);

  const handleUseCurrentLocation = useCallback(() => {
    setGeoStatus('loading');
    setGeoMessage('Buscando tu ubicacion...');

    void getBestBrowserCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      sampleDurationMs: 7000,
      earlyAccuracyMeters: 100,
    })
      .then((position) => {
        setValues((previous) => ({
          ...previous,
          city: '',
          lat: position.latitude,
          lng: position.longitude,
          radiusKm: normalizeRadiusKm(previous.radiusKm),
        }));
        setLocationInput('');
        setGeoStatus('active');
        setGeoMessage('Usando ubicacion actual.');
      })
      .catch(() => {
        setGeoStatus('error');
        setGeoMessage('No pudimos acceder a tu ubicacion. Podes buscar por ciudad o barrio.');
      });
  }, []);

  const selectGeoItem = useCallback((item: GeoAutocompleteItem) => {
    const normalizedLabel = item.label.trim();
    const normalizedCity = item.city.trim();
    const location = normalizedCity ? `${normalizedLabel}, ${normalizedCity}` : normalizedLabel;
    const searchCity = normalizedCity || normalizedLabel;
    setValues((previous) => ({
      ...previous,
      city: searchCity,
      lat: typeof item.lat === 'number' ? item.lat : undefined,
      lng: typeof item.lng === 'number' ? item.lng : undefined,
      radiusKm: normalizeRadiusKm(previous.radiusKm),
    }));
    setLocationInput(location);
    rememberCity(searchCity);
    setIsLocationOpen(false);
  }, [rememberCity]);

  const selectCity = useCallback((city: string) => {
    setValues((previous) => ({
      ...previous,
      city,
      lat: undefined,
      lng: undefined,
      radiusKm: normalizeRadiusKm(previous.radiusKm),
    }));
    setLocationInput(city);
    setIsLocationOpen(false);
  }, []);

  const setRadiusKm = useCallback((radiusKm: number) => {
    setIsRadiusExplicit(true);
    setValues((previous) => ({
      ...previous,
      radiusKm: normalizeRadiusKm(radiusKm),
    }));
  }, []);

  const applySuggestion = useCallback((item: SuggestDropdownItem, submitImmediately = false) => {
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
  }, [runSearch, values]);

  const setAnytime = useCallback(() => {
    setValues((previous) => ({
      ...previous,
      date: '',
      from: undefined,
      to: undefined,
    }));
  }, []);

  const pickToday = useCallback(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    setValues((previous) => ({
      ...previous,
      date: todayIso,
      from: undefined,
      to: undefined,
    }));
  }, []);

  const pickTomorrow = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setValues((previous) => ({
      ...previous,
      date: tomorrow.toISOString().slice(0, 10),
      from: undefined,
      to: undefined,
    }));
  }, []);

  const pickThisWeek = useCallback(() => {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 6);
    setValues((previous) => ({
      ...previous,
      date: '',
      from: today.toISOString().slice(0, 10),
      to: weekEnd.toISOString().slice(0, 10),
    }));
  }, []);

  const handleClear = useCallback(() => {
    const resetValues = normalizeInitialValues();
    setValues(resetValues);
    setIsRadiusExplicit(false);
    setSearchInput('');
    setLocationInput('');
    setGeoStatus('idle');
    setGeoMessage('');
    setGeoSuggestions([]);
    setSuggestions(EMPTY_SUGGESTIONS);
    closeAllDropdowns();

    const preservedQuery: Record<string, string> = { page: String(SEARCH_DEFAULT_PAGE) };
    if (fixedQuery) {
      Object.entries(fixedQuery).forEach(([key, value]) => {
        if (
          key === 'city'
          || key === 'lat'
          || key === 'lng'
          || key === 'radiusKm'
          || key === 'locationSource'
        ) {
          return;
        }
        if (typeof value === 'string' && value.trim()) {
          preservedQuery[key] = value;
        }
      });
    }

    void router.push(
      { pathname: '/explorar', query: preservedQuery },
      undefined,
      { shallow: true },
    );
  }, [closeAllDropdowns, fixedQuery, router]);

  // --- Computed dropdown items ---

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
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
        categorySlug: category.slug,
      });
    });

    suggestions.categories.forEach((category) => {
      if (bySlug.has(category.slug)) return;
      bySlug.set(category.slug, {
        id: `rubro-suggest-${category.slug}`,
        type: 'RUBRO',
        label: category.name,
        categorySlug: category.slug,
      });
    });

    return Array.from(bySlug.values()).sort((left, right) => {
      const leftOrder = orderBySlug.get(left.categorySlug || '') ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderBySlug.get(right.categorySlug || '') ?? Number.MAX_SAFE_INTEGER;
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

  const mixedSuggestionItems = useMemo(() => {
    const catItems = categoryDropdownItems.map((item, index) => ({
      ...item,
      id: `mix-rubro-${item.categorySlug || item.id}-${index}`,
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
      [serviceItems, catItems, professionalItems, businessItems],
      12,
    );
  }, [categoryDropdownItems, suggestions.locals, suggestions.professionals, suggestions.services]);

  const dropdownGroups = useMemo(() => {
    const groups: Array<{ title: string; items: SuggestDropdownItem[]; note?: string }> = [
      { title: '', items: [GLOBAL_SEARCH_OPTION] },
    ];

    const normalizedQuery = normalizeSearchText(searchInput);
    if (!normalizedQuery) {
      if (allCategoryDropdownItems.length > 0) {
        groups.push({
          title: 'Categorías',
          items: allCategoryDropdownItems,
        });
      }

      return groups;
    }

    if (mixedSuggestionItems.length > 0) {
      groups.push({ title: 'Resultados', items: mixedSuggestionItems });
    }

    return groups;
  }, [allCategoryDropdownItems, mixedSuggestionItems, searchInput]);

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

  const [todayIso, setTodayIso] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    const msUntilMidnight = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 500;
    };
    let id = setTimeout(function tick() {
      setTodayIso(new Date().toISOString().slice(0, 10));
      id = setTimeout(tick, msUntilMidnight());
    }, msUntilMidnight());
    return () => clearTimeout(id);
  }, []);

  return {
    values,
    setValues,
    searchInput,
    setSearchInput,
    locationInput,
    setLocationInput,
    isSearchOpen,
    setIsSearchOpen,
    isDateOpen,
    setIsDateOpen,
    isLocationOpen,
    setIsLocationOpen,
    geoStatus,
    geoMessage,
    geoSuggestions,
    isSuggestLoading,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    dropdownGroups,
    flatDropdownItems,
    nearbyCandidates,
    mergedCitySuggestions,
    todayIso,
    runSearch,
    applySuggestion,
    handleUseCurrentLocation,
    selectGeoItem,
    selectCity,
    setRadiusKm,
    setAnytime,
    pickToday,
    pickTomorrow,
    pickThisWeek,
    handleClear,
    closeAllDropdowns,
  };
}
