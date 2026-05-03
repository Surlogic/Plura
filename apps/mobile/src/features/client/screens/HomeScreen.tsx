import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import {
  getClientBookings,
  type ClientDashboardBooking,
} from '../../../services/clientBookings';
import { getApiErrorMessage } from '../../../services/errors';
import { useClientSession } from '../session/useClientSession';
import { listCategories } from '../../../services/categories';
import type { ServiceCategoryOption } from '../../../types/professional';
import { getCategoryAccent } from '../../../features/client/categoryUi';
import { AppScreen } from '../../../components/ui/AppScreen';
import { theme } from '../../../theme';
import { useUserLocation } from '../../../hooks/useUserLocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActionButton,
  EmptyState,
  MessageCard,
  SectionCard,
  StatusPill,
} from '../../../components/ui/MobileSurface';

const MAX_CATEGORY_ITEMS = 5;
const MAX_FEATURED_ITEMS = 8;
const MAX_PERSONALIZED_ITEMS = 8;
const MAX_FAVORITES_ITEMS = 8;
const MAX_NEW_ITEMS = 8;

type PersonalizedRailItem = {
  business: PublicProfessionalSummary;
  service: string | null;
};

const formatRating = (rating?: number | null) => {
  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating <= 0) return null;
  return rating.toFixed(1);
};

const getDisplayName = (fullName?: string | null) => {
  const trimmed = fullName?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] || trimmed;
};

const getBusinessCategory = (business: PublicProfessionalSummary) =>
  business.categories?.[0]?.name || business.rubro || 'Profesional';

const buildInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const sortByDateDesc = (a: ClientDashboardBooking, b: ClientDashboardBooking) =>
  new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();

function HomeRailHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: (() => void) | undefined;
}) {
  return (
    <View className="flex-row items-end justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-[22px] font-bold text-secondary">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-sm text-muted">{subtitle}</Text>
        ) : null}
      </View>

      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} activeOpacity={0.82}>
          <Text className="text-sm font-semibold text-primary">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function BusinessVisual({
  business,
  height,
  compact = false,
}: {
  business: PublicProfessionalSummary;
  height: number;
  compact?: boolean;
}) {
  const categoryName = getBusinessCategory(business);
  const accent = getCategoryAccent(categoryName);

  if (business.logoUrl) {
    return (
      <View
        className="overflow-hidden rounded-[24px] border border-secondary/5 bg-backgroundSoft"
        style={{ height }}
      >
        <LinearGradient
          colors={[theme.colors.surfaceStrong, theme.colors.backgroundSoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: compact ? 18 : 22 }}
        >
          <Image
            source={{ uri: business.logoUrl }}
            style={{ width: '72%', height: '72%' }}
            resizeMode="contain"
          />
        </LinearGradient>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[accent.colors[0], accent.colors[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="items-center justify-center overflow-hidden rounded-[24px]"
      style={{ height }}
    >
      <View className="h-16 w-16 items-center justify-center rounded-full bg-white/18">
        <Text className="text-2xl font-bold text-white">
          {buildInitials(business.fullName) || 'P'}
        </Text>
      </View>
      <Text className="mt-3 text-xs font-semibold uppercase tracking-[2px] text-white/78">
        {categoryName}
      </Text>
    </LinearGradient>
  );
}

function CategoryShortcut({
  category,
  onPress,
}: {
  category: ServiceCategoryOption;
  onPress: () => void;
}) {
  const accent = getCategoryAccent(category.name);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={{ width: 78, alignItems: 'center' }}
    >
      <View
        className="h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full border border-secondary/6"
        style={{ backgroundColor: theme.colors.surfaceStrong }}
      >
        {category.imageUrl ? (
          <Image
            source={{ uri: category.imageUrl }}
            style={{ width: 42, height: 42, borderRadius: 21 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.backgroundSoft }}
          >
            <Ionicons name={accent.icon} size={22} color={theme.colors.primaryStrong} />
          </View>
        )}
      </View>
      <Text className="mt-2 text-center text-xs font-semibold text-secondary" numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

function MoreShortcut({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={{ width: 78, alignItems: 'center' }}
    >
      <View
        className="h-[68px] w-[68px] items-center justify-center rounded-full border border-dashed border-primary/20"
        style={{ backgroundColor: theme.colors.surfaceStrong }}
      >
        <Ionicons name="add" size={24} color={theme.colors.primaryStrong} />
      </View>
      <Text className="mt-2 text-center text-xs font-semibold text-secondary">Mas</Text>
    </TouchableOpacity>
  );
}

function FeaturedBusinessCard({
  business,
  isFavorite,
  onPress,
  onToggleFavorite,
}: {
  business: PublicProfessionalSummary;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const ratingLabel = formatRating(business.rating);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      className="w-[285px] overflow-hidden rounded-[28px] border border-secondary/6 bg-white"
      style={theme.shadow.card}
    >
      <View className="p-4">
        <View>
          <BusinessVisual business={business} height={168} />
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-white"
            style={theme.shadow.card}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? theme.colors.primary : theme.colors.secondary}
            />
          </TouchableOpacity>
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          {ratingLabel ? (
            <View className="flex-row items-center rounded-full bg-primary/10 px-3 py-1.5">
              <Ionicons name="star" size={14} color={theme.colors.primaryStrong} />
              <Text className="ml-1 text-xs font-semibold text-primary">
                {ratingLabel}
                {typeof business.reviewsCount === 'number' ? ` (${business.reviewsCount})` : ''}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <StatusPill label="Disponible hoy" tone="success" />
        </View>

        <Text className="mt-4 text-lg font-bold text-secondary" numberOfLines={2}>
          {business.fullName}
        </Text>
        <Text className="mt-1 text-sm font-medium text-muted" numberOfLines={1}>
          {getBusinessCategory(business)}
        </Text>

        <View className="mt-3 flex-row items-center">
          <Ionicons name="location-outline" size={14} color={theme.colors.primaryStrong} />
          <Text className="ml-1 flex-1 text-sm text-muted" numberOfLines={1}>
            {business.location || 'Ubicacion a confirmar'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CompactBusinessCard({
  business,
  badge,
  detail,
  isFavorite,
  onPress,
  onToggleFavorite,
}: {
  business: PublicProfessionalSummary;
  badge?: string;
  detail?: string | null;
  isFavorite?: boolean;
  onPress: () => void;
  onToggleFavorite?: (() => void) | undefined;
}) {
  const ratingLabel = formatRating(business.rating);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      className="w-[252px] overflow-hidden rounded-[26px] border border-secondary/6 bg-white"
      style={theme.shadow.card}
    >
      <View className="p-4">
        <BusinessVisual business={business} height={120} compact />

        <View className="mt-4 flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-base font-bold text-secondary" numberOfLines={2}>
              {business.fullName}
            </Text>
            <Text className="mt-1 text-sm text-muted" numberOfLines={1}>
              {detail || business.location || getBusinessCategory(business)}
            </Text>
          </View>

          {onToggleFavorite ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
              className="h-9 w-9 items-center justify-center rounded-full bg-primary/10"
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={16}
                color={isFavorite ? theme.colors.primary : theme.colors.secondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          {badge ? <StatusPill label={badge} tone="primary" /> : <View />}
          {ratingLabel ? (
            <View className="flex-row items-center">
              <Ionicons name="star" size={13} color={theme.colors.primaryStrong} />
              <Text className="ml-1 text-xs font-semibold text-primary">{ratingLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { clientProfile, isAuthenticated } = useClientSession();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<PublicProfessionalSummary[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [bookings, setBookings] = useState<ClientDashboardBooking[]>([]);
  const { location, hasCoordinates, refreshLocation } = useUserLocation();

  const load = useCallback(async (options?: { showLoader?: boolean }) => {
    const showLoader = options?.showLoader ?? true;
    if (showLoader) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const [professionals, categoryItems, favorites, bookingItems] = await Promise.all([
        listPublicProfessionals(),
        listCategories().catch(() => []),
        getFavoriteProfessionalSlugs().catch(() => []),
        isAuthenticated ? getClientBookings().catch(() => []) : Promise.resolve([]),
      ]);

      setBusinesses(professionals);
      setCategories(categoryItems);
      setFavoriteSlugs(favorites);
      setBookings(bookingItems);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'No pudimos cargar el inicio.'));
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

  useEffect(() => {
    const unsubscribe = subscribeFavoriteProfessionalSlugs((next) => {
      setFavoriteSlugs(next);
    });
    return unsubscribe;
  }, []);

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

  const favoriteSet = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs]);
  const firstName = getDisplayName(clientProfile?.fullName) || null;
  const greeting = firstName ? `Hola, ${firstName} 👋` : 'Hola 👋';
  const tabBarBottomOffset =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom, 10)
      : Platform.OS === 'web'
        ? 10
        : Math.max(insets.bottom, 12);
  const contentBottomPadding = (Platform.OS === 'ios' ? 60 : 58) + 10 + tabBarBottomOffset + 28;

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)),
    [categories],
  );
  const visibleCategories = useMemo(
    () => sortedCategories.slice(0, MAX_CATEGORY_ITEMS),
    [sortedCategories],
  );

  const featuredBusinesses = useMemo(() => {
    const items = [...businesses];
    items.sort((a, b) => {
      const ratingDiff = (b.rating ?? -1) - (a.rating ?? -1);
      if (ratingDiff !== 0) return ratingDiff;
      const reviewsDiff = (b.reviewsCount ?? -1) - (a.reviewsCount ?? -1);
      if (reviewsDiff !== 0) return reviewsDiff;
      return 0;
    });
    return items.slice(0, MAX_FEATURED_ITEMS);
  }, [businesses]);

  const favoritesBusinesses = useMemo(() => {
    const bySlug = new Map(businesses.map((business) => [business.slug, business] as const));
    return favoriteSlugs
      .map((slug) => bySlug.get(slug))
      .filter((business): business is PublicProfessionalSummary => Boolean(business))
      .slice(0, MAX_FAVORITES_ITEMS);
  }, [businesses, favoriteSlugs]);

  const personalizedBusinesses = useMemo<PersonalizedRailItem[]>(() => {
    const bySlug = new Map(businesses.map((business) => [business.slug, business] as const));
    const candidateBookings = [...bookings]
      .filter((booking) => Boolean(booking.professionalSlug))
      .sort(sortByDateDesc);
    const completed = candidateBookings.filter((booking) => booking.status === 'COMPLETED');
    const source = completed.length > 0 ? completed : candidateBookings;
    const seen = new Set<string>();
    const items: PersonalizedRailItem[] = [];

    for (const booking of source) {
      const slug = booking.professionalSlug?.trim();
      if (!slug || seen.has(slug)) continue;
      const business = bySlug.get(slug);
      if (!business) continue;
      seen.add(slug);
      items.push({
        business,
        service: booking.service || null,
      });
      if (items.length >= MAX_PERSONALIZED_ITEMS) break;
    }

    if (items.length > 0) return items;

    return businesses.slice(0, MAX_PERSONALIZED_ITEMS).map((business) => ({
      business,
      service: null,
    }));
  }, [bookings, businesses]);

  const newBusinesses = useMemo(
    () => businesses.slice(0, MAX_NEW_ITEMS),
    [businesses],
  );

  const handleToggleFavorite = useCallback(async (slug: string) => {
    const next = await toggleFavoriteProfessionalSlug(slug);
    setFavoriteSlugs(next);
  }, []);

  const openExplore = useCallback(() => {
    router.push('/(tabs)/explore');
  }, []);

  const openFeaturedExplore = useCallback(() => {
    if (
      hasCoordinates
      && typeof location.latitude === 'number'
      && typeof location.longitude === 'number'
    ) {
      router.push({
        pathname: '/(tabs)/explore',
        params: {
          lat: String(location.latitude),
          lng: String(location.longitude),
          radiusKm: '10',
          sort: 'DISTANCE',
        },
      });
      return;
    }

    router.push('/(tabs)/explore');
  }, [hasCoordinates, location.latitude, location.longitude]);

  return (
    <AppScreen
      scroll
      refreshing={isRefreshing}
      onRefresh={() => {
        void handleRefresh();
      }}
      contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: contentBottomPadding }}
    >
      <View className="px-5 pt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[26px] font-bold text-secondary">{greeting}</Text>
            <Text className="mt-1 text-base text-muted">¿Que queres hacer hoy?</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/(tabs)/notifications')}
            className="h-12 w-12 items-center justify-center rounded-full border border-secondary/6 bg-white"
            style={theme.shadow.card}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.colors.secondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openExplore}
          className="mt-5 rounded-[24px] border border-secondary/6 bg-white px-4 py-4"
          style={theme.shadow.card}
        >
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-backgroundSoft">
              <Ionicons name="search" size={20} color={theme.colors.inkFaint} />
            </View>
            <Text className="ml-3 flex-1 text-base text-muted">
              Buscar servicios o negocios
            </Text>
          </View>
        </TouchableOpacity>

        {errorMessage ? (
          <MessageCard message={errorMessage} tone="danger" style={{ marginTop: 16 }} />
        ) : null}
      </View>

      <View className="mt-8 px-5">
        <HomeRailHeader
          title="Categorias"
          actionLabel="Ver todas"
          onActionPress={openExplore}
        />
      </View>

      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        >
          {visibleCategories.map((category) => (
            <CategoryShortcut
              key={category.id}
              category={category}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/explore',
                  params: {
                    category: category.slug,
                    categoryLabel: category.name,
                  },
                })
              }
            />
          ))}

          <MoreShortcut onPress={openExplore} />
        </ScrollView>

        {!isLoading && visibleCategories.length === 0 ? (
          <View className="mt-4 px-5">
            <SectionCard>
              <EmptyState
                title="Sin categorias por ahora"
                description="Todavia no hay categorias visibles para explorar desde el inicio."
                icon="grid-outline"
              />
            </SectionCard>
          </View>
        ) : null}
      </View>

      <View className="mt-10 px-5">
        <HomeRailHeader
          title="Mejor rating y cerca de vos"
          subtitle={hasCoordinates ? location.label || 'Tu zona actual' : 'Locales destacados del marketplace'}
          actionLabel="Ver todo"
          onActionPress={openFeaturedExplore}
        />
      </View>

      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        >
          {isLoading ? (
            <View className="w-[285px] items-center justify-center rounded-[28px] border border-secondary/6 bg-white py-12">
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null}

          {!isLoading && featuredBusinesses.map((business) => (
            <FeaturedBusinessCard
              key={business.slug}
              business={business}
              isFavorite={favoriteSet.has(business.slug)}
              onPress={() => router.push(`/profesional/${business.slug}`)}
              onToggleFavorite={() => {
                void handleToggleFavorite(business.slug);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <View className="mt-10 px-5">
        <HomeRailHeader
          title="Para vos"
          subtitle="Locales con servicios que ya usaste"
          actionLabel="Ver todo"
          onActionPress={openExplore}
        />
      </View>

      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        >
          {personalizedBusinesses.map(({ business, service }) => (
            <CompactBusinessCard
              key={`personalized-${business.slug}`}
              business={business}
              badge={service || 'Para volver'}
              detail={business.location || getBusinessCategory(business)}
              isFavorite={favoriteSet.has(business.slug)}
              onPress={() => router.push(`/profesional/${business.slug}`)}
              onToggleFavorite={() => {
                void handleToggleFavorite(business.slug);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <View className="mt-10 px-5">
        <HomeRailHeader
          title="Tus favoritos"
          actionLabel="Ver todos"
          onActionPress={() => router.push('/(tabs)/favorites')}
        />
      </View>

      <View className="mt-4">
        {isLoading ? (
          <View className="px-5">
            <SectionCard>
              <View className="items-center py-3">
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            </SectionCard>
          </View>
        ) : favoritesBusinesses.length === 0 ? (
          <View className="px-5">
            <SectionCard>
              <View className="flex-row items-center justify-between" style={{ gap: 14 }}>
                <View className="flex-1">
                  <Text className="text-base font-bold text-secondary">
                    Todavia no guardaste favoritos
                  </Text>
                  <Text className="mt-1 text-sm text-muted">
                    Explora perfiles y guarda tus locales preferidos para volver mas rapido.
                  </Text>
                </View>
                <ActionButton label="Explorar" onPress={openExplore} />
              </View>
            </SectionCard>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          >
            {favoritesBusinesses.map((business) => (
              <CompactBusinessCard
                key={`favorite-${business.slug}`}
                business={business}
                badge="Favorito"
                detail={business.location || getBusinessCategory(business)}
                isFavorite
                onPress={() => router.push(`/profesional/${business.slug}`)}
                onToggleFavorite={() => {
                  void handleToggleFavorite(business.slug);
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <View className="mt-10 px-5">
        <HomeRailHeader
          title="Nuevos en la app"
          actionLabel="Ver todo"
          onActionPress={openExplore}
        />
      </View>

      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        >
          {newBusinesses.map((business) => (
            <CompactBusinessCard
              key={`new-${business.slug}`}
              business={business}
              badge="NUEVO"
              detail={business.headline || business.location || getBusinessCategory(business)}
              isFavorite={favoriteSet.has(business.slug)}
              onPress={() => router.push(`/profesional/${business.slug}`)}
              onToggleFavorite={() => {
                void handleToggleFavorite(business.slug);
              }}
            />
          ))}
        </ScrollView>
      </View>
    </AppScreen>
  );
}
