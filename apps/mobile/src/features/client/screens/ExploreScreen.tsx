import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type DimensionValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '../../../lib/icons';
import {
  listPublicProfessionals,
  type PublicProfessionalSummary,
} from '../../../services/publicBookings';
import {
  getFavoriteProfessionalSlugs,
  subscribeFavoriteProfessionalSlugs,
  toggleFavoriteProfessionalSlug,
} from '../../../services/clientFeatures';
import { listCategories } from '../../../services/categories';
import { buildMapboxStaticMapUrl, mapboxForwardGeocode } from '../../../services/mapbox';
import { searchProfessionals } from '../../../services/search';
import type { SearchItem, SearchSort, SearchType } from '../../../types/search';
import type { ServiceCategoryOption } from '../../../types/professional';
import { useUserLocation } from '../../../hooks/useUserLocation';
import { AppScreen } from '../../../components/ui/AppScreen';
import { theme } from '../../../theme';

type ExplorePlace = {
  id: string;
  slug: string;
  fullName: string;
  rubro?: string;
  location?: string | null;
  headline?: string | null;
  distanceKm?: number | null;
  rating?: number | null;
  reviewsCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
};

type Coordinates = {
  lat: number;
  lng: number;
};

type LocationFilter = {
  coordinates: Coordinates;
  label: string;
};

const DEFAULT_MAP_CENTER: Coordinates = {
  lat: -34.6037,
  lng: -58.3816,
};

const DEFAULT_RADIUS_KM = 10;
const SEARCH_SIZE = 50;

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

const resolveCategoryLabel = (
  categorySlugs: string[] | undefined,
  categories: ServiceCategoryOption[],
) => {
  const firstSlug = categorySlugs?.[0];
  if (!firstSlug) return 'Profesional';
  return categories.find((category) => category.slug === firstSlug)?.name || humanizeSlug(firstSlug);
};

const isValidCoordinatePair = (latitude?: number | null, longitude?: number | null) =>
  typeof latitude === 'number'
  && Number.isFinite(latitude)
  && typeof longitude === 'number'
  && Number.isFinite(longitude);

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
  rating: professional.rating,
  reviewsCount: professional.reviewsCount,
  imageUrl: professional.logoUrl,
});

const mapSearchResultToPlace = (
  result: SearchItem,
  categories: ServiceCategoryOption[],
): ExplorePlace => ({
  id: String(result.id),
  slug: result.slug,
  fullName: result.businessName || result.professionalName || result.name,
  rubro: resolveCategoryLabel(result.categorySlugs, categories),
  location: result.locationText,
  headline: result.headline,
  distanceKm: result.distanceKm,
  rating: result.rating,
  reviewsCount: result.reviewsCount,
  latitude: result.latitude,
  longitude: result.longitude,
  imageUrl: result.coverImageUrl,
});

const formatDistance = (distanceKm?: number | null) => {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
};

const formatRating = (rating?: number | null) => {
  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating <= 0) return null;
  return rating.toFixed(1);
};

const buildDateOptions = () => {
  const today = new Date();
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const value = date.toISOString().slice(0, 10);
    const label = index === 0
      ? 'Hoy'
      : index === 1
        ? 'Mañana'
        : date.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
    return { value, label };
  });
};

