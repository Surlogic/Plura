import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
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
import { searchProfessionals } from '@/services/search';
import type { SearchItem, SearchSort, SearchType } from '@/types/search';
import type { UnifiedSearchValues } from '@/components/search/UnifiedSearchBar';

const ExploreMap = dynamic(() => import('@/components/explorar/ExploreMap'), {
  ssr: false,
});

const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  RUBRO: 'Rubro',
  PROFESIONAL: 'Profesional',
  LOCAL: 'Local',
  SERVICIO: 'Servicio',
};

const SORT_OPTIONS: Array<{ value: SearchSort; label: string }> = [
  { value: 'RELEVANCE', label: 'Relevancia' },
  { value: 'DISTANCE', label: 'Distancia' },
  { value: 'RATING', label: 'Mejor valorados' },
];

const RADIUS_OPTIONS = [3, 5, 10, 20, 30];

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

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-UY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

export default function ExplorarPage() {
  const router = useRouter();
  const { profile, hasLoaded } = useClientProfileContext();
  const { isFavorite, toggleFavorite } = useFavoriteProfessionals();
  const hasClientSession = hasLoaded && Boolean(profile);
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
  const radiusKm = parseOptionalNumber(rawRadiusKm) ?? SEARCH_DEFAULT_RADIUS_KM;
  const date = normalizeDate(rawDate);
  const from = normalizeDate(rawFrom);
  const to = normalizeDate(rawTo);
  const availableNow = parseBoolean(rawAvailableNow);
  const page = parseInteger(rawPage, SEARCH_DEFAULT_PAGE, SEARCH_DEFAULT_PAGE, 10000);
  const size = parseInteger(rawSize, SEARCH_DEFAULT_SIZE, 1, SEARCH_MAX_SIZE);
  const sort = useMemo<SearchSort>(() => {
    if (rawSort.trim()) {
      return normalizeSort(rawSort);
    }
    return hasCoordinates ? 'DISTANCE' : 'RATING';
  }, [rawSort, hasCoordinates]);
  const isMapView = rawViewMode === 'mapa';

  const [items, setItems] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMapItemId, setSelectedMapItemId] = useState<string | null>(null);
  const [hoveredMapItemId, setHoveredMapItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    let isMounted = true;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

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

    return () => {
      isMounted = false;
      controller.abort();
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

  const filterValues = useMemo<Partial<UnifiedSearchValues>>(
    () => ({
      type: searchType,
      query,
      categorySlug: categorySlug || undefined,
      city,
      lat: hasCoordinates ? lat : undefined,
      lng: hasCoordinates ? lng : undefined,
      date,
      from,
      to,
      availableNow,
    }),
    [searchType, query, categorySlug, city, hasCoordinates, lat, lng, date, from, to, availableNow],
  );

  const baseExploreQuery = useMemo(() => {
    const nextQuery: Record<string, string> = {
      type: searchType,
      page: String(page),
      size: String(size),
      sort,
      radiusKm: String(radiusKm),
    };

    if (query) nextQuery.query = query;
    if (categorySlug) nextQuery.categorySlug = categorySlug;
    if (city) nextQuery.city = city;
    if (hasCoordinates && typeof lat === 'number' && typeof lng === 'number') {
      nextQuery.lat = String(lat);
      nextQuery.lng = String(lng);
    }
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
    hasCoordinates,
    lat,
    lng,
    radiusKm,
    date,
    from,
    to,
    availableNow,
    page,
    size,
    sort,
  ]);

  const citySuggestions = useMemo(() => {
    const dynamicCities = items
      .map((item) => item.locationText?.trim() || '')
      .filter(Boolean);

    return Array.from(new Set([city, ...dynamicCities].filter(Boolean))).slice(0, 10);
  }, [items, city]);

  const activeFilters = useMemo(() => {
    const filters: string[] = [`Tipo: ${SEARCH_TYPE_LABELS[searchType]}`];

    if (query) filters.push(`Búsqueda: ${query}`);
    if (categorySlug) filters.push(`Rubro: ${humanizeSlug(categorySlug)}`);
    if (city) filters.push(`Ubicación: ${city}`);
    if (hasCoordinates) filters.push(`Cerca mío (${radiusKm} km)`);
    if (date) filters.push(`Fecha: ${formatDateLabel(date)}`);
    if (from && to && !date) filters.push(`Rango: ${formatDateLabel(from)} - ${formatDateLabel(to)}`);
    if (availableNow) filters.push('Disponible ahora');

    return filters;
  }, [searchType, query, categorySlug, city, hasCoordinates, radiusKm, date, from, to, availableNow]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  const getCategoryLabel = (item: SearchItem) =>
    item.categorySlugs.length > 0 ? humanizeSlug(item.categorySlugs[0]) : 'Profesional';

  const replaceQuery = (nextQuery: Record<string, string>) => {
    void router.replace(
      {
        pathname: '/explorar',
        query: nextQuery,
      },
      undefined,
      { shallow: true },
    );
  };

  const handleViewChange = (nextIsMapView: boolean) => {
    const nextQuery: Record<string, string> = { ...baseExploreQuery };
    if (nextIsMapView) nextQuery.vista = 'mapa';
    replaceQuery(nextQuery);
  };

  const handleSortChange = (nextSort: SearchSort) => {
    const nextQuery: Record<string, string> = {
      ...baseExploreQuery,
      sort: nextSort,
      page: '0',
    };
    if (isMapView) nextQuery.vista = 'mapa';
    replaceQuery(nextQuery);
  };

  const handleRadiusChange = (nextRadiusKm: number) => {
    const sanitizedRadius = Number.isFinite(nextRadiusKm)
      ? Math.max(1, Math.min(100, Math.round(nextRadiusKm)))
      : SEARCH_DEFAULT_RADIUS_KM;
    const nextQuery: Record<string, string> = {
      ...baseExploreQuery,
      radiusKm: String(sanitizedRadius),
      page: '0',
    };
    if (isMapView) nextQuery.vista = 'mapa';
    replaceQuery(nextQuery);
  };

  const handlePageChange = (nextPage: number) => {
    const normalizedPage = Math.max(0, Math.min(nextPage, totalPages - 1));
    const nextQuery: Record<string, string> = {
      ...baseExploreQuery,
      page: String(normalizedPage),
    };
    if (isMapView) nextQuery.vista = 'mapa';
    replaceQuery(nextQuery);
  };

  const mapUserLocation =
    hasCoordinates && typeof lat === 'number' && typeof lng === 'number'
      ? { latitude: lat, longitude: lng }
      : undefined;

  const selectedRadiusOption = useMemo(() => {
    const rounded = Math.round(radiusKm);
    return RADIUS_OPTIONS.includes(rounded) ? rounded : SEARCH_DEFAULT_RADIUS_KM;
  }, [radiusKm]);
  const activeMapItemId = hoveredMapItemId || selectedMapItemId;

  return (
    <div className="min-h-screen bg-[color:var(--bg-soft)] text-[color:var(--ink)]">
      {hasClientSession ? <ClientDashboardNavbar name={displayName} /> : <Navbar />}
      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-24 pt-12">
        <header className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Explorar</p>
            <h1 className="text-3xl font-semibold text-[color:var(--ink)] sm:text-4xl">
              Profesionales y locales
            </h1>
            <p className="max-w-2xl text-sm text-[color:var(--ink-muted)] sm:text-base">
              Buscá por tipo, ubicación, fecha o disponibilidad inmediata.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className="inline-flex rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]"
              >
                {filter}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-1 shadow-[var(--shadow-card)]">
              <button
                type="button"
                onClick={() => handleViewChange(false)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !isMapView
                    ? 'bg-[color:var(--surface-dark)] text-[color:var(--text-on-dark)]'
                    : 'text-[color:var(--ink)] hover:bg-[color:var(--surface-soft)]'
                }`}
                aria-pressed={!isMapView}
              >
                Vista lista
              </button>
              <button
                type="button"
                onClick={() => handleViewChange(true)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isMapView
                    ? 'bg-[color:var(--surface-dark)] text-[color:var(--text-on-dark)]'
                    : 'text-[color:var(--ink)] hover:bg-[color:var(--surface-soft)]'
                }`}
                aria-pressed={isMapView}
              >
                Vista mapa
              </button>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-3 py-1.5 shadow-[var(--shadow-card)]">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--ink-faint)]">
                Orden
              </span>
              <select
                value={sort}
                onChange={(event) => handleSortChange(event.target.value as SearchSort)}
                className="rounded-full bg-transparent text-sm font-semibold text-[color:var(--ink)] focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-3 py-1.5 shadow-[var(--shadow-card)]">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--ink-faint)]">
                Radio
              </span>
              <select
                value={String(selectedRadiusOption)}
                onChange={(event) => handleRadiusChange(Number(event.target.value))}
                className="rounded-full bg-transparent text-sm font-semibold text-[color:var(--ink)] focus:outline-none"
              >
                {RADIUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} km
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <ExploreFilters
          initialValues={filterValues}
          fixedQuery={{
            ...(isMapView ? { vista: 'mapa' } : {}),
            sort,
            size: String(size),
            radiusKm: String(radiusKm),
          }}
          citySuggestions={citySuggestions}
        />

        {isMapView ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#0E2A47]">Mapa</h2>
              <span className="text-sm text-[#6B7280]">
                {isLoading ? 'Cargando...' : `${total.toLocaleString('es-UY')} resultados`}
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="order-2 rounded-[24px] border border-[#0E2A47]/10 bg-white p-4 shadow-sm lg:order-1 lg:col-span-5 lg:max-h-[620px] lg:overflow-y-auto">
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
                        <p>Intentá ampliar el radio, buscar otro rubro o quitar filtros.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {items.map((item, index) => (
                      <ExploreCard
                        key={item.id}
                        id={String(item.id)}
                        name={item.name}
                        category={getCategoryLabel(item)}
                        rating={typeof item.rating === 'number' ? item.rating.toFixed(1) : undefined}
                        price={formatPriceFrom(item.priceFrom)}
                        city={item.locationText || undefined}
                        distance={item.distanceKm}
                        imageUrl={item.coverImageUrl}
                        available={availableNow}
                        href={
                          item.slug
                            ? `/profesional/pagina/${encodeURIComponent(item.slug)}`
                            : undefined
                        }
                        isHighlighted={activeMapItemId === String(item.id)}
                        priority={index < 2}
                        onHoverStart={(id) => {
                          if (!id) return;
                          setHoveredMapItemId(id);
                        }}
                        onHoverEnd={(id) => {
                          if (!id) {
                            setHoveredMapItemId(null);
                            return;
                          }
                          setHoveredMapItemId((current) => (current === id ? null : current));
                        }}
                        isFavorite={isFavorite(item.slug)}
                        onFavoriteToggle={() => {
                          if (!item.slug) return;
                          void toggleFavorite({
                            slug: item.slug,
                            name: item.name,
                            category: getCategoryLabel(item),
                            location: item.locationText || undefined,
                            imageUrl: item.coverImageUrl || undefined,
                            headline: item.headline || undefined,
                          });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="order-1 rounded-[24px] border border-[#0E2A47]/10 bg-white p-4 shadow-sm lg:order-2 lg:col-span-7">
                <div className="relative">
                  <ExploreMap
                    results={items}
                    userLocation={mapUserLocation}
                    activeResultId={activeMapItemId}
                    onActiveResultChange={setSelectedMapItemId}
                  />
                  {isLoading ? (
                    <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
                      <p className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0E2A47] shadow-sm">
                        Cargando resultados...
                      </p>
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
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#0E2A47]">Resultados</h2>
              <span className="text-sm text-[#6B7280]">
                {isLoading ? 'Cargando...' : `${total.toLocaleString('es-UY')} resultados`}
              </span>
            </div>
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
                    <p>Intentá ampliar el radio, buscar otro rubro o quitar filtros.</p>
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
                      imageUrl={item.coverImageUrl}
                      available={availableNow}
                      href={
                        item.slug
                          ? `/profesional/pagina/${encodeURIComponent(item.slug)}`
                          : undefined
                      }
                      priority={index < 4}
                      isFavorite={isFavorite(item.slug)}
                      onFavoriteToggle={() => {
                        if (!item.slug) return;
                        void toggleFavorite({
                          slug: item.slug,
                          name: item.name,
                          category: getCategoryLabel(item),
                          location: item.locationText || undefined,
                          imageUrl: item.coverImageUrl || undefined,
                          headline: item.headline || undefined,
                        });
                      }}
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
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
