import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
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
} from '../../../components/ui/MobileSurface';

const MAX_FEATURED_ITEMS = 8;
const MAX_PERSONALIZED_ITEMS = 8;
const MAX_FAVORITES_ITEMS = 8;
const MAX_NEW_ITEMS = 8;

const softBorderColor = 'rgba(15, 23, 42, 0.045)';

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

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;

  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return hex;

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getCategoryTone = (value: string) => {
  const normalized = value.toLowerCase();

  if (normalized.includes('barb')) {
    return { color: theme.colors.warning, backgroundColor: theme.colors.warningSoft };
  }
  if (normalized.includes('u') || normalized.includes('mani')) {
    return { color: theme.colors.premiumStrong, backgroundColor: theme.colors.premiumSoft };
  }
  if (normalized.includes('cosme') || normalized.includes('facial') || normalized.includes('pest')) {
    return { color: theme.colors.accentStrong, backgroundColor: theme.colors.accentSoft };
  }
  if (normalized.includes('spa') || normalized.includes('pelu') || normalized.includes('cabello')) {
    return { color: theme.colors.primaryStrong, backgroundColor: theme.colors.primarySoft };
  }

  return { color: theme.colors.accentStrong, backgroundColor: theme.colors.accentSoft };
};

function AvailableTodayPill() {
  return (
    <View
      className="flex-row items-center rounded-full px-3 py-1.5"
      style={{ backgroundColor: theme.colors.primarySoft }}
    >
      <Ionicons name="checkmark-circle" size={13} color={theme.colors.primaryStrong} />
      <Text className="ml-1 text-xs font-semibold" style={{ color: theme.colors.primaryStrong }}>
        Disponible hoy
      </Text>
    </View>
  );
}

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
        <View className="mb-2 h-1.5 w-10 rounded-full" style={styles.sectionAccent} />
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
  const logoWash = hexToRgba(accent.colors[0], compact ? 0.11 : 0.14);
  const logoGlow = hexToRgba(accent.colors[1], compact ? 0.12 : 0.16);

  if (business.logoUrl) {
    return (
      <View
        className="overflow-hidden rounded-[24px] bg-backgroundSoft"
        style={{ height }}
      >
        <LinearGradient
          colors={[logoWash, theme.colors.surfaceStrong, logoGlow] as const}
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
      <Text
        className="mt-3 text-xs font-semibold uppercase tracking-[2px]"
        style={{ color: 'rgba(255, 255, 255, 0.78)' }}
      >
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
  const categoryTone = getCategoryTone(category.name);
  const iconWash = hexToRgba(accent.colors[1], 0.14);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={{ width: 78, alignItems: 'center' }}
    >
      <View
        className="h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full"
        style={[
          styles.categoryCircle,
          { backgroundColor: categoryTone.backgroundColor, shadowColor: categoryTone.color },
        ]}
      >
        {category.imageUrl ? (
          <Image
            source={{ uri: category.imageUrl }}
            style={{ width: 46, height: 46, borderRadius: 23 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: iconWash }}
          >
            <Ionicons name={accent.icon} size={22} color={categoryTone.color} />
          </View>
        )}
      </View>
      <Text className="mt-2 text-center text-xs font-semibold text-secondary" numberOfLines={2}>
        {category.name}
      </Text>
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
  const categoryName = getBusinessCategory(business);
  const categoryTone = getCategoryTone(categoryName);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      className="w-[285px] rounded-[28px] bg-white"
      style={styles.floatingCard}
    >
      <View className="p-3.5">
        <View>
          <BusinessVisual business={business} height={176} />
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-white"
            style={styles.iconButtonShadow}
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
            <View
              className="flex-row items-center rounded-full px-3 py-1.5"
              style={{ backgroundColor: categoryTone.backgroundColor }}
            >
              <Ionicons name="star" size={14} color={categoryTone.color} />
              <Text className="ml-1 text-xs font-semibold" style={{ color: categoryTone.color }}>
                {ratingLabel}
                {typeof business.reviewsCount === 'number' ? ` (${business.reviewsCount})` : ''}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <AvailableTodayPill />
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
  detail,
  eyebrow,
  isFavorite,
  onPress,
  onToggleFavorite,
}: {
  business: PublicProfessionalSummary;
  detail?: string | null;
  eyebrow?: string;
  isFavorite?: boolean;
  onPress: () => void;
  onToggleFavorite?: (() => void) | undefined;
}) {
  const ratingLabel = formatRating(business.rating);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      className="w-[252px] rounded-[26px] bg-white"
      style={styles.floatingCompactCard}
    >
      <View className="p-3.5">
        <View>
          <BusinessVisual business={business} height={126} compact />

          {onToggleFavorite ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
              className="absolute right-2.5 top-2.5 h-9 w-9 items-center justify-center rounded-full"
              style={[
                styles.compactHeartButton,
                { backgroundColor: isFavorite ? theme.colors.primarySoft : theme.colors.white },
              ]}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={16}
                color={isFavorite ? theme.colors.primary : theme.colors.secondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text className="mt-4 text-base font-bold text-secondary" numberOfLines={2}>
          {business.fullName}
        </Text>
        <Text className="mt-1 text-sm text-muted" numberOfLines={1}>
          {detail || business.location || getBusinessCategory(business)}
        </Text>

        <View className="mt-3 flex-row items-center justify-between">
          {ratingLabel ? (
            <View className="flex-row items-center rounded-full px-2.5 py-1" style={styles.compactRatingPill}>
              <Ionicons name="star" size={13} color={theme.colors.primaryStrong} />
              <Text className="ml-1 text-xs font-semibold text-primary">{ratingLabel}</Text>
            </View>
          ) : (
            <View />
          )}
          {eyebrow ? (
            <Text className="text-[11px] font-semibold uppercase tracking-[1.2px]" style={styles.subtleEyebrow}>
              {eyebrow}
            </Text>
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
        : Math.max(insets.bottom, 30);
  const contentBottomPadding = (Platform.OS === 'ios' ? 60 : 58) + 10 + tabBarBottomOffset + 28;

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)),
    [categories],
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

  const personalizedFromHistory = useMemo<PersonalizedRailItem[]>(() => {
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

    return items;
  }, [bookings, businesses]);

  const hasHistoryRecommendations = personalizedFromHistory.length > 0;
  const discoveryBusinesses = useMemo(
    () => businesses.slice(0, MAX_PERSONALIZED_ITEMS),
    [businesses],
  );
  const recommendationItems = useMemo<PersonalizedRailItem[]>(() => {
    if (hasHistoryRecommendations) return personalizedFromHistory;
    return discoveryBusinesses.map((business) => ({
      business,
      service: null,
    }));
  }, [discoveryBusinesses, hasHistoryRecommendations, personalizedFromHistory]);
  const recommendationHeader = hasHistoryRecommendations
    ? {
        title: 'Para vos',
        subtitle: 'Locales con servicios que ya usaste',
      }
    : isAuthenticated && hasCoordinates
      ? {
          title: 'Cerca de vos',
          subtitle: 'Locales destacados en tu zona',
        }
      : {
          title: 'Descubrí lugares',
          subtitle: 'Locales recomendados para empezar',
        };

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
            className="h-12 w-12 items-center justify-center rounded-full bg-white"
            style={styles.floatingButton}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.colors.secondary} />
            <View className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full" style={styles.notificationAccentDot} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openExplore}
          className="mt-5 rounded-[24px] bg-white px-4 py-4"
          style={styles.searchSurface}
        >
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-full" style={styles.searchIconBubble}>
              <Ionicons name="search" size={20} color={theme.colors.primaryStrong} />
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
        />
      </View>

      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6, gap: 14 }}
        >
          {sortedCategories.map((category) => (
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
        </ScrollView>

        {!isLoading && sortedCategories.length === 0 ? (
          <View className="mt-4 px-5">
            <SectionCard style={styles.softSectionCard}>
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 14, gap: 14 }}
        >
          {isLoading ? (
            <View
              className="w-[285px] items-center justify-center rounded-[28px] bg-white py-12"
              style={styles.floatingCard}
            >
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
          title={recommendationHeader.title}
          subtitle={recommendationHeader.subtitle}
          actionLabel="Ver todo"
          onActionPress={openExplore}
        />
      </View>

      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 14, gap: 14 }}
        >
          {recommendationItems.map(({ business, service }) => (
            <CompactBusinessCard
              key={`recommendation-${business.slug}`}
              business={business}
              detail={service || business.location || getBusinessCategory(business)}
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
            <SectionCard style={styles.softSectionCard}>
              <View className="items-center py-3">
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            </SectionCard>
          </View>
        ) : favoritesBusinesses.length === 0 ? (
          <View className="px-5">
            <SectionCard style={styles.softSectionCard}>
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
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 14, gap: 14 }}
          >
            {favoritesBusinesses.map((business) => (
              <CompactBusinessCard
                key={`favorite-${business.slug}`}
                business={business}
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 14, gap: 14 }}
        >
          {newBusinesses.map((business) => (
            <CompactBusinessCard
              key={`new-${business.slug}`}
              business={business}
              eyebrow="Nuevo"
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

const styles = StyleSheet.create({
  sectionAccent: {
    backgroundColor: theme.colors.primaryLight,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  categoryCircle: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.025,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 0,
  },
  floatingCard: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.09,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  floatingCompactCard: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.075,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  compactRatingPill: {
    backgroundColor: theme.colors.primarySoft,
  },
  subtleEyebrow: {
    color: theme.colors.accentStrong,
  },
  iconButtonShadow: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  compactHeartButton: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  floatingButton: {
    backgroundColor: theme.colors.surfaceStrong,
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.075,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  notificationAccentDot: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: theme.colors.surfaceStrong,
  },
  searchIconBubble: {
    backgroundColor: theme.colors.primarySoft,
  },
  searchSurface: {
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.055,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 },
    elevation: 2,
  },
  softSectionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: softBorderColor,
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.045,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
});