const getMarkerPosition = (marker: ExplorePlace, center: Coordinates, index: number) => {
  if (!isValidCoordinatePair(marker.latitude, marker.longitude)) {
    return {
      left: `${20 + (index % 4) * 18}%` as DimensionValue,
      top: `${24 + (index % 3) * 17}%` as DimensionValue,
    };
  }

  const latitude = marker.latitude as number;
  const longitude = marker.longitude as number;
  const lngDelta = Math.max(Math.min((longitude - center.lng) * 850, 36), -36);
  const latDelta = Math.max(Math.min((center.lat - latitude) * 850, 30), -30);
  return {
    left: `${50 + lngDelta}%` as DimensionValue,
    top: `${48 + latDelta}%` as DimensionValue,
  };
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
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
  }>();

  const initialCategorySlug = resolveQueryParam(params.category).trim();
  const initialCategoryLabel = resolveQueryParam(params.categoryLabel).trim();
  const initialQuery = resolveQueryParam(params.q).trim();
  const initialLat = parseOptionalNumber(resolveQueryParam(params.lat).trim());
  const initialLng = parseOptionalNumber(resolveQueryParam(params.lng).trim());
  const initialCenter = isValidCoordinatePair(initialLat, initialLng)
    ? { lat: initialLat as number, lng: initialLng as number }
    : DEFAULT_MAP_CENTER;

  const [searchText, setSearchText] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<ExplorePlace[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(initialCategorySlug);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilter | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>(initialCenter);
  const [mapCenterChanged, setMapCenterChanged] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [manualLocation, setManualLocation] = useState('');

  const bottomNavHeight = Platform.OS === 'ios'
    ? 60 + Math.max(insets.bottom, 10)
    : 58 + Math.max(insets.bottom, 30);
  const sheetBottomOffset = bottomNavHeight - 1;
  const sheetHeight = isSheetExpanded ? 430 : 284;
  const mapBottomPadding = sheetHeight + sheetBottomOffset - 32;
  const dateOptions = useMemo(buildDateOptions, []);

  const activeCategoryLabel = useMemo(() => {
    if (!selectedCategorySlug) return initialCategoryLabel || null;
    return categories.find((category) => category.slug === selectedCategorySlug)?.name
      || initialCategoryLabel
      || humanizeSlug(selectedCategorySlug);
  }, [categories, initialCategoryLabel, selectedCategorySlug]);

  const mapMarkers = useMemo(
    () => searchResults.filter((item) => isValidCoordinatePair(item.latitude, item.longitude)),
    [searchResults],
  );
  const sheetResults = searchResults;
  const favoriteSet = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs]);

  const loadMarketplace = useCallback(async ({
    query = searchText,
    categorySlug = selectedCategorySlug,
    date = selectedDate,
    location = locationFilter,
    showLoader = true,
  }: {
    query?: string;
    categorySlug?: string;
    date?: string | null;
    location?: LocationFilter | null;
    showLoader?: boolean;
  } = {}) => {
    if (showLoader) setIsLoading(true);
    setErrorMessage(null);

    try {
      const [categoryItems, favorites] = await Promise.all([
        listCategories().catch(() => []),
        getFavoriteProfessionalSlugs().catch(() => []),
      ]);

      setCategories(categoryItems);
      setFavoriteSlugs(favorites);

      try {
        const response = await searchProfessionals({
          query: query.trim() || undefined,
          type: 'SERVICIO' as SearchType,
          categorySlug: categorySlug || undefined,
          date: date || undefined,
          page: 0,
          size: SEARCH_SIZE,
          lat: location?.coordinates.lat,
          lng: location?.coordinates.lng,
          radiusKm: location ? DEFAULT_RADIUS_KM : undefined,
          sort: (location ? 'DISTANCE' : 'RELEVANCE') as SearchSort,
        });
        setSearchResults(response.items.map((item) => mapSearchResultToPlace(item, categoryItems)));
      } catch {
        const publicProfessionals = await listPublicProfessionals();
        setSearchResults(publicProfessionals.map(mapPublicProfessionalToPlace));
      }
    } catch {
      setErrorMessage('No pudimos cargar los resultados.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [locationFilter, searchText, selectedCategorySlug, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      void loadMarketplace({
        query: initialQuery,
        categorySlug: initialCategorySlug,
        date: null,
        location: null,
      });
      // La carga al foco no debe quedar atada al texto tipeado ni mover la busqueda por cada tecla.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCategorySlug, initialQuery]),
  );

  useEffect(() => {
    const unsubscribe = subscribeFavoriteProfessionalSlugs((next) => {
      setFavoriteSlugs(next);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (
      locationFilter
      || mapCenterChanged
      || !hasCoordinates
      || typeof location.latitude !== 'number'
      || typeof location.longitude !== 'number'
    ) {
      return;
    }

    setMapCenter({ lat: location.latitude, lng: location.longitude });
  }, [
    hasCoordinates,
    location.latitude,
    location.longitude,
    locationFilter,
    mapCenterChanged,
  ]);

  const refreshDataset = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadMarketplace({ showLoader: false }),
        refreshLocation(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMarketplace, refreshLocation]);

  const executeSearch = useCallback(async () => {
    await loadMarketplace({ query: searchText });
  }, [loadMarketplace, searchText]);

  const resolveUserCoordinates = useCallback(async (): Promise<LocationFilter | null> => {
    if (
      typeof location.latitude === 'number'
      && typeof location.longitude === 'number'
    ) {
      return {
        coordinates: { lat: location.latitude, lng: location.longitude },
        label: location.label || 'Mi ubicacion',
      };
    }

    const nextLocation = await requestLocationAccess();
    if (
      typeof nextLocation.latitude === 'number'
      && typeof nextLocation.longitude === 'number'
    ) {
      return {
        coordinates: { lat: nextLocation.latitude, lng: nextLocation.longitude },
        label: nextLocation.label || 'Mi ubicacion',
      };
    }

    Alert.alert(
      'Ubicacion no disponible',
      nextLocation.permissionStatus === 'denied' && !nextLocation.canAskAgain
        ? 'Activa la ubicacion desde los ajustes del dispositivo para buscar cerca tuyo.'
        : 'No pudimos obtener tu ubicacion. El mapa sigue mostrando resultados generales.',
    );
    return null;
  }, [location.label, location.latitude, location.longitude, requestLocationAccess]);

  const searchNearUser = useCallback(async () => {
    const nextFilter = await resolveUserCoordinates();
    if (!nextFilter) return;

    setLocationFilter(nextFilter);
    setMapCenter(nextFilter.coordinates);
    setMapCenterChanged(false);
    setShowLocationModal(false);
    await loadMarketplace({ location: nextFilter });
  }, [loadMarketplace, resolveUserCoordinates]);

  const centerOnUser = useCallback(async () => {
    const nextFilter = await resolveUserCoordinates();
    if (!nextFilter) return;

    setMapCenter(nextFilter.coordinates);
    setMapCenterChanged(false);
  }, [resolveUserCoordinates]);

  const searchManualLocation = useCallback(async () => {
    const query = manualLocation.trim();
    if (!query) return;

    const geocoded = await mapboxForwardGeocode(query);
    if (!geocoded) {
      Alert.alert('Zona no encontrada', 'No pudimos resolver esa ubicacion. Proba con barrio y ciudad.');
      return;
    }

    const nextFilter = {
      coordinates: { lat: geocoded.latitude, lng: geocoded.longitude },
      label: geocoded.placeName,
    };

    setLocationFilter(nextFilter);
    setMapCenter(nextFilter.coordinates);
    setMapCenterChanged(false);
    setShowLocationModal(false);
    await loadMarketplace({ location: nextFilter });
  }, [loadMarketplace, manualLocation]);

  const clearLocationFilter = useCallback(async () => {
    setLocationFilter(null);
    setShowLocationModal(false);
    await loadMarketplace({ location: null });
  }, [loadMarketplace]);

  const moveMapCenter = useCallback((latDelta: number, lngDelta: number) => {
    setMapCenter((current) => ({
      lat: current.lat + latDelta,
      lng: current.lng + lngDelta,
    }));
    setMapCenterChanged(true);
  }, []);

  const searchInMapCenter = useCallback(async () => {
    const nextFilter = {
      coordinates: mapCenter,
      label: 'Centro del mapa',
    };
    setLocationFilter(nextFilter);
    setMapCenterChanged(false);
    await loadMarketplace({ location: nextFilter });
  }, [loadMarketplace, mapCenter]);

  const selectDate = useCallback(async (date: string | null) => {
    setSelectedDate(date);
    setShowDateModal(false);
    await loadMarketplace({ date });
  }, [loadMarketplace]);

  const clearFilters = useCallback(async () => {
    setSearchText('');
    setSelectedDate(null);
    setSelectedCategorySlug('');
    setLocationFilter(null);
    setMapCenterChanged(false);
    await loadMarketplace({
      query: '',
      categorySlug: '',
      date: null,
      location: null,
    });
  }, [loadMarketplace]);

  const selectedDateLabel = selectedDate
    ? dateOptions.find((option) => option.value === selectedDate)?.label || selectedDate
    : 'Fecha';
  const locationButtonLabel = locationFilter?.label || 'Ubicacion';

  return (
    <AppScreen
      edges={['top']}
      fillInnerShell
      refreshing={isRefreshing}
      onRefresh={() => {
        void refreshDataset();
      }}
      contentContainerStyle={{ paddingHorizontal: 0 }}
    >
      <View className="flex-1">
        <View className="z-10 px-5 pt-3">
          <View className="rounded-[28px] bg-white px-4 py-3" style={styles.searchSurface}>
            <View className="flex-row items-center">
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => {
                  void executeSearch();
                }}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={styles.searchIconBubble}
              >
                <Ionicons name="search" size={22} color={theme.colors.primaryStrong} />
              </TouchableOpacity>
              <TextInput
                className="ml-3 flex-1 text-base text-secondary"
                placeholder="Buscar servicios o negocios"
                placeholderTextColor={theme.colors.inkFaint}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                onSubmitEditing={() => {
                  void executeSearch();
                }}
                accessibilityLabel="Buscar servicios o negocios"
              />
              {searchText.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setSearchText('')}
                  className="h-9 w-9 items-center justify-center rounded-full"
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.inkFaint} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View className="mt-4 flex-row" style={{ gap: 12 }}>
            <FilterButton
              icon="location"
              label={locationButtonLabel}
              active={Boolean(locationFilter)}
              onPress={() => setShowLocationModal(true)}
            />
            <FilterButton
              icon="calendar-outline"
              label={selectedDateLabel}
              active={Boolean(selectedDate)}
              onPress={() => setShowDateModal(true)}
            />
          </View>

          {activeCategoryLabel ? (
            <View className="mt-3 self-start rounded-full bg-white px-3 py-2" style={styles.chipShadow}>
              <Text className="text-xs font-bold text-primary">{activeCategoryLabel}</Text>
            </View>
          ) : null}
        </View>

        <ExploreMapPanel
          center={mapCenter}
          markers={mapMarkers}
          isLoading={isLoading && searchResults.length === 0}
          bottomPadding={mapBottomPadding}
          showSearchAreaButton={mapCenterChanged}
          onSearchArea={() => {
            void searchInMapCenter();
          }}
          onCenterUser={() => {
            void centerOnUser();
          }}
          onMove={moveMapCenter}
        />

        <ExploreResultsSheet
          bottomOffset={sheetBottomOffset}
          height={sheetHeight}
          expanded={isSheetExpanded}
          loading={isLoading}
          errorMessage={errorMessage}
          results={sheetResults}
          favoriteSet={favoriteSet}
          markerCount={mapMarkers.length}
          onToggleExpanded={() => setIsSheetExpanded((prev) => !prev)}
          onClearFilters={() => {
            void clearFilters();
          }}
          onToggleFavorite={async (slug) => setFavoriteSlugs(await toggleFavoriteProfessionalSlug(slug))}
        />
      </View>

      <LocationModal
        visible={showLocationModal}
        manualLocation={manualLocation}
        isRefreshingLocation={isRefreshingLocation}
        onManualLocationChange={setManualLocation}
        onClose={() => setShowLocationModal(false)}
        onUseCurrent={() => {
          void searchNearUser();
        }}
        onUseManual={() => {
          void searchManualLocation();
        }}
        onClear={() => {
          void clearLocationFilter();
        }}
      />

      <DateModal
        visible={showDateModal}
        options={dateOptions}
        selectedDate={selectedDate}
        onClose={() => setShowDateModal(false)}
        onSelect={(date) => {
          void selectDate(date);
        }}
      />
    </AppScreen>
  );
}

function FilterButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      className="h-[72px] flex-1 flex-row items-center rounded-[16px] bg-white px-4"
      style={styles.filterButton}
    >
      <Ionicons name={icon} size={28} color={active ? theme.colors.primaryStrong : theme.colors.primary} />
      <Text className="ml-3 flex-1 text-base font-bold text-secondary" numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ExploreMapPanel({
  center,
  markers,
  isLoading,
  bottomPadding,
  showSearchAreaButton,
  onSearchArea,
  onCenterUser,
  onMove,
}: {
  center: Coordinates;
  markers: ExplorePlace[];
  isLoading: boolean;
  bottomPadding: number;
  showSearchAreaButton: boolean;
  onSearchArea: () => void;
  onCenterUser: () => void;
  onMove: (latDelta: number, lngDelta: number) => void;
}) {
  const mapImageUrl = buildMapboxStaticMapUrl({
    latitude: center.lat,
    longitude: center.lng,
    width: 900,
    height: 900,
    zoom: 13,
  });
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
      onPanResponderRelease: (_event, gesture) => {
        if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) return;
        onMove(gesture.dy * 0.00012, -gesture.dx * 0.00012);
      },
    }),
    [onMove],
  );

  return (
    <View className="absolute inset-x-0 bottom-0 top-[156px]" style={{ paddingBottom: bottomPadding }}>
      <View className="flex-1 overflow-hidden bg-[#EDE8DF]" {...panResponder.panHandlers}>
        {mapImageUrl ? (
          <ImageBackground
            source={{ uri: mapImageUrl }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.mapRoad, styles.mapRoadOne]} />
            <View style={[styles.mapRoad, styles.mapRoadTwo]} />
            <View style={[styles.mapRoad, styles.mapRoadThree]} />
            <View style={[styles.mapRoad, styles.mapRoadFour]} />
            <View style={[styles.mapPark, styles.mapParkOne]} />
            <View style={[styles.mapPark, styles.mapParkTwo]} />
          </View>
        )}

        <View pointerEvents="none" style={styles.mapDim} />

        {markers.slice(0, 24).map((marker, index) => {
          const position = getMarkerPosition(marker, center, index);
          return (
            <View key={`${marker.slug}-${index}`} pointerEvents="none" className="absolute" style={position}>
              <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-white">
                <Ionicons name="business" size={17} color={theme.colors.primaryStrong} />
              </View>
              <View className="-mt-1 ml-[12px] h-3.5 w-3.5 rotate-45 border-b-2 border-r-2 border-primary bg-white" />
            </View>
          );
        })}

        <View pointerEvents="none" className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-6 -translate-y-6 items-center justify-center rounded-full bg-primary/15">
          <View className="h-7 w-7 rounded-full border-2 border-white bg-primary" />
        </View>

        {isLoading ? (
          <View className="absolute inset-x-0 top-12 items-center">
            <View className="rounded-full bg-white px-4 py-2" style={styles.chipShadow}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          </View>
        ) : null}

        {showSearchAreaButton ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onSearchArea}
            className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-primary px-5 py-3"
            style={styles.floatingButton}
          >
            <Text className="text-sm font-bold text-white">Buscar en esta zona</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onCenterUser}
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-white"
          style={styles.floatingButton}
        >
          <Ionicons name="locate-outline" size={28} color={theme.colors.primaryStrong} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ExploreResultsSheet({
  bottomOffset,
  height,
  expanded,
  loading,
  errorMessage,
  results,
  favoriteSet,
  markerCount,
  onToggleExpanded,
  onClearFilters,
  onToggleFavorite,
}: {
  bottomOffset: number;
  height: number;
  expanded: boolean;
  loading: boolean;
  errorMessage: string | null;
  results: ExplorePlace[];
  favoriteSet: Set<string>;
  markerCount: number;
  onToggleExpanded: () => void;
  onClearFilters: () => void;
  onToggleFavorite: (slug: string) => void;
}) {
  return (
    <View
      className="absolute inset-x-0 rounded-t-[28px] bg-white px-5 pt-3"
      style={[styles.sheet, { bottom: bottomOffset, height }]}
    >
      <TouchableOpacity activeOpacity={0.8} onPress={onToggleExpanded} className="items-center pb-3">
        <View className="h-1.5 w-20 rounded-full bg-gray-300" />
      </TouchableOpacity>

      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-bold text-secondary">
            {markerCount > 0 ? 'Locales en esta zona' : 'Resultados'}
          </Text>
          <Text className="mt-1 text-sm text-muted">
            Mostrando <Text className="font-bold text-primary">{results.length}</Text> resultados
          </Text>
        </View>
        <TouchableOpacity onPress={onToggleExpanded} className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={18} color={theme.colors.primaryStrong} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="mt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {loading ? (
          <View className="items-center rounded-[18px] bg-backgroundMuted py-8">
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-sm font-semibold text-muted">Cargando resultados...</Text>
          </View>
        ) : null}

        {!loading && errorMessage ? (
          <View className="rounded-[18px] bg-red-50 px-4 py-4">
            <Text className="text-sm font-semibold text-red-700">{errorMessage}</Text>
          </View>
        ) : null}

        {!loading && !errorMessage && results.length === 0 ? (
          <View className="items-start rounded-[18px] bg-backgroundMuted px-4 py-5">
            <Text className="text-base font-bold text-secondary">No encontramos locales con estos filtros</Text>
            <Text className="mt-2 text-sm leading-5 text-muted">
              Proba limpiando filtros o buscando en una zona mas amplia.
            </Text>
            <TouchableOpacity onPress={onClearFilters} className="mt-4 rounded-full bg-primary px-4 py-2">
              <Text className="text-sm font-bold text-white">Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !errorMessage ? results.map((place) => (
          <ExploreResultCard
            key={place.id}
            place={place}
            isFavorite={favoriteSet.has(place.slug)}
            onToggleFavorite={() => onToggleFavorite(place.slug)}
          />
        )) : null}
      </ScrollView>
    </View>
  );
}

