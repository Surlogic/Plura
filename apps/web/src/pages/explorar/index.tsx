import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Navbar from '@/components/shared/Navbar';
import ExploreFilters from '@/components/explorar/ExploreFilters';
import ExploreCard from '@/components/explorar/ExploreCard';
import ClientDashboardNavbar from '@/components/dashboard/ClientDashboardNavbar';
import {
  SEARCH_DEFAULT_PAGE,
  SEARCH_DEFAULT_RADIUS_KM,
  SEARCH_DEFAULT_SIZE,
  SEARCH_MAX_SIZE,
} from '@/config/search';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useFavoriteProfessionals } from '@/hooks/useFavoriteProfessionals';
import { hasKnownAuthSession } from '@/services/session';
import {
  getBestBrowserCurrentPosition,
  type BrowserGeoPosition,
} from '@/services/geo';
import { searchProfessionals } from '@/services/search';
import type { SearchItem, SearchSort, SearchType } from '@/types/search';
import type { UnifiedSearchValues } from '@/components/search/UnifiedSearchBar';

const ExploreMap = dynamic(() => import('@/components/explorar/ExploreMap'), {
  ssr: false,
});

const SORT_OPTIONS: Array<{ value: SearchSort; label: string }> = [
  { value: 'RELEVANCE', label: 'Relevancia' },
  { value: 'DISTANCE', label: 'Distancia' },
  { value: 'RATING', label: 'Mejor valorados' },
];
const BROWSER_LOCATION_APPROXIMATE_ACCURACY_METERS = 1000;
const MANUAL_LOCATION_STORAGE_KEY = 'plura:explore-manual-location';

const getSingleQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || '' : value || '';

const normalizeSearchType = (value: string): SearchType | null => {
  const normalized = value.trim().toUpperCase();
  return normalized === 'RUBRO' ||
    normalized === 'PROFESIONAL' ||
    normalized === 'LOCAL' ||
    normalized === 'SERVICIO'
    ? normalized
    : null;
};

const normalizeSort = (value: string): SearchSort => {
  const normalized = value.trim().toUpperCase();
  return normalized === 'DISTANCE' || normalized === 'RATING' || normalized === 'RELEVANCE'
    ? normalized
    : 'RELEVANCE';
};

const parseOptionalNumber = (value: string): number | undefined => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseInteger = (value: string, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const parseBoolean = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'si';
};

const normalizeLocationSource = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === 'browser' || normalized === 'manual' ? normalized : '';
};

const normalizeDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : '';

const slugToQuery = (value: string) => value.trim().replace(/-/g, ' ');

const decodeLegacyValue = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const humanizeSlug = (slug: string) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatPriceFrom = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return `Desde $${new Intl.NumberFormat('es-UY').format(Math.round(value))}`;
};

type StoredManualLocation = {
  latitude: number;
  longitude: number;
  updatedAt: number;
};

type SelectionSource = 'map' | 'list' | null;

const readStoredManualLocation = (): StoredManualLocation | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(MANUAL_LOCATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredManualLocation> | null;
    if (
      !parsed
      || typeof parsed.latitude !== 'number'
      || !Number.isFinite(parsed.latitude)
      || typeof parsed.longitude !== 'number'
      || !Number.isFinite(parsed.longitude)
      || typeof parsed.updatedAt !== 'number'
      || !Number.isFinite(parsed.updatedAt)
    ) {
      return null;
    }

    return parsed as StoredManualLocation;
  } catch {
    return null;
  }
};

const writeStoredManualLocation = (location: StoredManualLocation) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MANUAL_LOCATION_STORAGE_KEY, JSON.stringify(location));
};

const clearStoredManualLocation = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(MANUAL_LOCATION_STORAGE_KEY);
};

