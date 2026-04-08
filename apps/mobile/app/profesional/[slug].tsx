import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getPublicProfessionalBySlug,
  getPublicSlots,
  type PublicProfessionalPage,
  type PublicProfessionalService,
} from '../../src/services/publicBookings';
import {
  getFavoriteProfessionalSlugs,
  subscribeFavoriteProfessionalSlugs,
  toggleFavoriteProfessionalSlug,
} from '../../src/services/clientFeatures';
import { useAuthSession } from '../../src/context/auth/AuthSessionContext';
import type { WorkDayKey } from '../../src/types/professional';
import {
  buildMapboxStaticMapUrl,
  hasMobileMapboxToken,
  mapboxForwardGeocode,
} from '../../src/services/mapbox';
import PublicProfileMapCard from '../../src/components/map/PublicProfileMapCard';

type QuickSlotGroup = { label: 'Hoy' | 'Manana'; dateKey: string; slots: string[] };

const dayLabels: Record<WorkDayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miercoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sabado',
  sun: 'Domingo',
};

const buildDateKey = (offset = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
};

const formatDateLong = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });
};

const formatDateShort = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
};

const formatDuration = (value?: string) => {
  if (!value) return 'Duracion a definir';
  const trimmed = value.trim();
  if (!trimmed) return 'Duracion a definir';
  if (/[^0-9]/.test(trimmed)) return trimmed;
  const minutes = Number(trimmed);
  if (!Number.isFinite(minutes)) return trimmed;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  return remaining === 0 ? `${hours} h` : `${hours} h ${remaining} min`;
};

const formatPrice = (value?: string) => {
  if (!value?.trim()) return 'Consultar';
  return value.includes('$') ? value : `$${value}`;
};

const formatPaymentType = (value?: string) => {
  const normalized = (value || '').trim().toUpperCase();
  if (normalized === 'DEPOSIT') return 'Senia online';
  if (normalized === 'FULL_PREPAY' || normalized === 'FULL') return 'Pago total online';
  return 'Pago en el lugar';
};

const resolveServiceCategoryLabel = (service?: PublicProfessionalService | null, fallback?: string | null) => {
  return service?.categoryName?.trim() || fallback?.trim() || '';
};

const resolveLocationLabel = (data: PublicProfessionalPage | null) => {
  if (!data) return '';
  return [data.fullAddress?.trim(), data.city?.trim(), data.country?.trim()].filter(Boolean).join(', ')
    || data.location?.trim()
    || '';
};

const resolveSocialHref = (value: string | null | undefined, platform: 'instagram' | 'facebook' | 'tiktok' | 'website' | 'whatsapp') => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (platform === 'website') return `https://${trimmed.replace(/^\/+/, '')}`;
  if (platform === 'whatsapp') {
    const digits = trimmed.replace(/[^\d]/g, '');
    return digits.length >= 8 ? `https://wa.me/${digits}` : '';
  }
  const handle = trimmed.replace(/^@/, '');
  if (!handle) return '';
  if (platform === 'instagram') return `https://instagram.com/${handle}`;
  if (platform === 'facebook') return `https://facebook.com/${handle}`;
  return `https://tiktok.com/@${handle}`;
};

const openExternalUrl = async (value: string) => {
  if (!value) return;
  try {
    await Linking.openURL(value);
  } catch {}
};

