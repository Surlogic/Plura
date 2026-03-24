import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getFavoriteProfessionalSlugs,
  subscribeFavoriteProfessionalSlugs,
  toggleFavoriteProfessionalSlug,
} from '../../src/services/clientFeatures';
import {
  listPublicProfessionals,
  type PublicProfessionalSummary,
} from '../../src/services/publicBookings';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import ServicesScreen from '../dashboard/services';
import { getCategoryAccent } from '../../src/features/client/categoryUi';
import { AppScreen } from '../../src/components/ui/AppScreen';
import { theme } from '../../src/theme';
import {
  ActionButton,
  EmptyState,
  ScreenHero,
  SectionHeader,
  StatusPill,
} from '../../src/components/ui/MobileSurface';

export default function FavoritesScreen() {
  const { role, profile, clientProfile } = useProfessionalProfileContext();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [professionals, setProfessionals] = useState<PublicProfessionalSummary[]>([]);

  useEffect(() => {
    if (role === 'professional') {
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [saved, items] = await Promise.all([
          getFavoriteProfessionalSlugs(),
          listPublicProfessionals(),
        ]);
        if (isCancelled) return;
        setFavorites(saved);
        setProfessionals(items);
      } finally {
        if (!isCancelled) {
          setLoading(false);
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
      setFavorites(next);
    });
    return unsubscribe;
  }, [role]);

  const favoriteItems = useMemo(
    () => professionals.filter((item) => favorites.includes(item.slug)),
    [favorites, professionals],
  );

  if (role === 'professional' && profile) {
    return <ServicesScreen />;
  }

  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <ScreenHero
          eyebrow="Favoritos"
          title={clientProfile?.fullName ? `${clientProfile.fullName}, tus favoritos` : 'Tus favoritos'}
          description="Guarda profesionales para volver mas rapido a reservar desde mobile y mantener una lista mas ordenada."
          icon="heart-outline"
          badges={[
            { label: `${favoriteItems.length} guardados`, tone: 'light' },
          ]}
        />

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        {!loading && favoriteItems.length === 0 ? (
          <View className="mt-8">
            <EmptyState
              title="Todavia no agregaste favoritos"
              description="Explora y guarda tus profesionales preferidos para volver a reservar mas rapido."
              icon="heart-outline"
              actionLabel="Ir a explorar"
              onActionPress={() => router.push('/(tabs)/explore')}
            />
          </View>
        ) : null}

        {!loading && favoriteItems.length > 0 ? (
          <View className="mt-8">
            <SectionHeader eyebrow="Guardados" title="Tu seleccion personal" />
          </View>
        ) : null}

        {!loading && favoriteItems.map((item) => {
          const categoryName = item.rubro || 'Profesional';
          const accent = getCategoryAccent(categoryName);

          return (
            <TouchableOpacity
              key={item.slug}
              onPress={() => router.push(`/profesional/${item.slug}`)}
              className="mt-5 overflow-hidden rounded-[26px] border border-secondary/5 bg-white shadow-sm"
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={[accent.colors[0], accent.colors[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="p-5"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-bold uppercase tracking-[2px] text-white/75">
                      {categoryName}
                    </Text>
                    <Text className="mt-2 text-2xl font-bold text-white">{item.fullName}</Text>
                    <Text className="mt-2 text-sm text-white/80">
                      {item.location || 'Ubicacion a confirmar'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => setFavorites(await toggleFavoriteProfessionalSlug(item.slug))}
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
                  >
                    <Ionicons name="heart" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              <View className="p-5">
                <Text className="text-sm leading-5 text-muted">
                  {item.headline || 'Guardado para volver a reservar mas rapido cuando lo necesites.'}
                </Text>

                <View className="mt-4 flex-row items-center justify-between">
                  <StatusPill label="Guardado" tone="primary" />
                  <View className="flex-row" style={{ gap: 10 }}>
                    <ActionButton
                      label="Ver perfil"
                      onPress={() => router.push(`/profesional/${item.slug}`)}
                      tone="primary"
                    />
                    <ActionButton
                      label="Quitar"
                      onPress={async () => setFavorites(await toggleFavoriteProfessionalSlug(item.slug))}
                      tone="soft"
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
    </AppScreen>
  );
}
