import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { listPublicProfessionals, type PublicProfessionalSummary } from '../../src/services/publicBookings';
import {
  getFavoriteProfessionalSlugs,
  subscribeFavoriteProfessionalSlugs,
  toggleFavoriteProfessionalSlug,
} from '../../src/services/clientFeatures';
import { searchProfessionals } from '../../src/services/search';
import type { SearchSort, SearchType } from '../../src/types/search';

const filters = ['Todos', 'Peluquería', 'Barbería', 'Uñas', 'Cosmetología', 'Spa'];
const sortOptions: Array<{ value: SearchSort; label: string }> = [
  { value: 'RELEVANCE', label: 'Relevancia' },
  { value: 'DISTANCE', label: 'Distancia' },
  { value: 'RATING', label: 'Mejor valorados' },
];

export default function ExploreScreen() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [places, setPlaces] = useState<PublicProfessionalSummary[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableNow, setAvailableNow] = useState(false);
  const [radiusKm, setRadiusKm] = useState<'3' | '5' | '10' | '20'>('10');
  const [sortBy, setSortBy] = useState<SearchSort>('RATING');
  const [searchType, setSearchType] = useState<SearchType>('SERVICIO');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [response, favorites] = await Promise.all([listPublicProfessionals(), getFavoriteProfessionalSlugs()]);
        setPlaces(response);
        setFavoriteSlugs(favorites);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeFavoriteProfessionalSlugs((next) => {
      setFavoriteSlugs(next);
    });
    return unsubscribe;
  }, []);

  const filteredPlaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    return places.filter((place) => {
      const matchesText =
        !query ||
        place.fullName.toLowerCase().includes(query) ||
        (place.rubro || '').toLowerCase().includes(query) ||
        (place.location || '').toLowerCase().includes(query);

      if (!matchesText) return false;
      if (activeFilter === 'Todos') return true;
      return (place.rubro || '').toLowerCase().includes(activeFilter.toLowerCase());
    });
  }, [places, search, activeFilter]);

  const runAdvancedSearch = async () => {
    setIsLoading(true);
    try {
      const response = await searchProfessionals({
        query: search || undefined,
        type: searchType,
        categorySlug: activeFilter === 'Todos' ? undefined : activeFilter.toLowerCase(),
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Cabecera y Buscador Fijo */}
      <View className="bg-white px-6 pb-4 pt-2 shadow-sm z-10">
        <Text className="text-2xl font-bold text-secondary mb-4">Explorar locales</Text>
        
        <View className="flex-row items-center bg-background h-12 rounded-[16px] px-4 border border-secondary/10">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-base text-secondary"
            placeholder="Buscar servicios o profesionales..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
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
                  className={`rounded-full px-3 py-2 ${searchType === type ? 'bg-secondary' : 'bg-white border border-secondary/10'}`}
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
                  className={`rounded-full px-3 py-2 ${sortBy === option.value ? 'bg-secondary' : 'bg-white border border-secondary/10'}`}
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
                  className={`rounded-full px-3 py-2 ${radiusKm === radius ? 'bg-primary' : 'bg-white border border-secondary/10'}`}
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
        
        {/* Filtros Horizontales (Chips) */}
        <View className="py-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-full border ${
                    isActive ? 'bg-secondary border-secondary' : 'bg-white border-secondary/10'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-secondary'}`}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lista de Resultados */}
        <View className="px-6 space-y-4 mt-2">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
              Resultados ({filteredPlaces.length})
            </Text>
          </View>

          {isLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#1FB6A6" />
            </View>
          ) : null}

          {!isLoading && filteredPlaces.map((place, index) => (
            <TouchableOpacity
              key={place.id || index}
              activeOpacity={0.9}
              onPress={() => router.push(`/profesional/${place.slug}`)}
              className="bg-white rounded-[24px] p-4 shadow-sm border border-secondary/5 mb-4"
            >
              <View className="h-40 w-full bg-[#E9EEF2] rounded-[20px] mb-4 items-center justify-center">
                <Ionicons name="image-outline" size={40} color="#9CA3AF" />
              </View>
              
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-lg font-bold text-secondary">{place.fullName}</Text>
                  <Text className="text-sm text-gray-500">{place.rubro || 'Profesional'}</Text>
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

              <View className="flex-row justify-between items-center mt-3">
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={14} color="#1FB6A6" />
                  <Text className="text-sm font-bold text-secondary ml-1">{place.location || 'Sin ubicación'}</Text>
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