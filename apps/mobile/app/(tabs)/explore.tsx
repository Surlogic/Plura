import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  listPublicProfessionals,
  type PublicProfessionalSummary,
} from '../../src/services/publicBookings';
import {
  getFavoriteProfessionalSlugs,
  subscribeFavoriteProfessionalSlugs,
  toggleFavoriteProfessionalSlug,
} from '../../src/services/clientFeatures';
import { searchProfessionals } from '../../src/services/search';
import type { SearchItem, SearchSort, SearchType } from '../../src/types/search';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import AgendaScreen from '../dashboard/agenda';
import { listCategories } from '../../src/services/categories';
import type { ServiceCategoryOption } from '../../src/types/professional';
import { useUserLocation } from '../../src/hooks/useUserLocation';

const sortOptions: Array<{ value: SearchSort; label: string }> = [
  { value: 'RELEVANCE', label: 'Relevancia' },
  { value: 'DISTANCE', label: 'Distancia' },
  { value: 'RATING', label: 'Mejor valorados' },
];

type ExplorePlace = {
  id: string;
  slug: string;
  fullName: string;
  rubro?: string;
  location?: string | null;
  headline?: string | null;
  distanceKm?: number | null;
};

type NearbyCoordinates = {
  lat: number;
  lng: number;
};

const resolveQueryParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? '' : value ?? '';

const parseOptionalNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const humanizeSlug = (value: string) =>
  value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeRadiusOption = (value: string): '3' | '5' | '10' | '20' => {
  if (value === '3' || value === '5' || value === '10' || value === '20') return value;
  return '10';
};

const normalizeSortOption = (value: string): SearchSort => {
  if (value === 'DISTANCE' || value === 'RATING' || value === 'RELEVANCE') return value;
  return 'RATING';
};

const resolveCategoryLabel = (
  categorySlugs: string[] | undefined,
  categories: ServiceCategoryOption[],
) => {
  const firstSlug = categorySlugs?.[0];
  if (!firstSlug) return 'Profesional';
  return categories.find((category) => category.slug === firstSlug)?.name || humanizeSlug(firstSlug);
};

const mapPublicProfessionalToPlace = (
  professional: PublicProfessionalSummary,
): ExplorePlace => ({
  id: String(professional.id),
  slug: professional.slug,
  fullName: professional.fullName,
  rubro: professional.rubro,
  location: professional.location,
  headline: professional.headline,
  distanceKm: null,
});

const mapSearchResultToPlace = (
  result: SearchItem,
  categories: ServiceCategoryOption[],
): ExplorePlace => ({
  id: String(result.id),
  slug: result.slug,
  fullName: result.name,
  rubro: resolveCategoryLabel(result.categorySlugs, categories),
  location: result.locationText,
  headline: result.headline,
  distanceKm: result.distanceKm,
});

const formatDistance = (distanceKm?: number | null) => {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
};

