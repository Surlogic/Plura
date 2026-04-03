import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { listPublicProfessionals, type PublicProfessionalSummary } from '../../src/services/publicBookings';
import { getClientNextBooking, type ClientNextBooking } from '../../src/services/clientFeatures';
import { getApiErrorMessage } from '../../src/services/errors';
import { useAuthSession } from '../../src/context/ProfessionalProfileContext';
import { listCategories } from '../../src/services/categories';
import type { ServiceCategoryOption } from '../../src/types/professional';
import { getCategoryAccent } from '../../src/features/client/categoryUi';
import { AppScreen } from '../../src/components/ui/AppScreen';
import { theme } from '../../src/theme';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import {
  ActionButton,
  EmptyState,
  MessageCard,
  ScreenHero,
  SectionCard,
  SectionHeader,
  StatusPill,
} from '../../src/components/ui/MobileSurface';

export default function HomeScreen() {
  const { clientProfile, isAuthenticated, role } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const load = useCallback(async (options?: { showLoader?: boolean }) => {
    const showLoader = options?.showLoader ?? true;
    if (showLoader) {
      setIsLoading(true);
    }
    setErrorMessage(null);
    try {
      const [professionals, upcoming, categoryItems] = await Promise.all([
        listPublicProfessionals(),
        isAuthenticated ? getClientNextBooking().catch(() => null) : Promise.resolve(null),
        listCategories().catch(() => []),
      ]);

      setBusinesses(professionals);
      setNextBooking(upcoming);
      setCategories(categoryItems);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'No pudimos cargar la pantalla de inicio.'));
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        load({ showLoader: false }),
        refreshLocation(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [load, refreshLocation]);

  const topBusinesses = useMemo(() => businesses.slice(0, 6), [businesses]);
  const displayName = clientProfile?.fullName?.trim() || 'Explora Plura';
  const locationLabel = location.label || 'tu zona';
  const shouldShowPushPrompt =
    isAuthenticated && role !== 'professional' && !arePushNotificationsEnabled;

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

  return (
    <AppScreen
      scroll
      refreshing={isRefreshing}
      onRefresh={() => {
        void handleRefresh();
      }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="px-6 pt-6 pb-4">
        <ScreenHero
          eyebrow={isAuthenticated ? 'Inicio cliente' : 'Explorar en mobile'}
          title={isAuthenticated ? `Hola, ${displayName}` : 'Encuentra servicios y profesionales'}
          description={isAuthenticated
            ? 'Descubre rubros, retoma tu proxima reserva y encuentra profesionales activos con una interfaz mucho mas clara.'
            : 'Explora rubros, perfiles publicos y disponibilidad antes de iniciar sesion. Cuando quieras guardar favoritos o ver tus reservas, te pediremos acceso.'}
          icon="sparkles-outline"
          badges={[
            { label: hasCoordinates ? locationLabel : 'Ubicacion pendiente', tone: hasCoordinates ? 'light' : 'warning' },
            { label: isAuthenticated ? (arePushNotificationsEnabled ? 'Alertas activas' : 'Alertas pendientes') : 'Acceso publico', tone: 'light' },
          ]}
          primaryAction={{
            label: 'Explorar',
            onPress: () => router.push('/(tabs)/explore'),
            tone: 'secondary',
          }}
          secondaryAction={{
            label: isAuthenticated ? 'Alertas' : 'Ingresar',
            onPress: () => router.push(isAuthenticated ? '/(tabs)/notifications' : '/(auth)/login'),
            tone: 'light',
          }}
        />

        <SectionCard style={{ marginTop: 16, paddingVertical: 16 }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/explore')}
            className="flex-row items-center"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-backgroundSoft">
              <Ionicons name="search" size={20} color={theme.colors.secondary} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[11px] font-bold uppercase tracking-[2px] text-faint">
                Busqueda rapida
              </Text>
              <Text className="mt-1 text-base font-semibold text-secondary">
                Buscar servicios, rubros o locales
              </Text>
            </View>
            <StatusPill label="Explorar" tone="primary" />
          </TouchableOpacity>
        </SectionCard>

        <SectionCard style={{ marginTop: 16 }}>
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
            <ActionButton
              label="Ver cercanos"
              onPress={() => void handleOpenNearby()}
              style={{ flex: 1 }}
            />
            <ActionButton
              label={
                isRefreshingLocation
                  ? 'Actualizando...'
                  : hasCoordinates
                    ? 'Actualizar'
                    : 'Usar mi ubicacion'
              }
              onPress={() => void (hasCoordinates ? refreshLocation() : requestLocationAccess())}
              tone="soft"
              style={{ flex: 1 }}
            />
          </View>
        </SectionCard>

        {shouldShowPushPrompt ? (
          <ScreenHero
            eyebrow="Notificaciones"
            title="Activa avisos de reservas y alertas"
            description="Asi podemos avisarte cuando una reserva se confirma, cambia o se cancela."
            icon="notifications-outline"
            style={{ marginTop: 16 }}
            gradientColors={theme.gradients.hero}
            primaryAction={{
              label: isRefreshingPush ? 'Activando...' : 'Activar notificaciones',
              onPress: () => void requestPushPermission(),
              tone: 'secondary',
            }}
          />
        ) : null}
      </View>

      <View className="mt-4">
        <View className="px-6">
          <SectionHeader eyebrow="Rubros" title="Rubros populares" actionLabel="Ver todos" onActionPress={() => router.push('/(tabs)/explore')} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingTop: 16 }}
        >
          {categories.length === 0 && !isLoading ? (
            <View style={{ width: 240 }}>
              <EmptyState
                title="Sin rubros por ahora"
                description="Todavia no hay rubros listados para mostrar en esta seccion."
                icon="grid-outline"
              />
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
          <MessageCard message={errorMessage} tone="danger" style={{ marginBottom: 16 }} />
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
            {isAuthenticated
              ? (nextBooking ? 'Tu proximo turno' : 'Todavia no tienes una reserva activa')
              : 'Explora antes de ingresar'}
          </Text>
          <Text className="mt-2 text-sm text-white/80">
            {isAuthenticated
              ? (nextBooking
                  ? `${nextBooking.service} con ${nextBooking.professional} - ${nextBooking.date} ${nextBooking.time}`
                  : 'Explora rubros y encuentra profesionales disponibles para reservar desde mobile.')
              : 'Puedes buscar profesionales, ver perfiles publicos y luego iniciar sesion para guardar favoritos, revisar reservas y recibir alertas.'}
          </Text>
          <TouchableOpacity
            className="mt-4 self-start rounded-full bg-white px-5 py-2.5"
            onPress={() => router.push(isAuthenticated ? (nextBooking ? '/(tabs)/bookings' : '/(tabs)/explore') : '/(tabs)/explore')}
          >
            <Text className="text-sm font-bold text-secondary">
              {isAuthenticated ? (nextBooking ? 'Ver reservas' : 'Explorar ahora') : 'Explorar ahora'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <View className="mt-10">
        <View className="px-6">
          <SectionHeader eyebrow="Profesionales" title="Recomendados para vos" actionLabel="Ver todos" onActionPress={() => router.push('/(tabs)/explore')} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 16, paddingTop: 16 }}
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
