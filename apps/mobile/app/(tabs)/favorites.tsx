import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  getFavoriteProfessionalSlugs,
  subscribeFavoriteProfessionalSlugs,
  toggleFavoriteProfessionalSlug,
} from '../../src/services/clientFeatures';
import {
  listPublicProfessionals,
  type PublicProfessionalSummary,
} from '../../src/services/publicBookings';

export default function FavoritesScreen() {
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [professionals, setProfessionals] = useState<PublicProfessionalSummary[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [saved, items] = await Promise.all([
          getFavoriteProfessionalSlugs(),
          listPublicProfessionals(),
        ]);
        setFavorites(saved);
        setProfessionals(items);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeFavoriteProfessionalSlugs((next) => {
      setFavorites(next);
    });
    return unsubscribe;
  }, []);

  const favoriteItems = useMemo(
    () => professionals.filter((item) => favorites.includes(item.slug)),
    [favorites, professionals],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Coleccion</Text>
        <Text className="mt-2 text-3xl font-bold text-secondary">Tus favoritos</Text>
        <Text className="mt-2 text-sm text-gray-500">
          Guarda profesionales para reservar en segundos desde mobile.
        </Text>

        {loading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#1FB6A6" />
          </View>
        ) : null}

        {!loading && favoriteItems.length === 0 ? (
          <View className="mt-8 rounded-[24px] border border-dashed border-secondary/20 bg-white p-6 items-center">
            <Ionicons name="heart-outline" size={32} color="#94A3B8" />
            <Text className="mt-3 text-center text-sm text-gray-500">
              Todavia no agregaste favoritos. Explora y guarda tus locales preferidos.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/explore')}
              className="mt-4 rounded-full bg-secondary px-5 py-3"
            >
              <Text className="font-semibold text-white">Ir a explorar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && favoriteItems.map((item) => (
          <TouchableOpacity
            key={item.slug}
            onPress={() => router.push(`/profesional/${item.slug}`)}
            className="mt-4 rounded-[22px] bg-white p-5 shadow-sm border border-secondary/5"
            activeOpacity={0.9}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">{item.fullName}</Text>
                <Text className="mt-1 text-sm text-gray-500">{item.rubro || 'Profesional'}</Text>
                <Text className="mt-1 text-xs text-gray-400">{item.location || 'Sin ubicacion'}</Text>
              </View>
              <TouchableOpacity
                onPress={async () => setFavorites(await toggleFavoriteProfessionalSlug(item.slug))}
                className="h-10 w-10 items-center justify-center rounded-full bg-red-50"
              >
                <Ionicons name="heart" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
