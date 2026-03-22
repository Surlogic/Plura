import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { listPublicProfessionals, type PublicProfessionalSummary } from '../../src/services/publicBookings';
import { getClientNextBooking, type ClientNextBooking } from '../../src/services/clientFeatures';
import { getApiErrorMessage } from '../../src/services/errors';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { ProfessionalHomeTab } from '../../src/features/professional/ProfessionalHomeTab';
import { listCategories } from '../../src/services/categories';
import type { ServiceCategoryOption } from '../../src/types/professional';
import { getCategoryAccent } from '../../src/features/client/categoryUi';
import { AppScreen } from '../../src/components/ui/AppScreen';
import { theme } from '../../src/theme';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';

export default function HomeScreen() {
  const { role, profile, clientProfile } = useProfessionalProfileContext();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<PublicProfessionalSummary[]>([]);
  const [nextBooking, setNextBooking] = useState<ClientNextBooking | null>(null);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const {
    location,
    hasCoordinates,
    isRefreshing: isRefreshingLocation,
    requestAccess: requestLocationAccess,
    refreshLocation,
  } = useUserLocation();
  const {
    isEnabled: arePushNotificationsEnabled,
    isRefreshing: isRefreshingPush,
    requestPermission: requestPushPermission,
  } = usePushNotifications();

  useEffect(() => {
    if (role === 'professional') {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [professionals, upcoming, categoryItems] = await Promise.all([
          listPublicProfessionals(),
          getClientNextBooking().catch(() => null),
          listCategories().catch(() => []),
        ]);

        if (isCancelled) return;
        setBusinesses(professionals);
        setNextBooking(upcoming);
        setCategories(categoryItems);
      } catch (error) {
        if (isCancelled) return;
        setErrorMessage(getApiErrorMessage(error, 'No pudimos cargar la pantalla de inicio.'));
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

  const topBusinesses = useMemo(() => businesses.slice(0, 6), [businesses]);
  const displayName = clientProfile?.fullName?.trim() || 'Cliente';
  const locationLabel = location.label || 'tu zona';
  const shouldShowPushPrompt =
    role !== 'professional' && !arePushNotificationsEnabled;

  const handleOpenNearby = async () => {
    const nextLocation = hasCoordinates
      ? location
      : await requestLocationAccess();

    if (
      typeof nextLocation.latitude !== 'number'
      || typeof nextLocation.longitude !== 'number'
    ) {
      Alert.alert(
        'Ubicacion requerida',
        nextLocation.permissionStatus === 'denied' && !nextLocation.canAskAgain
          ? 'Activa la ubicacion desde los ajustes del dispositivo para mostrar resultados cercanos.'
          : 'Necesitamos tu ubicacion para abrir profesionales ordenados por cercania.',
      );
      return;
    }

    router.push({
      pathname: '/(tabs)/explore',
      params: {
        lat: String(nextLocation.latitude),
        lng: String(nextLocation.longitude),
        radiusKm: '10',
        sort: 'DISTANCE',
      },
    });
  };

  if (role === 'professional' && profile) {
    return <ProfessionalHomeTab />;
  }

  return (
    <AppScreen scroll contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-6 pb-4">
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold uppercase tracking-[2px] text-faint">
                Inicio cliente
              </Text>
              <Text className="mt-1 text-2xl font-bold text-secondary">
                Hola, {displayName}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-muted">
                Descubre rubros, retoma tu proxima reserva y encuentra profesionales activos.
              </Text>
            </View>
            <TouchableOpacity
              className="h-12 w-12 items-center justify-center rounded-full bg-backgroundSoft shadow-sm"
              onPress={() => router.push('/(tabs)/notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={theme.colors.ink} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/explore')}
            className="h-14 flex-row items-center rounded-full border border-secondary/5 bg-white px-5 shadow-sm"
          >
            <Ionicons name="search" size={20} color={theme.colors.inkFaint} />
            <Text className="ml-3 flex-1 text-base text-faint">
              Buscar servicios, rubros, locales...
            </Text>
            <View className="rounded-full bg-primary/10 px-3 py-1.5">
              <Text className="text-xs font-bold text-primary">Explorar</Text>
            </View>
          </TouchableOpacity>

          <View className="mt-4 rounded-[24px] border border-secondary/10 bg-white p-4 shadow-sm">
            <View className="flex-row items-start">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/12">
                <Ionicons name={hasCoordinates ? 'locate' : 'location-outline'} size={20} color={theme.colors.primary} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-secondary">
                  {hasCoordinates ? `Tu ubicacion: ${locationLabel}` : 'Activa tu ubicacion'}
                </Text>
                <Text className="mt-1 text-xs leading-5 text-muted">
                  {hasCoordinates
                    ? 'Ya puedes ordenar resultados por cercania real y abrir un listado cerca de ti.'
                    : 'Plura puede mostrar profesionales cercanos y mejorar los filtros de exploracion desde mobile.'}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={() => void handleOpenNearby()}
                className="flex-1 items-center justify-center rounded-full bg-secondary px-4 py-3"
              >
                <Text className="text-sm font-bold text-white">Ver cercanos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void (hasCoordinates ? refreshLocation() : requestLocationAccess())}
                className="flex-1 items-center justify-center rounded-full border border-secondary/10 bg-background px-4 py-3"
              >
                <Text className="text-sm font-bold text-secondary">
                  {isRefreshingLocation
                    ? 'Actualizando...'
                    : hasCoordinates
                      ? 'Actualizar'
                      : 'Usar mi ubicacion'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {shouldShowPushPrompt ? (
            <View className="mt-4 rounded-[24px] bg-secondary p-4 shadow-sm">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-white/75">
                Notificaciones
              </Text>
              <Text className="mt-2 text-lg font-bold text-white">
                Activa avisos de reservas y promociones
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/80">
                Asi podemos avisarte cuando una reserva se confirma, cambia, se cancela o aparece una promo.
              </Text>

              <TouchableOpacity
                onPress={() => void requestPushPermission()}
                className="mt-4 self-start rounded-full bg-white px-5 py-2.5"
              >
                <Text className="text-sm font-bold text-secondary">
                  {isRefreshingPush ? 'Activando...' : 'Activar notificaciones'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View className="mt-4">
          <View className="mb-4 flex-row items-end justify-between px-6">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-[2px] text-faint">
                Rubros
              </Text>
              <Text className="mt-1 text-xl font-bold text-secondary">Rubros populares</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text className="text-sm font-bold text-primary">Ver todos</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
          >
            {categories.length === 0 && !isLoading ? (
              <View className="w-56 rounded-[22px] border border-dashed border-secondary/15 bg-white p-4">
                <Text className="text-sm text-muted">No hay rubros disponibles por ahora.</Text>
              </View>
            ) : null}

            {categories.map((category) => {
              const accent = getCategoryAccent(category.name);
              return (
                <TouchableOpacity
                  key={category.id}
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/explore',
                      params: { category: category.slug, categoryLabel: category.name },
                    })
                  }
                  className="w-36"
                >
                  <LinearGradient
                    colors={[accent.colors[0], accent.colors[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="h-28 rounded-[24px] p-4 shadow-sm"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-white/15">
                      <Ionicons name={accent.icon} size={20} color="#FFFFFF" />
                    </View>
                    <Text className="mt-5 text-sm font-bold text-white" numberOfLines={2}>
                      {category.name}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View className="mt-10 px-6">
          {errorMessage ? (
            <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <Text className="text-sm text-red-600">{errorMessage}</Text>
            </View>
          ) : null}

          <LinearGradient
            colors={theme.gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-[28px] p-6 shadow-md"
          >
            <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">
              Proxima reserva
            </Text>
            <Text className="mt-2 text-2xl font-bold text-white">
              {nextBooking ? 'Tu proximo turno' : 'Todavia no tienes una reserva activa'}
            </Text>
            <Text className="mt-2 text-sm text-white/80">
              {nextBooking
                ? `${nextBooking.service} con ${nextBooking.professional} - ${nextBooking.date} ${nextBooking.time}`
                : 'Explora rubros y encuentra profesionales disponibles para reservar desde mobile.'}
            </Text>
            <TouchableOpacity
              className="mt-4 self-start rounded-full bg-white px-5 py-2.5"
              onPress={() => router.push(nextBooking ? '/(tabs)/bookings' : '/(tabs)/explore')}
            >
              <Text className="text-sm font-bold text-secondary">
                {nextBooking ? 'Ver reservas' : 'Explorar ahora'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View className="mt-10">
          <View className="mb-4 flex-row items-end justify-between px-6">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">
                Profesionales
              </Text>
              <Text className="mt-1 text-xl font-bold text-secondary">Recomendados para vos</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text className="text-sm font-bold text-primary">Ver todos</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
          >
            {isLoading ? (
              <View className="w-64 items-center justify-center rounded-[28px] border border-secondary/5 bg-white p-4 shadow-sm">
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : null}

            {!isLoading && topBusinesses.map((business) => {
              const accent = getCategoryAccent(
                business.rubro || 'Profesional',
              );

              return (
                <TouchableOpacity
                  key={business.id}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/profesional/${business.slug}`)}
                  className="w-72 rounded-[28px] border border-secondary/5 bg-white p-4 shadow-sm"
                >
                  <LinearGradient
                    colors={[accent.colors[0], accent.colors[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="mb-4 h-36 rounded-[22px] p-4"
                  >
                    <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">
                      Profesional
                    </Text>
                    <Text className="mt-4 text-xl font-bold text-white" numberOfLines={2}>
                      {business.fullName}
                    </Text>
                    <Text className="mt-2 text-sm text-white/80" numberOfLines={1}>
                      {business.rubro || 'Profesional'}
                    </Text>
                  </LinearGradient>

                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-bold text-secondary">
                        {business.headline || 'Agenda disponible'}
                      </Text>
                      <Text className="mt-2 text-xs text-muted">
                        {business.location || 'Ubicacion a confirmar'}
                      </Text>
                    </View>
                    <View className="rounded-full bg-primary/10 px-2 py-1">
                      <Text className="text-xs font-bold text-primary">Activo</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
    </AppScreen>
  );
}