export default function ExploreScreen() {
  const { role, profile } = useProfessionalProfileContext();
  const {
    location,
    hasCoordinates,
    isRefreshing: isRefreshingLocation,
    requestAccess: requestLocationAccess,
    refreshLocation,
  } = useUserLocation();
  const params = useLocalSearchParams<{
    category?: string;
    categoryLabel?: string;
    q?: string;
    lat?: string;
    lng?: string;
    radiusKm?: string;
    sort?: string;
  }>();
  const initialCategorySlug = resolveQueryParam(params.category).trim();
  const initialCategoryLabel = resolveQueryParam(params.categoryLabel).trim();
  const initialQuery = resolveQueryParam(params.q).trim();
  const initialLat = parseOptionalNumber(resolveQueryParam(params.lat).trim());
  const initialLng = parseOptionalNumber(resolveQueryParam(params.lng).trim());
  const initialHasCoordinates =
    typeof initialLat === 'number' && typeof initialLng === 'number';
  const initialRadiusKm = normalizeRadiusOption(resolveQueryParam(params.radiusKm).trim());
  const initialSort = normalizeSortOption(resolveQueryParam(params.sort).trim() || 'RATING');

  const [activeFilter, setActiveFilter] = useState(initialCategorySlug || 'all');
  const [search, setSearch] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(true);
  const [places, setPlaces] = useState<ExplorePlace[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableNow, setAvailableNow] = useState(false);
  const [radiusKm, setRadiusKm] = useState<'3' | '5' | '10' | '20'>(initialRadiusKm);
  const [sortBy, setSortBy] = useState<SearchSort>(
    initialHasCoordinates && initialSort === 'RATING' ? 'DISTANCE' : initialSort,
  );
  const [searchType, setSearchType] = useState<SearchType>('SERVICIO');
  const [searchDate, setSearchDate] = useState('');
  const [useMyLocation, setUseMyLocation] = useState(initialHasCoordinates);

  useEffect(() => {
    setActiveFilter(initialCategorySlug || 'all');
  }, [initialCategorySlug]);

  useEffect(() => {
    setSearch(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (role === 'professional') {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [favorites, categoryItems] = await Promise.all([
          getFavoriteProfessionalSlugs(),
          listCategories().catch(() => []),
        ]);

        if (isCancelled) return;
        setFavoriteSlugs(favorites);
        setCategories(categoryItems);

        let nextPlaces: ExplorePlace[];

        if (initialHasCoordinates && typeof initialLat === 'number' && typeof initialLng === 'number') {
          try {
            const searchResponse = await searchProfessionals({
              query: initialQuery || undefined,
              type: 'SERVICIO',
              categorySlug: initialCategorySlug || undefined,
              lat: initialLat,
              lng: initialLng,
              radiusKm: Number(initialRadiusKm),
              sort: initialSort === 'RATING' ? 'DISTANCE' : initialSort,
              page: 0,
              size: 50,
            });
            nextPlaces = searchResponse.items.map((item) =>
              mapSearchResultToPlace(item, categoryItems),
            );
          } catch {
            const publicProfessionals = await listPublicProfessionals();
            nextPlaces = publicProfessionals.map(mapPublicProfessionalToPlace);
          }
        } else {
          const publicProfessionals = await listPublicProfessionals();
          nextPlaces = publicProfessionals.map(mapPublicProfessionalToPlace);
        }

        if (isCancelled) return;
        setPlaces(nextPlaces);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [
    initialCategorySlug,
    initialHasCoordinates,
    initialLat,
    initialLng,
    initialQuery,
    initialRadiusKm,
    initialSort,
    role,
  ]);

  useEffect(() => {
    if (role === 'professional') return undefined;
    const unsubscribe = subscribeFavoriteProfessionalSlugs((next) => {
      setFavoriteSlugs(next);
    });
    return unsubscribe;
  }, [role]);

  const filterOptions = useMemo(
    () => [
      { slug: 'all', name: 'Todos' },
      ...categories.map((category) => ({ slug: category.slug, name: category.name })),
    ],
    [categories],
  );

  const activeFilterLabel = useMemo(() => {
    if (activeFilter === 'all') return 'Todos';
    return filterOptions.find((item) => item.slug === activeFilter)?.name || initialCategoryLabel || 'Categoria';
  }, [activeFilter, filterOptions, initialCategoryLabel]);

  const filteredPlaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    return places.filter((place) => {
      const matchesText =
        !query
        || place.fullName.toLowerCase().includes(query)
        || (place.rubro || '').toLowerCase().includes(query)
        || (place.location || '').toLowerCase().includes(query);

      if (!matchesText) return false;
      if (activeFilter === 'all') return true;

      return (place.rubro || '').toLowerCase().includes(activeFilterLabel.toLowerCase());
    });
  }, [activeFilter, activeFilterLabel, places, search]);

  const locationLabel = location.label || 'tu ubicacion actual';

  const resolveNearbyCoordinates = async (): Promise<NearbyCoordinates | null> => {
    if (
      typeof location.latitude === 'number'
      && typeof location.longitude === 'number'
    ) {
      return {
        lat: location.latitude,
        lng: location.longitude,
      };
    }

    const nextLocation = await requestLocationAccess();
    if (
      typeof nextLocation.latitude === 'number'
      && typeof nextLocation.longitude === 'number'
    ) {
      return {
        lat: nextLocation.latitude,
        lng: nextLocation.longitude,
      };
    }

    Alert.alert(
      'Ubicacion requerida',
      nextLocation.permissionStatus === 'denied' && !nextLocation.canAskAgain
        ? 'Activa la ubicacion desde los ajustes del dispositivo para filtrar por cercania.'
        : 'Necesitamos tu ubicacion para ordenar resultados por cercania.',
    );
    return null;
  };

  const runAdvancedSearch = async ({
    nearby = useMyLocation,
    nextSort = sortBy,
    coords,
  }: {
    nearby?: boolean;
    nextSort?: SearchSort;
    coords?: NearbyCoordinates | null;
  } = {}) => {
    setIsLoading(true);
    try {
      const nearbyCoordinates = nearby
        ? (coords ?? await resolveNearbyCoordinates())
        : null;

      if (nearby && !nearbyCoordinates) {
        setUseMyLocation(false);
        if (nextSort === 'DISTANCE') {
          setSortBy('RATING');
        }
        return;
      }

      const response = await searchProfessionals({
        query: search || undefined,
        type: searchType,
        categorySlug: activeFilter === 'all' ? undefined : activeFilter,
        availableNow,
        radiusKm: Number(radiusKm),
        sort: nearby ? nextSort : nextSort === 'DISTANCE' ? 'RATING' : nextSort,
        date: searchDate || undefined,
        page: 0,
        size: 50,
        lat: nearby ? nearbyCoordinates?.lat : undefined,
        lng: nearby ? nearbyCoordinates?.lng : undefined,
      });

      setPlaces(
        response.items.map((item) => mapSearchResultToPlace(item, categories)),
      );
      setUseMyLocation(nearby);
      setSortBy(nearby ? nextSort : nextSort === 'DISTANCE' ? 'RATING' : nextSort);
    } catch {
      // Preserve previous results when advanced search fails.
    } finally {
      setIsLoading(false);
    }
  };

  const handleNearbyToggle = async (value: boolean) => {
    if (!value) {
      setUseMyLocation(false);
      if (sortBy === 'DISTANCE') {
        setSortBy('RATING');
      }
      return;
    }

    const nearbyCoordinates = await resolveNearbyCoordinates();
    if (!nearbyCoordinates) return;

    setUseMyLocation(true);
    setSortBy('DISTANCE');
  };

  const handleSortChange = async (value: SearchSort) => {
    if (value !== 'DISTANCE') {
      setSortBy(value);
      return;
    }

    const nearbyCoordinates = await resolveNearbyCoordinates();
    if (!nearbyCoordinates) return;

    setUseMyLocation(true);
    setSortBy('DISTANCE');
  };

  if (role === 'professional' && profile) {
    return <AgendaScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="z-10 bg-white px-6 pb-4 pt-2 shadow-sm">
        <Text className="mb-1 text-xs font-semibold uppercase tracking-[2px] text-gray-500">Explorar</Text>
        <Text className="mb-4 text-2xl font-bold text-secondary">Profesionales y rubros</Text>

        <View className="h-12 flex-row items-center rounded-[16px] border border-secondary/10 bg-background px-4">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="ml-2 flex-1 text-base text-secondary"
            placeholder="Buscar servicios o profesionales..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="mt-3 rounded-2xl border border-secondary/10 bg-background p-4">
          <View className="flex-row items-start">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/12">
              <Ionicons
                name={hasCoordinates ? 'locate' : 'location-outline'}
                size={20}
                color="#0A7A43"
              />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-secondary">
                {hasCoordinates ? `Tu ubicacion: ${locationLabel}` : 'Usa tu ubicacion'}
              </Text>
              <Text className="mt-1 text-xs leading-5 text-gray-500">
                {hasCoordinates
                  ? 'Ya puedes ordenar resultados por cercania real y filtrar por radio.'
                  : 'Activa este permiso para buscar profesionales cerca tuyo y ordenar por distancia.'}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row" style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={() => void runAdvancedSearch({ nearby: true, nextSort: 'DISTANCE' })}
              className="flex-1 items-center justify-center rounded-full bg-secondary px-4 py-3"
            >
              <Text className="text-sm font-bold text-white">Buscar cercanos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void (hasCoordinates ? refreshLocation() : requestLocationAccess())}
              className="flex-1 items-center justify-center rounded-full border border-secondary/10 bg-white px-4 py-3"
            >
              <Text className="text-sm font-bold text-secondary">
                {isRefreshingLocation
                  ? 'Actualizando...'
                  : hasCoordinates
                    ? 'Actualizar'
                    : 'Activar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowAdvanced((prev) => !prev)}
          className="mt-3 flex-row items-center justify-between rounded-2xl border border-secondary/10 px-4 py-3"
        >
          <Text className="text-sm font-semibold text-secondary">Filtros avanzados</Text>
          <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={16} color="#0F172A" />
        </TouchableOpacity>

        {showAdvanced ? (
          <View className="mt-3 rounded-2xl border border-secondary/10 bg-background p-4">
            <Text className="text-xs uppercase tracking-[2px] text-gray-500">Tipo</Text>
            <View className="mt-2 flex-row" style={{ gap: 8 }}>
              {(['SERVICIO', 'PROFESIONAL', 'RUBRO'] as SearchType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSearchType(type)}
                  className={`rounded-full px-3 py-2 ${searchType === type ? 'bg-secondary' : 'border border-secondary/10 bg-white'}`}
                >
                  <Text className={`text-xs font-semibold ${searchType === type ? 'text-white' : 'text-secondary'}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="mt-4 text-xs uppercase tracking-[2px] text-gray-500">Orden</Text>
            <View className="mt-2 flex-row" style={{ gap: 8 }}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => void handleSortChange(option.value)}
                  className={`rounded-full px-3 py-2 ${sortBy === option.value ? 'bg-secondary' : 'border border-secondary/10 bg-white'}`}
                >
                  <Text className={`text-xs font-semibold ${sortBy === option.value ? 'text-white' : 'text-secondary'}`}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-secondary">Disponible ahora</Text>
              <Switch value={availableNow} onValueChange={setAvailableNow} />
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-secondary">Usar mi ubicacion</Text>
                <Text className="mt-1 text-xs leading-5 text-gray-500">
                  {useMyLocation
                    ? `Buscando cerca de ${locationLabel}.`
                    : 'Activa la cercania para ordenar por distancia y aplicar radio en km.'}
                </Text>
              </View>
              <Switch value={useMyLocation} onValueChange={(value) => void handleNearbyToggle(value)} />
            </View>

            <View className="mt-4 flex-row" style={{ gap: 8 }}>
              {(['3', '5', '10', '20'] as const).map((radius) => (
                <TouchableOpacity
                  key={radius}
                  onPress={() => setRadiusKm(radius)}
                  className={`rounded-full px-3 py-2 ${radiusKm === radius ? 'bg-primary' : 'border border-secondary/10 bg-white'}`}
                >
                  <Text className={`text-xs font-semibold ${radiusKm === radius ? 'text-white' : 'text-secondary'}`}>{radius} km</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              className="mt-4 h-11 rounded-xl border border-secondary/10 bg-white px-3 text-secondary"
              placeholder="Fecha YYYY-MM-DD (opcional)"
              value={searchDate}
              onChangeText={setSearchDate}
            />

            <TouchableOpacity
              onPress={() => void runAdvancedSearch()}
              className="mt-4 h-11 items-center justify-center rounded-full bg-secondary"
            >
              <Text className="text-sm font-bold text-white">Aplicar filtros</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="py-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
            {filterOptions.map((filter) => {
              const isActive = activeFilter === filter.slug;
              return (
                <TouchableOpacity
                  key={filter.slug}
                  onPress={() => setActiveFilter(filter.slug)}
                  className={`rounded-full border px-4 py-2 ${
                    isActive ? 'border-secondary bg-secondary' : 'border-secondary/10 bg-white'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-secondary'}`}>
                    {filter.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View className="mt-2 px-6">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-semibold uppercase tracking-[2px] text-gray-500">
              Resultados ({filteredPlaces.length})
            </Text>
            {useMyLocation ? (
              <View className="rounded-full bg-primary/10 px-3 py-1">
                <Text className="text-[11px] font-bold text-primary">{locationLabel}</Text>
              </View>
            ) : activeFilter !== 'all' ? (
              <Text className="text-xs font-semibold text-primary">{activeFilterLabel}</Text>
            ) : null}
          </View>

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#0A7A43" />
            </View>
          ) : null}

          {!isLoading && filteredPlaces.length === 0 ? (
            <View className="rounded-[24px] border border-dashed border-secondary/15 bg-white p-6">
              <Text className="text-center text-sm text-gray-500">
                No encontramos resultados con esos filtros. Prueba ampliando el radio, cambiando rubro o texto de busqueda.
              </Text>
            </View>
          ) : null}

          {!isLoading && filteredPlaces.map((place) => {
            const distanceLabel = formatDistance(place.distanceKm);

            return (
              <TouchableOpacity
                key={place.id}
                activeOpacity={0.9}
                onPress={() => router.push(`/profesional/${place.slug}`)}
                className="mb-4 rounded-[24px] border border-secondary/5 bg-white p-4 shadow-sm"
              >
                <View className="mb-4 h-40 w-full items-center justify-center rounded-[20px] bg-[#E9EEF2]">
                  <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                </View>

                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-bold text-secondary">{place.fullName}</Text>
                    <Text className="mt-1 text-sm text-gray-500">
                      {place.rubro || 'Profesional'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => setFavoriteSlugs(await toggleFavoriteProfessionalSlug(place.slug))}
                    className="h-8 w-8 items-center justify-center rounded-full bg-red-50"
                  >
                    <Ionicons
                      name={favoriteSlugs.includes(place.slug) ? 'heart' : 'heart-outline'}
                      size={15}
                      color="#EF4444"
                    />
                  </TouchableOpacity>
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={14} color="#0A7A43" />
                      <Text className="ml-1 text-sm font-bold text-secondary">
                        {place.location || 'Sin ubicacion'}
                      </Text>
                    </View>
                    <Text className="mt-2 text-sm text-gray-500">
                      {place.headline || 'Agenda disponible'}
                    </Text>
                  </View>
                  {distanceLabel ? (
                    <View className="rounded-full bg-primary/10 px-3 py-1">
                      <Text className="text-[11px] font-bold text-primary">{distanceLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