function ExploreResultCard({
  place,
  isFavorite,
  onToggleFavorite,
}: {
  place: ExplorePlace;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const distanceLabel = formatDistance(place.distanceKm);
  const ratingLabel = formatRating(place.rating);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/profesional/${place.slug}`)}
      className="mb-3 flex-row overflow-hidden rounded-[18px] border border-secondary/5 bg-white"
      style={styles.resultCard}
    >
      <View className="h-[104px] w-[112px] overflow-hidden bg-primary/10">
        {place.imageUrl ? (
          <Image source={{ uri: place.imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={theme.gradients.success}
            className="h-full w-full items-center justify-center"
          >
            <Ionicons name="sparkles-outline" size={28} color="#FFFFFF" />
          </LinearGradient>
        )}
      </View>

      <View className="flex-1 px-3 py-3">
        <View className="flex-row items-start">
          <View className="flex-1 pr-2">
            <Text className="text-base font-bold text-secondary" numberOfLines={1}>
              {place.fullName}
            </Text>
            <Text className="mt-1 text-sm text-muted" numberOfLines={1}>
              {place.rubro || 'Profesional'}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            className="h-10 w-10 items-center justify-center rounded-[14px] border border-secondary/5 bg-white"
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={theme.colors.primaryStrong}
            />
          </TouchableOpacity>
        </View>

        <View className="mt-2 flex-row items-center">
          <Ionicons name="location-outline" size={14} color={theme.colors.primaryStrong} />
          <Text className="ml-1 flex-1 text-sm text-muted" numberOfLines={1}>
            {place.location || 'Ubicacion a confirmar'}{distanceLabel ? ` - ${distanceLabel}` : ''}
          </Text>
        </View>

        {ratingLabel ? (
          <View className="mt-2 self-start flex-row items-center rounded-full bg-primary/10 px-2.5 py-1">
            <Ionicons name="star" size={13} color={theme.colors.primaryStrong} />
            <Text className="ml-1 text-xs font-semibold text-primary">
              {ratingLabel}
              {typeof place.reviewsCount === 'number' ? ` (${place.reviewsCount})` : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function LocationModal({
  visible,
  manualLocation,
  isRefreshingLocation,
  onManualLocationChange,
  onClose,
  onUseCurrent,
  onUseManual,
  onClear,
}: {
  visible: boolean;
  manualLocation: string;
  isRefreshingLocation: boolean;
  onManualLocationChange: (value: string) => void;
  onClose: () => void;
  onUseCurrent: () => void;
  onUseManual: () => void;
  onClear: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable className="mx-5 rounded-[24px] bg-white p-5" style={styles.modalCard}>
          <Text className="text-lg font-bold text-secondary">Ubicacion</Text>
          <Text className="mt-1 text-sm text-muted">
            Elegi cuando queres usar coordenadas como filtro real.
          </Text>

          <TouchableOpacity onPress={onUseCurrent} className="mt-5 flex-row items-center rounded-[18px] bg-primary px-4 py-4">
            <Ionicons name="locate-outline" size={22} color="#FFFFFF" />
            <Text className="ml-3 flex-1 text-sm font-bold text-white">
              {isRefreshingLocation ? 'Buscando ubicacion...' : 'Buscar cerca de mi'}
            </Text>
          </TouchableOpacity>

          <View className="mt-4 rounded-[18px] border border-secondary/10 px-4 py-3">
            <TextInput
              className="text-base text-secondary"
              placeholder="Barrio, ciudad o zona"
              placeholderTextColor={theme.colors.inkFaint}
              value={manualLocation}
              onChangeText={onManualLocationChange}
              returnKeyType="search"
              onSubmitEditing={onUseManual}
            />
          </View>
          <TouchableOpacity onPress={onUseManual} className="mt-3 rounded-full bg-primary/10 px-4 py-3">
            <Text className="text-center text-sm font-bold text-primary">Usar ubicacion manual</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClear} className="mt-3 rounded-full px-4 py-3">
            <Text className="text-center text-sm font-bold text-muted">Limpiar ubicacion</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DateModal({
  visible,
  options,
  selectedDate,
  onClose,
  onSelect,
}: {
  visible: boolean;
  options: Array<{ value: string; label: string }>;
  selectedDate: string | null;
  onClose: () => void;
  onSelect: (date: string | null) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable className="mx-5 max-h-[520px] rounded-[24px] bg-white p-5" style={styles.modalCard}>
          <Text className="text-lg font-bold text-secondary">Fecha</Text>
          <Text className="mt-1 text-sm text-muted">Filtra disponibilidad solo cuando elegis una fecha.</Text>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => onSelect(option.value)}
                className="mb-2 flex-row items-center justify-between rounded-[16px] px-4 py-3"
                style={selectedDate === option.value ? styles.selectedDateOption : styles.dateOption}
              >
                <Text className="text-sm font-bold text-secondary">{option.label}</Text>
                <Text className="text-sm text-muted">{option.value.slice(5)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={() => onSelect(null)} className="mt-3 rounded-full px-4 py-3">
            <Text className="text-center text-sm font-bold text-muted">Limpiar fecha</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  searchSurface: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.055,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 },
    elevation: 2,
  },
  searchIconBubble: {
    backgroundColor: theme.colors.primarySoft,
  },
  filterButton: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  chipShadow: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  floatingButton: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sheet: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 8,
  },
  resultCard: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.055,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  mapDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 250, 244, 0.16)',
  },
  mapRoad: {
    position: 'absolute',
    height: 8,
    width: '125%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(210, 198, 183, 0.38)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapRoadOne: {
    left: '-15%',
    top: '18%',
    transform: [{ rotate: '-21deg' }],
  },
  mapRoadTwo: {
    left: '-10%',
    top: '48%',
    transform: [{ rotate: '38deg' }],
  },
  mapRoadThree: {
    left: '-18%',
    top: '68%',
    transform: [{ rotate: '-12deg' }],
  },
  mapRoadFour: {
    left: '-8%',
    top: '34%',
    transform: [{ rotate: '82deg' }],
  },
  mapPark: {
    position: 'absolute',
    borderRadius: 18,
    backgroundColor: 'rgba(142, 219, 99, 0.18)',
  },
  mapParkOne: {
    right: '6%',
    top: '7%',
    width: 92,
    height: 120,
    transform: [{ rotate: '18deg' }],
  },
  mapParkTwo: {
    left: '28%',
    top: '56%',
    width: 58,
    height: 74,
    transform: [{ rotate: '-31deg' }],
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.32)',
  },
  modalCard: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  dateOption: {
    backgroundColor: theme.colors.backgroundMuted,
  },
  selectedDateOption: {
    backgroundColor: theme.colors.primarySoft,
  },
});
