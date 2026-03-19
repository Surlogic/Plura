import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { listPublicProfessionals, type PublicProfessionalSummary } from '../../src/services/publicBookings';
import {
  getFavoriteProfessionalSlugs,
  subscribeFavoriteProfessionalSlugs,
  toggleFavoriteProfessionalSlug,
} from '../../src/services/clientFeatures';
import { searchProfessionals } from '../../src/services/search';
import type { SearchSort, SearchType } from '../../src/types/search';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import AgendaScreen from '../dashboard/agenda';
import { listCategories } from '../../src/services/categories';
import type { ServiceCategoryOption } from '../../src/types/professional';

const sortOptions: Array<{ value: SearchSort; label: string }> = [
  { value: 'RELEVANCE', label: 'Relevancia' },
  { value: 'DISTANCE', label: 'Distancia' },
  { value: 'RATING', label: 'Mejor valorados' },
];

const resolveQueryParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? '' : value ?? '';

export default function ExploreScreen() {
  const { role, profile } = useProfessionalProfileContext();
  const params = useLocalSearchParams<{ category?: string; categoryLabel?: string; q?: string }>();
  const initialCategorySlug = resolveQueryParam(params.category).trim();
  const initialCategoryLabel = resolveQueryParam(params.categoryLabel).trim();
  const initialQuery = resolveQueryParam(params.q).trim();

  const [activeFilter, setActiveFilter] = useState(initialCategorySlug || 'all');
  const [search, setSearch] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(true);
  const [places, setPlaces] = useState<PublicProfessionalSummary[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableNow, setAvailableNow] = useState(false);
  const [radiusKm, setRadiusKm] = useState<'3' | '5' | '10' | '20'>('10');
  const [sortBy, setSortBy] = useState<SearchSort>('RATING');
  const [searchType, setSearchType] = useState<SearchType>('SERVICIO');
  const [searchDate, setSearchDate] = useState('');

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
        const [response, favorites, categoryItems] = await Promise.all([
          listPublicProfessionals(),
          getFavoriteProfessionalSlugs(),
          listCategories().catch(() => []),
        ]);

        if (isCancelled) return;
        setPlaces(response);
        setFavoriteSlugs(favorites);
        setCategories(categoryItems);
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
  }, [role]);

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

  const runAdvancedSearch = async () => {
    setIsLoading(true);
    try {
      const response = await searchProfessionals({
        query: search || undefined,
        type: searchType,
        categorySlug: activeFilter === 'all' ? undefined : activeFilter,
        availableNow,
        radiusKm: Number(radiusKm),
        sort: sortBy,
        date: searchDate || undefined,
        page: 0,
        size: 50,
      });

      setPlaces(
        response.items.map((item) => ({
          id: String(item.id),
          slug: item.slug,
          fullName: item.fullName,
          rubro: item.rubro,
          location: item.locationText,
          headline: item.headline,
        })),
      );
    } catch {
      // Preserve previous results when advanced search fails.
    } finally {
      setIsLoading(false);
    }
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

        <TouchableOpacity
          onPress={() => setShowAdvanced((prev) => !prev)}
          className="mt-3 flex-row items-center justify-between rounded-2xl border border-secondary/10 px-4 py-3"
        >
          <Text className="text-sm font-semibold text-secondary">Filtros avanzados</Text>
          <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={16} color="#0E2A47" />
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
                  onPress={() => setSortBy(option.value)}
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
              onPress={runAdvancedSearch}
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
            {activeFilter !== 'all' ? (
              <Text className="text-xs font-semibold text-primary">{activeFilterLabel}</Text>
            ) : null}
          </View>

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#1FB6A6" />
            </View>
          ) : null}

          {!isLoading && filteredPlaces.length === 0 ? (
            <View className="rounded-[24px] border border-dashed border-secondary/15 bg-white p-6">
              <Text className="text-center text-sm text-gray-500">
                No encontramos resultados con esos filtros. Prueba cambiando rubro o texto de busqueda.
              </Text>
            </View>
          ) : null}

          {!isLoading && filteredPlaces.map((place) => (
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
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={14} color="#1FB6A6" />
                  <Text className="ml-1 text-sm font-bold text-secondary">{place.location || 'Sin ubicacion'}</Text>
                </View>
                <Text className="text-sm text-gray-500">{place.headline || 'Agenda disponible'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