export default function ExplorarPage() {
  const router = useRouter();
  const { profile, hasLoaded } = useClientProfileContext();
  const canResolveClientFeatures = hasKnownAuthSession();
  const hasClientSession = hasLoaded && Boolean(profile);
  const { isFavorite, toggleFavorite } = useFavoriteProfessionals({
    enabled: canResolveClientFeatures,
    syncWithServer: hasClientSession,
  });
  const displayName = profile?.fullName || 'Cliente';

  const rawPathSlug = getSingleQueryValue(router.query.slug as string | string[] | undefined);
  const rawLegacyCategory = getSingleQueryValue(
    router.query.categoria as string | string[] | undefined,
  );
  const rawQuery = getSingleQueryValue(router.query.query as string | string[] | undefined);
  const rawType = getSingleQueryValue(router.query.type as string | string[] | undefined);
  const rawCategorySlug = getSingleQueryValue(
    router.query.categorySlug as string | string[] | undefined,
  );
  const rawCity = getSingleQueryValue(router.query.city as string | string[] | undefined);
  const rawLat = getSingleQueryValue(router.query.lat as string | string[] | undefined);
  const rawLng = getSingleQueryValue(router.query.lng as string | string[] | undefined);
  const rawRadiusKm = getSingleQueryValue(router.query.radiusKm as string | string[] | undefined);
  const rawDate = getSingleQueryValue(router.query.date as string | string[] | undefined);
  const rawFrom = getSingleQueryValue(router.query.from as string | string[] | undefined);
  const rawTo = getSingleQueryValue(router.query.to as string | string[] | undefined);
  const rawAvailableNow = getSingleQueryValue(
    router.query.availableNow as string | string[] | undefined,
  );
  const rawPage = getSingleQueryValue(router.query.page as string | string[] | undefined);
  const rawSize = getSingleQueryValue(router.query.size as string | string[] | undefined);
  const rawSort = getSingleQueryValue(router.query.sort as string | string[] | undefined);
  const rawViewMode = getSingleQueryValue(router.query.vista as string | string[] | undefined);
  const rawLocationSource = getSingleQueryValue(
    router.query.locationSource as string | string[] | undefined,
  );

  const searchType = useMemo<SearchType>(() => {
    const parsedType = normalizeSearchType(rawType);
    if (parsedType) return parsedType;
    if (rawPathSlug || rawLegacyCategory) return 'RUBRO';
    return 'SERVICIO';
  }, [rawType, rawPathSlug, rawLegacyCategory]);

  const query = useMemo(() => {
    const fromQuery = rawQuery.trim();
    if (fromQuery) return fromQuery;

    if (rawPathSlug) return slugToQuery(rawPathSlug);
    return decodeLegacyValue(rawLegacyCategory).trim();
  }, [rawQuery, rawPathSlug, rawLegacyCategory]);

  const categorySlug = useMemo(() => {
    const direct = rawCategorySlug.trim();
    if (direct) return direct;
    if (rawPathSlug) return rawPathSlug.trim();
    const legacy = decodeLegacyValue(rawLegacyCategory).trim();
    return legacy ? legacy.toLowerCase().replace(/\s+/g, '-') : '';
  }, [rawCategorySlug, rawPathSlug, rawLegacyCategory]);

  const city = rawCity.trim();
  const lat = parseOptionalNumber(rawLat);
  const lng = parseOptionalNumber(rawLng);
  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';
  const hasRadiusKmQueryParam = rawRadiusKm.trim() !== '';
  const explicitRadiusKm = parseOptionalNumber(rawRadiusKm);
  const hasExplicitRadiusKm = hasRadiusKmQueryParam;
  const radiusKm = explicitRadiusKm ?? SEARCH_DEFAULT_RADIUS_KM;
  const date = normalizeDate(rawDate);
  const from = normalizeDate(rawFrom);
  const to = normalizeDate(rawTo);
  const availableNow = parseBoolean(rawAvailableNow);
  const page = parseInteger(rawPage, SEARCH_DEFAULT_PAGE, SEARCH_DEFAULT_PAGE, 10000);
  const size = parseInteger(rawSize, SEARCH_DEFAULT_SIZE, 1, SEARCH_MAX_SIZE);
  const locationSource = normalizeLocationSource(rawLocationSource);
  const sort = useMemo<SearchSort>(() => {
    if (rawSort.trim()) {
      return normalizeSort(rawSort);
    }
    return hasCoordinates ? 'DISTANCE' : 'RATING';
  }, [rawSort, hasCoordinates]);
  const isMapView = rawViewMode === 'mapa';

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.add('explore-route');
    body.classList.add('explore-route');

    if (isMapView) {
      html.classList.add('explore-route-map');
      body.classList.add('explore-route-map');
    } else {
      html.classList.remove('explore-route-map');
      body.classList.remove('explore-route-map');
    }

    return () => {
      html.classList.remove('explore-route');
      body.classList.remove('explore-route');
      html.classList.remove('explore-route-map');
      body.classList.remove('explore-route-map');
    };
  }, [isMapView]);

  const [items, setItems] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMapItemId, setSelectedMapItemId] = useState<string | null>(null);
  const [selectionEvent, setSelectionEvent] = useState<{
    id: string | null;
    source: SelectionSource;
    nonce: number;
  }>({
    id: null,
    source: null,
    nonce: 0,
  });
  const [hoveredMapItemId, setHoveredMapItemId] = useState<string | null>(null);
  const [browserUserLocation, setBrowserUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [locationSelectionSource, setLocationSelectionSource] = useState<
    'browser-auto' | 'manual-adjusted' | null
  >(null);
  const [mapViewportCenter, setMapViewportCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isAdjustingLocation, setIsAdjustingLocation] = useState(false);
  const [isRefreshingBrowserLocation, setIsRefreshingBrowserLocation] = useState(false);
  const [browserLocationNotice, setBrowserLocationNotice] = useState<string | null>(null);
  const [storedManualLocation, setStoredManualLocation] = useState<StoredManualLocation | null>(null);
  const [hasLoadedStoredManualLocation, setHasLoadedStoredManualLocation] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAttemptAutoGeolocationRef = useRef(false);
  const didUserClearLocationRef = useRef(false);
  const didRestoreManualLocationRef = useRef(false);
  const resultCardRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!router.isReady) return;
    setStoredManualLocation(readStoredManualLocation());
    setHasLoadedStoredManualLocation(true);
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;

    let isMounted = true;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    // Debounce search requests to batch rapid query param changes
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {

    const requestParams = {
      query: query || undefined,
      type: searchType,
      categorySlug: categorySlug || undefined,
      city: city || undefined,
      lat: hasCoordinates ? lat : undefined,
      lng: hasCoordinates ? lng : undefined,
      radiusKm,
      date: date || undefined,
      from: from || undefined,
      to: to || undefined,
      availableNow,
      page,
      size,
      sort,
    };

      searchProfessionals(requestParams, controller.signal)
        .then((response) => {
          if (!isMounted) return;
          setItems(Array.isArray(response.items) ? response.items : []);
          setTotal(response.total || 0);
        })
        .catch((err) => {
          if (!isMounted) return;
          if (
            (err as { name?: string; code?: string }).name === 'CanceledError' ||
            (err as { name?: string; code?: string }).code === 'ERR_CANCELED'
          ) {
            return;
          }
          setItems([]);
          setTotal(0);
          if (isAxiosError(err) && !err.response) {
            setError(
              'No pudimos conectar con el backend de búsqueda. Verificá que el API esté corriendo en localhost:3000.',
            );
            return;
          }
          if (isAxiosError(err) && err.response?.status && err.response.status >= 500) {
            setError('El backend devolvió un error interno al buscar resultados.');
            return;
          }
          setError('No se pudieron cargar los resultados de búsqueda.');
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 300);

    return () => {
      isMounted = false;
      controller.abort();
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [
    router.isReady,
    query,
    searchType,
    categorySlug,
    city,
    lat,
    lng,
    hasCoordinates,
    radiusKm,
    date,
    from,
    to,
    availableNow,
    page,
    size,
    sort,
  ]);

  useEffect(() => {
    if (selectedMapItemId && !items.some((item) => String(item.id) === selectedMapItemId)) {
      setSelectedMapItemId(null);
    }
    if (hoveredMapItemId && !items.some((item) => String(item.id) === hoveredMapItemId)) {
      setHoveredMapItemId(null);
    }
  }, [hoveredMapItemId, items, selectedMapItemId]);

  const handleSelectResult = useCallback((id: string | null, source: SelectionSource) => {
    setSelectedMapItemId(id);
    setSelectionEvent({
      id,
      source,
      nonce: Date.now(),
    });
  }, []);

  useEffect(() => {
    if (!isMapView) return;
    if (selectionEvent.source !== 'map' || !selectionEvent.id) return;
    if (!items.some((item) => String(item.id) === selectionEvent.id)) return;

    const target = resultCardRefs.current.get(selectionEvent.id);
    if (!target) return;

    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isMapView, items, selectionEvent]);

  const filterValues = useMemo<Partial<UnifiedSearchValues>>(
    () => ({
      type: searchType,
      query,
      categorySlug: categorySlug || undefined,
      city,
      lat: hasCoordinates ? lat : undefined,
      lng: hasCoordinates ? lng : undefined,
      radiusKm,
      date,
      from,
      to,
      availableNow,
    }),
    [searchType, query, categorySlug, city, hasCoordinates, lat, lng, radiusKm, date, from, to, availableNow],
  );

  const baseExploreQuery = useMemo(() => {
    const nextQuery: Record<string, string> = {
      type: searchType,
      page: String(page),
      size: String(size),
      sort,
    };

    if (query) nextQuery.query = query;
    if (categorySlug) nextQuery.categorySlug = categorySlug;
    if (city) nextQuery.city = city;
    if (hasExplicitRadiusKm) nextQuery.radiusKm = String(radiusKm);
    if (hasCoordinates && typeof lat === 'number' && typeof lng === 'number') {
      nextQuery.lat = String(lat);
      nextQuery.lng = String(lng);
    }
    if (locationSource && hasCoordinates && !city) nextQuery.locationSource = locationSource;
    if (date) nextQuery.date = date;
    if (from && to) {
      nextQuery.from = from;
      nextQuery.to = to;
    }
    if (availableNow) nextQuery.availableNow = 'true';

    return nextQuery;
  }, [
    searchType,
    query,
    categorySlug,
    city,
    hasExplicitRadiusKm,
    hasCoordinates,
    lat,
    lng,
    radiusKm,
    locationSource,
    date,
    from,
    to,
    availableNow,
    page,
    size,
    sort,
  ]);

  const citySuggestions = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    if (city) {
      seen.add(city);
      result.push(city);
    }
    for (const item of items) {
      if (result.length >= 10) break;
      const text = item.locationText?.trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        result.push(text);
      }
    }
    return result;
  }, [items, city]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  const getCategoryLabel = useCallback((item: SearchItem) =>
    item.categorySlugs.length > 0 ? humanizeSlug(item.categorySlugs[0]) : 'Profesional', []);

  const favoritePayloadById = useMemo(() => {
    const payloadById = new Map<
      string,
      {
        slug: string;
        name: string;
        category: string;
        location?: string;
        imageUrl?: string;
        headline?: string;
      }
    >();

    items.forEach((item) => {
      if (!item.slug) return;
      payloadById.set(String(item.id), {
        slug: item.slug,
        name: item.name,
        category: getCategoryLabel(item),
        location: item.locationText || undefined,
        imageUrl: item.coverImageUrl || undefined,
        headline: item.headline || undefined,
      });
    });

    return payloadById;
  }, [getCategoryLabel, items]);

  const replaceQuery = useCallback((nextQuery: Record<string, string>) => {
    void router.replace(
      {
        pathname: '/explorar',
        query: nextQuery,
      },
      undefined,
      { shallow: true },
    );
  }, [router]);

  const setVisualBrowserLocation = useCallback((position: BrowserGeoPosition) => {
    setBrowserUserLocation(position);
    setLocationSelectionSource('browser-auto');
    setIsAdjustingLocation(false);
    setBrowserLocationNotice(null);
  }, []);

  const applyBrowserLocationToQuery = useCallback((position: BrowserGeoPosition) => {
    setBrowserUserLocation(position);
    setLocationSelectionSource('browser-auto');
    setIsAdjustingLocation(false);
    setBrowserLocationNotice(null);
    setStoredManualLocation(null);
    clearStoredManualLocation();
    didUserClearLocationRef.current = false;

    const nextQuery: Record<string, string> = {
      ...baseExploreQuery,
      lat: String(position.latitude),
      lng: String(position.longitude),
      page: '0',
      sort: 'DISTANCE',
      locationSource: 'browser',
    };
    delete nextQuery.city;
    delete nextQuery.radiusKm;
    if (hasExplicitRadiusKm) {
      nextQuery.radiusKm = String(radiusKm);
    }
    replaceQuery(nextQuery);
  }, [baseExploreQuery, hasExplicitRadiusKm, radiusKm, replaceQuery]);

  const applyManualLocationToMap = useCallback((location: { latitude: number; longitude: number }) => {
    const storedLocation: StoredManualLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      updatedAt: Date.now(),
    };

    setBrowserUserLocation(null);
    setLocationSelectionSource('manual-adjusted');
    setIsAdjustingLocation(false);
    setBrowserLocationNotice(null);
    setStoredManualLocation(storedLocation);
    writeStoredManualLocation(storedLocation);
    didUserClearLocationRef.current = false;

    const nextQuery: Record<string, string> = {
      ...baseExploreQuery,
      lat: String(location.latitude),
      lng: String(location.longitude),
      page: '0',
      sort: 'DISTANCE',
      locationSource: 'manual',
    };
    delete nextQuery.city;
    delete nextQuery.radiusKm;
    if (hasExplicitRadiusKm) {
      nextQuery.radiusKm = String(radiusKm);
    }
    replaceQuery(nextQuery);
  }, [baseExploreQuery, hasExplicitRadiusKm, radiusKm, replaceQuery]);

  useEffect(() => {
    if (!router.isReady || !hasCoordinates || locationSource !== 'manual') return;
    const manualLocation: StoredManualLocation = {
      latitude: lat,
      longitude: lng,
      updatedAt: Date.now(),
    };
    setStoredManualLocation(manualLocation);
    writeStoredManualLocation(manualLocation);
  }, [router.isReady, hasCoordinates, lat, lng, locationSource]);

  useEffect(() => {
    if (!router.isReady || !isMapView || hasCoordinates) return;
    if (!hasLoadedStoredManualLocation) return;
    if (didUserClearLocationRef.current) return;
    if (didRestoreManualLocationRef.current) return;
    if (!storedManualLocation) return;

    didRestoreManualLocationRef.current = true;
    applyManualLocationToMap(storedManualLocation);
  }, [
    applyManualLocationToMap,
    hasCoordinates,
    hasLoadedStoredManualLocation,
    isMapView,
    router.isReady,
    storedManualLocation,
  ]);

  useEffect(() => {
    if (!router.isReady || !isMapView) return;
    if (hasCoordinates) return;
    if (!hasLoadedStoredManualLocation) return;
    if (storedManualLocation) return;
    if (didUserClearLocationRef.current) return;
    if (didAttemptAutoGeolocationRef.current) return;

    didAttemptAutoGeolocationRef.current = true;

    void getBestBrowserCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      sampleDurationMs: 7000,
      earlyAccuracyMeters: 100,
    })
      .then((position) => {
        setVisualBrowserLocation(position);
      })
      .catch(() => {
        setBrowserUserLocation(null);
        setLocationSelectionSource(null);
        setBrowserLocationNotice(
          'No pudimos acceder a tu ubicación. Revisá permisos del navegador o usá el centro del mapa.',
        );
      });
  }, [
    hasLoadedStoredManualLocation,
    hasCoordinates,
    isMapView,
    router.isReady,
    setVisualBrowserLocation,
    storedManualLocation,
  ]);

  useEffect(() => {
    if (hasCoordinates) return;
    if (browserUserLocation) {
      setLocationSelectionSource('browser-auto');
      return;
    }
    setLocationSelectionSource(null);
    setIsAdjustingLocation(false);
  }, [browserUserLocation, hasCoordinates]);

  const handleViewChange = useCallback((nextIsMapView: boolean) => {
    const nextQuery: Record<string, string> = { ...baseExploreQuery };
    if (nextIsMapView) nextQuery.vista = 'mapa';
    replaceQuery(nextQuery);
  }, [baseExploreQuery, replaceQuery]);

  const handleSortChange = useCallback((nextSort: SearchSort) => {
    const nextQuery: Record<string, string> = {
      ...baseExploreQuery,
      sort: nextSort,
      page: '0',
    };
    if (isMapView) nextQuery.vista = 'mapa';
    replaceQuery(nextQuery);
  }, [baseExploreQuery, isMapView, replaceQuery]);

  const handlePageChange = useCallback((nextPage: number) => {
    const normalizedPage = Math.max(0, Math.min(nextPage, totalPages - 1));
    const nextQuery: Record<string, string> = {
      ...baseExploreQuery,
      page: String(normalizedPage),
    };
    if (isMapView) nextQuery.vista = 'mapa';
    replaceQuery(nextQuery);
  }, [baseExploreQuery, isMapView, replaceQuery, totalPages]);

  const mapUserLocation = useMemo(
    () => (
      hasCoordinates && typeof lat === 'number' && typeof lng === 'number'
        ? { latitude: lat, longitude: lng }
        : browserUserLocation || undefined
    ),
    [browserUserLocation, hasCoordinates, lat, lng],
  );
  const hasAppliedLocationFilter = hasCoordinates && !city;
  const effectiveLocationSelectionSource = locationSelectionSource || (
    locationSource === 'manual'
      ? 'manual-adjusted'
      : locationSource === 'browser'
        ? 'browser-auto'
        : null
  );
  const shouldUseLocationSourceOverride = hasAppliedLocationFilter;
  const isUsingAutoBrowserLocation =
    effectiveLocationSelectionSource === 'browser-auto';
  const isBrowserLocationApproximate =
    isUsingAutoBrowserLocation
    && typeof browserUserLocation?.accuracy === 'number'
    && browserUserLocation.accuracy > BROWSER_LOCATION_APPROXIMATE_ACCURACY_METERS;
  const effectiveMapViewportCenter = useMemo(
    () => mapViewportCenter || (
      hasCoordinates && typeof lat === 'number' && typeof lng === 'number'
        ? { latitude: lat, longitude: lng }
        : browserUserLocation
          ? { latitude: browserUserLocation.latitude, longitude: browserUserLocation.longitude }
        : null
    ),
    [browserUserLocation, hasCoordinates, lat, lng, mapViewportCenter],
  );
  const locationSummaryOverride = !shouldUseLocationSourceOverride
    ? undefined
    : effectiveLocationSelectionSource === 'manual-adjusted'
    ? hasExplicitRadiusKm
      ? `Zona elegida · ${Math.round(radiusKm)} km`
      : 'Zona elegida'
    : effectiveLocationSelectionSource === 'browser-auto'
      ? hasExplicitRadiusKm
        ? `Cerca de mí · ${Math.round(radiusKm)} km`
        : 'Cerca de mí'
      : hasExplicitRadiusKm
        ? `Ubicación elegida · ${Math.round(radiusKm)} km`
        : 'Ubicación elegida';
  const canAdjustMapLocation = true;
  const canRefreshBrowserLocation = true;

  const handleStartAdjustLocation = useCallback(() => {
    setIsAdjustingLocation(true);
  }, []);

  const handleCancelAdjustLocation = useCallback(() => {
    setIsAdjustingLocation(false);
  }, []);

  const handleUseMapCenterAsLocation = useCallback(() => {
    if (!effectiveMapViewportCenter) return;
    applyManualLocationToMap(effectiveMapViewportCenter);
  }, [applyManualLocationToMap, effectiveMapViewportCenter]);

  const handleRefreshBrowserLocation = useCallback(() => {
    if (isRefreshingBrowserLocation) return;

    setIsRefreshingBrowserLocation(true);
    setBrowserLocationNotice(null);
    setIsAdjustingLocation(false);
    didUserClearLocationRef.current = false;

    void getBestBrowserCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      sampleDurationMs: 7000,
      earlyAccuracyMeters: 100,
    })
      .then((position) => {
        applyBrowserLocationToQuery(position);
      })
      .catch(() => {
        setBrowserLocationNotice(
          'No pudimos actualizar tu ubicación. Revisá permisos del navegador.',
        );
      })
      .finally(() => {
        setIsRefreshingBrowserLocation(false);
      });
  }, [applyBrowserLocationToQuery, isRefreshingBrowserLocation]);

  const handleClearLocation = useCallback((mode: 'remove' | 'clear-all' = 'remove') => {
    didUserClearLocationRef.current = true;
    setLocationSelectionSource(browserUserLocation ? 'browser-auto' : null);
    setMapViewportCenter(null);
    setIsAdjustingLocation(false);
    setBrowserLocationNotice(null);
    setStoredManualLocation(null);
    clearStoredManualLocation();

    if (mode === 'clear-all') return;

    const nextQuery: Record<string, string> = {
      ...baseExploreQuery,
      page: '0',
      sort: sort === 'DISTANCE' ? 'RATING' : sort,
    };

    delete nextQuery.city;
    delete nextQuery.lat;
    delete nextQuery.lng;
    delete nextQuery.radiusKm;
    delete nextQuery.locationSource;

    replaceQuery(nextQuery);
  }, [baseExploreQuery, browserUserLocation, replaceQuery, sort]);

  const handleMapItemHoverStart = useCallback((id?: string) => {
    if (!id) return;
    setHoveredMapItemId(id);
  }, []);

  const handleMapItemHoverEnd = useCallback((id?: string) => {
    if (!id) {
      setHoveredMapItemId(null);
      return;
    }
    setHoveredMapItemId((current) => (current === id ? null : current));
  }, []);

  const handleFavoriteToggle = useCallback(
    async (itemId?: string) => {
      if (!itemId) return;
      const favorite = favoritePayloadById.get(itemId);
      if (!favorite) return;
      await toggleFavorite(favorite);
    },
    [favoritePayloadById, toggleFavorite],
  );
  const fixedQuery = useMemo(() => ({
    ...(isMapView ? { vista: 'mapa' as const } : {}),
    sort,
    size: String(size),
    ...(hasExplicitRadiusKm ? { radiusKm: String(radiusKm) } : {}),
    ...(locationSource && hasAppliedLocationFilter ? { locationSource } : {}),
  }), [hasAppliedLocationFilter, hasExplicitRadiusKm, isMapView, sort, size, radiusKm, locationSource]);

  const activeMapItemId = selectedMapItemId || hoveredMapItemId;
  const exploreViewToggle = (
    <div className="inline-flex rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-0.5 shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => handleViewChange(false)}
        className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold transition ${
          !isMapView
            ? 'bg-[color:var(--surface-dark)] text-[color:var(--text-on-dark)]'
            : 'text-[color:var(--ink)] hover:bg-white'
        }`}
        aria-pressed={!isMapView}
      >
        Páginas
      </button>
      <button
        type="button"
        onClick={() => handleViewChange(true)}
        className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold transition ${
          isMapView
            ? 'bg-[color:var(--surface-dark)] text-[color:var(--text-on-dark)]'
            : 'text-[color:var(--ink)] hover:bg-white'
        }`}
        aria-pressed={isMapView}
      >
        Mapa
      </button>
    </div>
  );
  const navbar = hasClientSession ? (
    <ClientDashboardNavbar name={displayName} exploreViewToggle={exploreViewToggle} />
  ) : (
    <Navbar exploreViewToggle={exploreViewToggle} />
  );
  const exploreSortControl = (
    <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] px-2.5 py-0.5">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--ink-faint)]">
        Ordenar
      </span>
      <select
        value={sort}
        onChange={(event) => handleSortChange(event.target.value as SearchSort)}
        className="rounded-full bg-transparent py-0.5 text-sm font-semibold text-[color:var(--ink)] focus:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
  const exploreFiltersControl = (
    <ExploreFilters
      className="max-w-none"
      initialValues={filterValues}
      fixedQuery={fixedQuery}
      citySuggestions={citySuggestions}
      locationSummaryOverride={locationSummaryOverride}
      onLocationClear={handleClearLocation}
    />
  );
  const exploreControls = (
    <>
      <div className="sr-only">
        <h1 className="text-3xl font-semibold text-[color:var(--ink)] sm:text-4xl">
          Profesionales y Negocios
        </h1>
        <p className="text-sm text-[color:var(--ink-muted)] sm:text-base">
          Buscá por categoría, ubicación, fecha o disponibilidad inmediata
        </p>
      </div>

      {exploreFiltersControl}

      <div className="mt-0.5 flex items-center justify-end">
        {exploreSortControl}
      </div>
    </>
  );

  if (isMapView) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[color:var(--bg-soft)] text-[color:var(--ink)]">
        {navbar}
        <main className="relative isolate h-0 min-h-0 w-full flex-1 overflow-hidden">
          <section className="relative z-0 flex h-full min-h-0 w-full flex-col gap-px overflow-hidden bg-[#E2E7EC] lg:flex-row">
            <div className="relative z-[90] flex h-full min-h-0 w-full flex-col overflow-visible bg-white lg:min-w-[520px] lg:basis-[38vw] lg:max-w-[620px]">
              <div className="relative z-[100] shrink-0 overflow-visible border-b border-[#E2E7EC] px-2 py-2">
                {exploreFiltersControl}
                <div className="mt-1 flex items-center justify-end">
                  {exploreSortControl}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
                <div className="pr-1">
                  {error ? (
                    <div className="rounded-[16px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">
                      {error}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="rounded-[16px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">
                      {isLoading ? (
                        'Buscando profesionales...'
                      ) : (
                        <div className="space-y-1">
                          <p className="font-semibold text-[#0E2A47]">
                            No encontramos profesionales en esta zona.
                          </p>
                          <p>Intentá ampliar el radio, buscar otra categoría o quitar filtros.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-2">
                      {items.map((item, index) => {
                        const itemId = String(item.id);

                        return (
                          <div
                            key={item.id}
                            ref={(node) => {
                              if (node) {
                                resultCardRefs.current.set(itemId, node);
                                return;
                              }
                              resultCardRefs.current.delete(itemId);
                            }}
                          >
                            <ExploreCard
                              id={itemId}
                              name={item.name}
                              category={getCategoryLabel(item)}
                              rating={typeof item.rating === 'number' ? item.rating.toFixed(1) : undefined}
                              reviewsCount={item.reviewsCount}
                              price={formatPriceFrom(item.priceFrom)}
                              city={item.locationText || undefined}
                              distance={item.distanceKm}
                              bannerUrl={item.bannerUrl}
                              bannerMedia={item.bannerMedia}
                              logoUrl={item.logoUrl}
                              logoMedia={item.logoMedia}
                              fallbackPhotoUrl={item.fallbackPhotoUrl}
                              imageUrl={item.coverImageUrl}
                              available={availableNow}
                              href={
                                item.slug
                                  ? `/profesional/pagina/${encodeURIComponent(item.slug)}`
                                  : undefined
                              }
                              isHighlighted={activeMapItemId === itemId}
                              priority={index < 2}
                              onHoverStart={handleMapItemHoverStart}
                              onHoverEnd={handleMapItemHoverEnd}
                              onSelect={() => handleSelectResult(itemId, 'list')}
                              isFavorite={isFavorite(item.slug)}
                              onFavoriteToggle={handleFavoriteToggle}
                              density="compact"
                              imageSizes="(max-width: 459px) 100vw, (max-width: 1023px) 50vw, 280px"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="relative flex min-h-0 flex-1">
                <ExploreMap
                  results={items}
                  userLocation={mapUserLocation}
                  preferUserLocationViewport={Boolean(browserUserLocation) && !hasAppliedLocationFilter}
                  selectedResultId={selectedMapItemId}
                  selectionRequestNonce={selectionEvent.nonce}
                  onSelectResult={(id) => handleSelectResult(id, 'map')}
                  onViewportCenterChange={setMapViewportCenter}
                />
                {isLoading
                || isRefreshingBrowserLocation
                || isBrowserLocationApproximate
                || Boolean(browserLocationNotice)
                || canAdjustMapLocation
                || canRefreshBrowserLocation ? (
                  <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
                    <div className="flex max-w-[22rem] flex-col items-center gap-2">
                      {isLoading ? (
                        <p className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0E2A47] shadow-sm">
                          Cargando resultados...
                        </p>
                      ) : null}
                      {isRefreshingBrowserLocation ? (
                        <p className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0E2A47] shadow-sm">
                          Actualizando tu ubicación...
                        </p>
                      ) : null}
                      {isBrowserLocationApproximate ? (
                        <p className="rounded-full bg-white/95 px-3 py-1 text-center text-xs font-medium text-[#64748B] shadow-sm">
                          Tu ubicación parece aproximada. Podés mover el mapa o buscar una zona.
                        </p>
                      ) : null}
                      {browserLocationNotice ? (
                        <p className="rounded-full bg-white/95 px-3 py-1 text-center text-xs font-medium text-[#64748B] shadow-sm">
                          {browserLocationNotice}
                        </p>
                      ) : null}
                      {canAdjustMapLocation || canRefreshBrowserLocation ? (
                        <div className="pointer-events-auto flex w-full flex-col items-center gap-2 rounded-[18px] bg-white/95 px-3 py-2 text-center shadow-sm">
                          {isAdjustingLocation ? (
                            <p className="text-xs font-medium text-[#64748B]">
                              Mové el mapa hasta tu zona y usá el centro como ubicación.
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {isAdjustingLocation ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleUseMapCenterAsLocation}
                                  disabled={!effectiveMapViewportCenter}
                                  className="inline-flex h-8 items-center justify-center rounded-full bg-[#0E2A47] px-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Usar centro del mapa
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelAdjustLocation}
                                  className="inline-flex h-8 items-center justify-center rounded-full border border-[#DCE5ED] bg-white px-3 text-xs font-semibold text-[#0E2A47] transition hover:bg-[#F8FAFC]"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={handleRefreshBrowserLocation}
                                  disabled={isRefreshingBrowserLocation}
                                  className="inline-flex h-8 items-center justify-center rounded-full bg-[#0E2A47] px-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isRefreshingBrowserLocation
                                    ? 'Actualizando...'
                                    : hasAppliedLocationFilter && locationSource === 'browser'
                                      ? 'Actualizar mi ubicación'
                                      : 'Buscar cerca de mí'}
                                </button>
                                {canAdjustMapLocation ? (
                                  <button
                                    type="button"
                                    onClick={handleStartAdjustLocation}
                                    className="inline-flex h-8 items-center justify-center rounded-full border border-[#DCE5ED] bg-white px-3 text-xs font-semibold text-[#0E2A47] transition hover:bg-[#F8FAFC]"
                                  >
                                    Ajustar ubicación
                                  </button>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {!isLoading && items.length === 0 ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
                    <p className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0E2A47] shadow-sm">
                      No hay profesionales en esta zona. Mové el mapa o ampliá el radio.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[color:var(--bg-soft)] text-[color:var(--ink)]">
      {navbar}
      <main className="relative isolate mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-hidden px-4 pt-0 sm:px-6 lg:px-10">
        <header className="relative z-[70] shrink-0 -mx-4 overflow-visible border-b border-[color:var(--border-soft)] bg-[color:var(--bg-soft)]/94 px-4 py-1.5 shadow-[0_14px_30px_-34px_rgba(13,35,58,0.32)] backdrop-blur-xl sm:-mx-6 sm:px-6 sm:py-2 lg:-mx-10 lg:px-10">
          {exploreControls}
        </header>

        <section className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden pt-2">
          <div className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="space-y-4 pb-8">
              {error ? (
                <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
                  {error}
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
                  {isLoading ? (
                    'Buscando profesionales...'
                  ) : (
                    <div className="space-y-1">
                      <p className="font-semibold text-[#0E2A47]">
                        No encontramos profesionales en esta zona.
                      </p>
                      <p>Intentá ampliar el radio, buscar otra categoría o quitar filtros.</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item, index) => (
                      <ExploreCard
                        key={item.id}
                        name={item.name}
                        category={getCategoryLabel(item)}
                        rating={typeof item.rating === 'number' ? item.rating.toFixed(1) : undefined}
                        price={formatPriceFrom(item.priceFrom)}
                        city={item.locationText || undefined}
                        distance={item.distanceKm}
                        bannerUrl={item.bannerUrl}
                        bannerMedia={item.bannerMedia}
                        logoUrl={item.logoUrl}
                        logoMedia={item.logoMedia}
                        fallbackPhotoUrl={item.fallbackPhotoUrl}
                        imageUrl={item.coverImageUrl}
                        available={availableNow}
                        href={
                          item.slug
                            ? `/profesional/pagina/${encodeURIComponent(item.slug)}`
                            : undefined
                        }
                        priority={index < 4}
                        isFavorite={isFavorite(item.slug)}
                        id={String(item.id)}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#E2E7EC] bg-white px-4 py-3">
                    <p className="text-sm text-[#64748B]">
                      Página {(page + 1).toLocaleString('es-UY')} de {totalPages.toLocaleString('es-UY')}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 0}
                        onClick={() => handlePageChange(page - 1)}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[#DFE7EF] bg-white px-4 text-sm font-semibold text-[#0E2A47] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages - 1}
                        onClick={() => handlePageChange(page + 1)}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[#DFE7EF] bg-white px-4 text-sm font-semibold text-[#0E2A47] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