const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildMapsUrl = ({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) => {
  const encodedLabel = encodeURIComponent(label || 'Plura');
  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
};

export default function ProfesionalDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { role, profile } = useAuthSession();
  const [data, setData] = useState<PublicProfessionalPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quickSlotGroups, setQuickSlotGroups] = useState<QuickSlotGroup[]>([]);
  const [isLoadingQuickSlots, setIsLoadingQuickSlots] = useState(false);
  const [fallbackCoordinates, setFallbackCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isResolvingMap, setIsResolvingMap] = useState(false);

  const upcomingDates = useMemo(() => Array.from({ length: 7 }, (_, index) => buildDateKey(index)), []);
  const isOwnProfessionalPage = role === 'professional' && Boolean(profile?.slug && profile.slug === slug);
  const selectedService = useMemo(
    () => data?.services.find((service) => service.id === selectedServiceId) ?? null,
    [data?.services, selectedServiceId],
  );
  const locationLabel = useMemo(() => resolveLocationLabel(data), [data]);
  const mapCoordinates = useMemo(() => {
    const latitude = parseOptionalNumber(data?.latitude ?? data?.lat);
    const longitude = parseOptionalNumber(data?.longitude ?? data?.lng);
    if (latitude !== null && longitude !== null) {
      return { latitude, longitude };
    }
    return fallbackCoordinates;
  }, [data?.lat, data?.latitude, data?.lng, data?.longitude, fallbackCoordinates]);
  const mapImageUrl = useMemo(
    () =>
      mapCoordinates
        ? buildMapboxStaticMapUrl({
            latitude: mapCoordinates.latitude,
            longitude: mapCoordinates.longitude,
          })
        : null,
    [mapCoordinates],
  );
  const phoneValue = data?.phoneNumber?.trim() || data?.phone?.trim() || '';
  const emailValue = data?.email?.trim() || '';

  const scheduleSummary = useMemo(
    () => (data?.schedule?.days ?? [])
      .filter((day) => day.enabled && !day.paused && (day.ranges ?? []).length > 0)
      .map((day) => ({
        label: dayLabels[day.day],
        ranges: (day.ranges ?? []).map((range) => `${range.start} - ${range.end}`).join(' | '),
      })),
    [data?.schedule?.days],
  );

  useEffect(() => {
    const load = async () => {
      if (!slug) {
        setError('No encontramos este profesional.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPublicProfessionalBySlug(slug);
        setData(response);
        setSelectedServiceId(response.services[0]?.id ?? null);
        setSelectedDate(upcomingDates[0] ?? null);
      } catch {
        setError('No encontramos este profesional.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [slug, upcomingDates]);

  useEffect(() => {
    const loadFavorite = async () => {
      if (!slug || role === 'professional') return;
      const items = await getFavoriteProfessionalSlugs();
      setIsFavorite(items.includes(slug));
    };
    void loadFavorite();
  }, [role, slug]);

  useEffect(() => {
    if (!slug || role === 'professional') return undefined;
    return subscribeFavoriteProfessionalSlugs((next) => setIsFavorite(next.includes(slug)));
  }, [role, slug]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!slug || !selectedServiceId || !selectedDate) return;
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        setSlots(await getPublicSlots(slug, selectedDate, selectedServiceId));
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    void loadSlots();
  }, [selectedDate, selectedServiceId, slug]);

  useEffect(() => {
    const loadQuickSlots = async () => {
      if (!slug || !selectedServiceId || isOwnProfessionalPage) {
        setQuickSlotGroups([]);
        return;
      }
      setIsLoadingQuickSlots(true);
      const todayKey = buildDateKey(0);
      const tomorrowKey = buildDateKey(1);
      try {
        const [todaySlots, tomorrowSlots] = await Promise.all([
          getPublicSlots(slug, todayKey, selectedServiceId).catch(() => []),
          getPublicSlots(slug, tomorrowKey, selectedServiceId).catch(() => []),
        ]);
        setQuickSlotGroups([
          { label: 'Hoy', dateKey: todayKey, slots: todaySlots.slice(0, 4) },
          { label: 'Manana', dateKey: tomorrowKey, slots: tomorrowSlots.slice(0, 4) },
        ]);
      } finally {
        setIsLoadingQuickSlots(false);
      }
    };
    void loadQuickSlots();
  }, [isOwnProfessionalPage, selectedServiceId, slug]);

  useEffect(() => {
    const existingLatitude = parseOptionalNumber(data?.latitude ?? data?.lat);
    const existingLongitude = parseOptionalNumber(data?.longitude ?? data?.lng);

    if (existingLatitude !== null && existingLongitude !== null) {
      setFallbackCoordinates(null);
      setIsResolvingMap(false);
      return;
    }

    if (!locationLabel || !hasMobileMapboxToken) {
      setFallbackCoordinates(null);
      setIsResolvingMap(false);
      return;
    }

    const controller = new AbortController();
    setIsResolvingMap(true);

    mapboxForwardGeocode(locationLabel, controller.signal)
      .then((result) => {
        if (!result) {
          setFallbackCoordinates(null);
          return;
        }
        setFallbackCoordinates({
          latitude: result.latitude,
          longitude: result.longitude,
        });
      })
      .catch(() => {
        setFallbackCoordinates(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsResolvingMap(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [data?.lat, data?.latitude, data?.lng, data?.longitude, locationLabel]);

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#0A7A43" /></View>;
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text className="mt-4 text-center text-lg font-bold text-secondary">{error || 'Ocurrio un error'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 rounded-full bg-secondary px-6 py-3">
          <Text className="font-bold text-white">Volver atras</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const initials = (data.fullName || data.name || 'PR').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const socialLinks = [
    { key: 'instagram', label: 'Instagram', icon: 'logo-instagram' as const, href: resolveSocialHref(data.instagram, 'instagram') },
    { key: 'facebook', label: 'Facebook', icon: 'logo-facebook' as const, href: resolveSocialHref(data.facebook, 'facebook') },
    { key: 'tiktok', label: 'TikTok', icon: 'musical-notes-outline' as const, href: resolveSocialHref(data.tiktok, 'tiktok') },
    { key: 'website', label: 'Sitio web', icon: 'globe-outline' as const, href: resolveSocialHref(data.website, 'website') },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' as const, href: resolveSocialHref(data.whatsapp || phoneValue, 'whatsapp') },
  ].filter((item) => Boolean(item.href));

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <LinearGradient colors={['#0F172A', '#36C8F4', '#0A7A43']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="px-6 pb-14 pt-12">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            {role !== 'professional' ? (
              <TouchableOpacity
                onPress={async () => {
                  if (!slug) return;
                  const next = await toggleFavoriteProfessionalSlug(slug);
                  setIsFavorite(next.includes(slug));
                }}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View className="rounded-full bg-white/15 px-3 py-2"><Text className="text-[11px] font-semibold uppercase tracking-[1px] text-white/85">Vista publica</Text></View>
            )}
          </View>

          <View className="mt-8 flex-row items-center">
            <View className="h-20 w-20 items-center justify-center rounded-[26px] border border-white/15 bg-white/10">
              <Text className="text-2xl font-bold text-white">{initials}</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">{data.rubro || 'Profesional'}</Text>
              <Text className="mt-1 text-3xl font-bold text-white">{data.fullName}</Text>
              {data.headline ? <Text className="mt-2 text-sm leading-5 text-white/80">{data.headline}</Text> : null}
            </View>
          </View>

          <View className="mt-6 flex-row flex-wrap" style={{ gap: 10 }}>
            {locationLabel ? <View className="rounded-full bg-white/12 px-4 py-2"><Text className="text-xs font-semibold text-white">{locationLabel}</Text></View> : null}
            <View className="rounded-full bg-white/12 px-4 py-2"><Text className="text-xs font-semibold text-white">{data.services.length} servicio{data.services.length === 1 ? '' : 's'}</Text></View>
            {scheduleSummary.length > 0 ? <View className="rounded-full bg-white/12 px-4 py-2"><Text className="text-xs font-semibold text-white">Agenda activa</Text></View> : null}
          </View>
        </LinearGradient>

        <View className="px-6 pb-12">
          {isOwnProfessionalPage ? (
            <View className="-mt-8 rounded-[24px] border border-primary/15 bg-primary/5 p-5">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-primary">Tu pagina publica</Text>
              <Text className="mt-2 text-base font-bold text-secondary">Este es el perfil que ven tus clientes desde mobile.</Text>
              <View className="mt-4 flex-row" style={{ gap: 10 }}>
                <TouchableOpacity onPress={() => router.push('/dashboard/business-profile')} className="flex-1 rounded-full bg-secondary px-4 py-3"><Text className="text-center font-bold text-white">Editar negocio</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/dashboard/services')} className="flex-1 rounded-full border border-secondary/10 bg-white px-4 py-3"><Text className="text-center font-bold text-secondary">Servicios</Text></TouchableOpacity>
              </View>
            </View>
          ) : null}

          {selectedService ? (
            <View className="mt-6 rounded-[28px] border border-secondary/5 bg-white p-6 shadow-sm">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Servicio seleccionado</Text>
              <Text className="mt-2 text-2xl font-bold text-secondary">{selectedService.name}</Text>
              {selectedService.description ? <Text className="mt-2 text-sm leading-6 text-gray-500">{selectedService.description}</Text> : null}
              <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
                <View className="rounded-full bg-background px-4 py-2"><Text className="text-xs font-semibold text-secondary">{formatDuration(selectedService.duration)}</Text></View>
                <View className="rounded-full bg-background px-4 py-2"><Text className="text-xs font-semibold text-primary">{formatPrice(selectedService.price)}</Text></View>
                <View className="rounded-full bg-background px-4 py-2"><Text className="text-xs font-semibold text-secondary">{formatPaymentType(selectedService.paymentType)}</Text></View>
              </View>
            </View>
          ) : null}

          <View className="mt-6 rounded-[28px] border border-secondary/5 bg-white p-6 shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Servicios</Text>
            <Text className="mt-2 text-2xl font-bold text-secondary">Elige como reservar</Text>
            {data.services.length === 0 ? (
              <View className="mt-5 rounded-[20px] border border-dashed border-secondary/20 bg-background p-5"><Text className="text-center text-sm text-gray-500">Este perfil todavia no tiene servicios publicados.</Text></View>
            ) : (
              <View className="mt-5" style={{ gap: 12 }}>
                {data.services.map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <TouchableOpacity key={service.id} activeOpacity={0.9} onPress={() => setSelectedServiceId(service.id)} className={`rounded-[24px] border p-5 ${isSelected ? 'border-primary/25 bg-primary/5' : 'border-secondary/8 bg-background'}`}>
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-4">
                          <Text className="text-base font-bold text-secondary">{service.name}</Text>
                          {resolveServiceCategoryLabel(service, data.rubro) ? <Text className="mt-1 text-xs font-semibold uppercase tracking-[1px] text-gray-500">{resolveServiceCategoryLabel(service, data.rubro)}</Text> : null}
                          {service.description ? <Text className="mt-2 text-sm leading-5 text-gray-500">{service.description}</Text> : null}
                        </View>
                        <View className="items-end">
                          <Text className="text-base font-bold text-primary">{formatPrice(service.price)}</Text>
                          <Text className="mt-1 text-xs text-gray-500">{formatDuration(service.duration)}</Text>
                        </View>
                      </View>
                      <View className="mt-4 flex-row items-center justify-between">
                        <Text className="text-xs font-semibold text-secondary">{formatPaymentType(service.paymentType)}</Text>
                        <View className={`rounded-full px-3 py-1 ${isSelected ? 'bg-primary' : 'bg-secondary'}`}><Text className="text-xs font-bold text-white">{isSelected ? 'Seleccionado' : 'Elegir servicio'}</Text></View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {!isOwnProfessionalPage ? (
            <View className="mt-6 rounded-[28px] border border-secondary/5 bg-white p-6 shadow-sm">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Turnos rapidos</Text>
              <Text className="mt-2 text-2xl font-bold text-secondary">Primeros horarios disponibles</Text>
              {isLoadingQuickSlots ? (
                <View className="py-8 items-center"><ActivityIndicator color="#0A7A43" /></View>
              ) : quickSlotGroups.every((group) => group.slots.length === 0) ? (
                <Text className="mt-4 text-sm leading-6 text-gray-500">No hay horarios inmediatos para este servicio. Puedes revisar otros dias mas abajo.</Text>
              ) : (
                <View className="mt-5" style={{ gap: 14 }}>
                  {quickSlotGroups.map((group) => (
                    <View key={group.dateKey} className="rounded-[22px] bg-background p-4">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-secondary">{group.label}</Text>
                        <Text className="text-xs font-semibold text-gray-500">{formatDateLong(group.dateKey)}</Text>
                      </View>
                      <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                        {group.slots.length > 0 ? (
                          group.slots.map((slot) => (
                            <TouchableOpacity
                              key={`${group.dateKey}-${slot}`}
                              onPress={() => {
                                if (!slug || !selectedServiceId) return;
                                router.push({ pathname: '/reservar', params: { slug, serviceId: selectedServiceId, date: group.dateKey, time: slot } });
                              }}
                              className="rounded-full border border-secondary/10 bg-white px-4 py-2"
                            >
                              <Text className="text-xs font-bold text-secondary">{slot}</Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text className="text-sm text-gray-500">Sin turnos para este dia.</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          <View className="mt-6 rounded-[28px] border border-secondary/5 bg-white p-6 shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Elegir fecha</Text>
            <Text className="mt-2 text-2xl font-bold text-secondary">Reserva desde la agenda publica</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5" contentContainerStyle={{ gap: 10 }}>
              {upcomingDates.map((date) => {
                const isSelected = selectedDate === date;
                const title = date === buildDateKey(0) ? 'Hoy' : date === buildDateKey(1) ? 'Manana' : formatDateShort(date);
                return (
                  <TouchableOpacity
                    key={date}
                    onPress={() => setSelectedDate(date)}
                    className={`min-w-[88px] rounded-[20px] px-4 py-3 ${isSelected ? 'bg-secondary' : 'border border-secondary/10 bg-background'}`}
                  >
                    <Text className={`text-center text-xs font-bold uppercase tracking-[1px] ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{title}</Text>
                    <Text className={`mt-1 text-center text-sm font-bold ${isSelected ? 'text-white' : 'text-secondary'}`}>{formatDateShort(date)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View className="mt-5 rounded-[22px] bg-background p-4">
              {slotsLoading ? (
                <View className="py-6 items-center"><ActivityIndicator color="#0A7A43" /></View>
              ) : slots.length === 0 ? (
                <Text className="text-sm leading-6 text-gray-500">No hay horarios disponibles para la fecha seleccionada.</Text>
              ) : (
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        onPress={() => setSelectedSlot(slot)}
                        className={`rounded-full px-4 py-2 ${isSelected ? 'bg-primary' : 'border border-secondary/10 bg-white'}`}
                      >
                        <Text className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-secondary'}`}>{slot}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => {
                if (isOwnProfessionalPage) {
                  router.push('/dashboard/business-profile');
                  return;
                }
                if (!slug || !selectedServiceId || !selectedDate || !selectedSlot) return;
                router.push({ pathname: '/reservar', params: { slug, serviceId: selectedServiceId, date: selectedDate, time: selectedSlot } });
              }}
              disabled={isOwnProfessionalPage ? false : !selectedServiceId || !selectedDate || !selectedSlot}
              className={`mt-5 h-14 items-center justify-center rounded-full ${isOwnProfessionalPage || (selectedServiceId && selectedDate && selectedSlot) ? 'bg-secondary' : 'bg-gray-300'}`}
            >
              <Text className="text-base font-bold text-white">{isOwnProfessionalPage ? 'Editar tu negocio' : 'Continuar al checkout'}</Text>
            </TouchableOpacity>
          </View>

          {scheduleSummary.length > 0 ? (
            <View className="mt-6 rounded-[28px] border border-secondary/5 bg-white p-6 shadow-sm">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Horarios</Text>
              <Text className="mt-2 text-2xl font-bold text-secondary">Horarios de atencion</Text>
              <View className="mt-5" style={{ gap: 12 }}>
                {scheduleSummary.map((item) => (
                  <View key={`${item.label}-${item.ranges}`} className="flex-row items-center justify-between rounded-[18px] bg-background px-4 py-3">
                    <Text className="text-sm font-semibold text-secondary">{item.label}</Text>
                    <Text className="text-xs font-semibold text-primary">{item.ranges}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {data.about ? (
            <View className="mt-6 rounded-[28px] border border-secondary/5 bg-white p-6 shadow-sm">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Sobre</Text>
              <Text className="mt-2 text-2xl font-bold text-secondary">Sobre el profesional o local</Text>
              <Text className="mt-4 text-sm leading-7 text-gray-500">{data.about}</Text>
            </View>
          ) : null}

          {locationLabel ? (
            <View className="mt-6 rounded-[28px] border border-secondary/5 bg-white p-6 shadow-sm">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Ubicacion</Text>
              <Text className="mt-2 text-2xl font-bold text-secondary">Donde queda y como llegar</Text>
              <Text className="mt-2 text-sm leading-6 text-gray-500">
                Mapa y direccion del negocio para que puedas ubicarlo rapido desde la app.
              </Text>

              <View className="mt-5">
                <PublicProfileMapCard
                  title={data.fullName || data.name || 'Profesional'}
                  subtitle={locationLabel}
                  mapImageUrl={mapImageUrl}
                  isLoading={isResolvingMap}
                  onPress={() => {
                    if (!mapCoordinates) return;
                    void openExternalUrl(
                      buildMapsUrl({
                        latitude: mapCoordinates.latitude,
                        longitude: mapCoordinates.longitude,
                        label: data.fullName || data.name || locationLabel,
                      }),
                    );
                  }}
                  disabled={!mapCoordinates}
                  actionLabel="Ver ruta"
                  fallbackMessage={
                    hasMobileMapboxToken
                      ? 'Aun no tenemos coordenadas exactas para este perfil.'
                      : 'Falta configurar el token de Mapbox para mostrar el mapa.'
                  }
                />
              </View>

              <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
                <View className="rounded-full bg-background px-4 py-2">
                  <Text className="text-xs font-semibold text-secondary">
                    {mapCoordinates ? 'Mapa listo' : 'Sin coordenadas exactas'}
                  </Text>
                </View>
                <View className="rounded-full bg-background px-4 py-2">
                  <Text className="text-xs font-semibold text-primary">
                    {hasMobileMapboxToken ? 'Mapbox activo' : 'Mapbox pendiente'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                disabled={!mapCoordinates}
                onPress={() => {
                  if (!mapCoordinates) return;
                  void openExternalUrl(
                    buildMapsUrl({
                      latitude: mapCoordinates.latitude,
                      longitude: mapCoordinates.longitude,
                      label: data.fullName || data.name || locationLabel,
                    }),
                  );
                }}
                className={`mt-5 h-12 items-center justify-center rounded-full ${
                  mapCoordinates ? 'bg-secondary' : 'bg-gray-300'
                }`}
              >
                <Text className="text-sm font-bold text-white">
                  {mapCoordinates ? 'Abrir indicaciones' : 'Ubicacion no disponible'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {(locationLabel || phoneValue || emailValue || socialLinks.length > 0) ? (
            <View className="mt-6 rounded-[28px] border border-secondary/5 bg-white p-6 shadow-sm">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Contacto</Text>
              <Text className="mt-2 text-2xl font-bold text-secondary">Datos y canales del negocio</Text>

              <View className="mt-5" style={{ gap: 12 }}>
                {locationLabel ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (mapCoordinates) {
                        void openExternalUrl(
                          buildMapsUrl({
                            latitude: mapCoordinates.latitude,
                            longitude: mapCoordinates.longitude,
                            label: data.fullName || data.name || locationLabel,
                          }),
                        );
                        return;
                      }
                      void openExternalUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}`);
                    }}
                    className="rounded-[22px] bg-background p-4"
                  >
                    <View className="flex-row items-start">
                      <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-white"><Ionicons name="location-outline" size={18} color="#0F172A" /></View>
                      <View className="ml-3 flex-1"><Text className="text-xs font-bold uppercase tracking-[1px] text-gray-500">Ubicacion</Text><Text className="mt-1 text-sm leading-6 text-secondary">{locationLabel}</Text><Text className="mt-2 text-xs font-semibold text-primary">{mapCoordinates ? 'Abrir en mapas' : 'Buscar direccion'}</Text></View>
                    </View>
                  </TouchableOpacity>
                ) : null}
                {phoneValue ? (
                  <TouchableOpacity onPress={() => void openExternalUrl(`tel:${phoneValue}`)} className="rounded-[22px] bg-background p-4">
                    <View className="flex-row items-start">
                      <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-white"><Ionicons name="call-outline" size={18} color="#0F172A" /></View>
                      <View className="ml-3 flex-1"><Text className="text-xs font-bold uppercase tracking-[1px] text-gray-500">Telefono</Text><Text className="mt-1 text-sm leading-6 text-secondary">{phoneValue}</Text></View>
                    </View>
                  </TouchableOpacity>
                ) : null}
                {emailValue ? (
                  <TouchableOpacity onPress={() => void openExternalUrl(`mailto:${emailValue}`)} className="rounded-[22px] bg-background p-4">
                    <View className="flex-row items-start">
                      <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-white"><Ionicons name="mail-outline" size={18} color="#0F172A" /></View>
                      <View className="ml-3 flex-1"><Text className="text-xs font-bold uppercase tracking-[1px] text-gray-500">Email</Text><Text className="mt-1 text-sm leading-6 text-secondary">{emailValue}</Text></View>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>

              {socialLinks.length > 0 ? (
                <View className="mt-5 flex-row flex-wrap" style={{ gap: 10 }}>
                  {socialLinks.map((item) => (
                    <TouchableOpacity key={item.key} onPress={() => void openExternalUrl(item.href)} className="rounded-full border border-secondary/10 bg-background px-4 py-3">
                      <View className="flex-row items-center"><Ionicons name={item.icon} size={16} color="#0F172A" /><Text className="ml-2 text-xs font-bold text-secondary">{item.label}</Text></View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
