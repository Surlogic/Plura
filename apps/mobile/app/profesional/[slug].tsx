import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getPublicProfessionalBySlug,
  getPublicSlots,
  type PublicProfessionalService,
} from '../../src/services/publicBookings';
import {
  getFavoriteProfessionalSlugs,
  subscribeFavoriteProfessionalSlugs,
  toggleFavoriteProfessionalSlug,
} from '../../src/services/clientFeatures';

const resolveServiceCategoryLabel = (
  service: PublicProfessionalService,
  fallbackCategory?: string | null,
) => {
  const categoryName = service.categoryName?.trim();
  if (categoryName) {
    return categoryName;
  }
  return fallbackCategory?.trim() || '';
};

export default function ProfesionalDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reserveMessage, setReserveMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const upcomingDates = useMemo(() => {
    const dates: string[] = [];
    const now = new Date();
    for (let index = 0; index < 7; index += 1) {
      const next = new Date(now);
      next.setDate(now.getDate() + index);
      dates.push(next.toISOString().slice(0, 10));
    }
    return dates;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getPublicProfessionalBySlug(slug);
        setData(response);
        if (response.services?.[0]?.id) {
          setSelectedServiceId(response.services[0].id);
        }
        if (upcomingDates[0]) {
          setSelectedDate(upcomingDates[0]);
        }
      } catch (err) {
        setError('No encontramos este profesional.');
      } finally {
        setIsLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug, upcomingDates]);

  useEffect(() => {
    const loadFavorite = async () => {
      if (!slug) return;
      const items = await getFavoriteProfessionalSlugs();
      setIsFavorite(items.includes(slug));
    };

    loadFavorite();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const unsubscribe = subscribeFavoriteProfessionalSlugs((next) => {
      setIsFavorite(next.includes(slug));
    });
    return unsubscribe;
  }, [slug]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!slug || !selectedServiceId || !selectedDate) return;
      setSlotsLoading(true);
      setReserveMessage(null);
      setSelectedSlot(null);
      try {
        const response = await getPublicSlots(slug, selectedDate, selectedServiceId);
        setSlots(response);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    loadSlots();
  }, [slug, selectedServiceId, selectedDate]);

  // Si está cargando
  if (isLoading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#1FB6A6" />
      </View>
    );
  }

  // Si hay error o no hay data
  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text className="text-lg font-bold text-secondary mt-4 text-center">{error || 'Ocurrió un error'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 px-6 py-3 bg-secondary rounded-full">
          <Text className="text-white font-bold">Volver atrás</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const initials = data.fullName
    ? data.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'PR';

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Cabecera con Gradiente tipo Web */}
        <LinearGradient
          colors={['#0B1D2A', '#145E63', '#1FB6A6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-48 pt-12 px-4 justify-start"
        >
          {/* Botón flotante para volver */}
          <TouchableOpacity 
            onPress={() => router.back()}
            className="h-10 w-10 bg-white/20 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              if (!slug) return;
              const next = await toggleFavoriteProfessionalSlug(slug);
              setIsFavorite(next.includes(slug));
            }}
            className="absolute right-4 top-12 h-10 w-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Tarjeta de Información Principal (Solapada hacia arriba) */}
        <View className="px-6 -mt-12 mb-6">
          <View className="bg-white rounded-[28px] p-6 shadow-md border border-secondary/5">
            <View className="flex-row items-center gap-4">
              <View className="h-16 w-16 rounded-full border-2 border-primary bg-background items-center justify-center">
                <Text className="text-xl font-bold text-secondary">{initials}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-400">
                  {data.rubro || 'Profesional'}
                </Text>
                <Text className="text-2xl font-bold text-secondary mt-0.5" numberOfLines={2}>
                  {data.fullName}
                </Text>
              </View>
            </View>
            {data.headline && (
              <Text className="mt-4 text-base text-gray-500 leading-relaxed">
                {data.headline}
              </Text>
            )}
          </View>
        </View>

        {/* Lista de Servicios */}
        <View className="px-6 mb-10">
          <Text className="text-xl font-bold text-secondary mb-4">Servicios destacados</Text>
          
          {(!data.services || data.services.length === 0) ? (
            <View className="bg-white rounded-[20px] p-6 items-center border border-dashed border-gray-300">
              <Text className="text-gray-500 text-center">No hay servicios cargados todavía.</Text>
            </View>
          ) : (
            data.services.map((service: PublicProfessionalService, index: number) => {
              const isSelected = selectedServiceId === service.id;
              return (
              <View key={service.id || index} className="bg-white rounded-[20px] p-5 mb-4 shadow-sm border border-secondary/5">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-bold text-secondary">{service.name}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{service.duration || 'Duración a definir'}</Text>
                    {resolveServiceCategoryLabel(service, data.rubro) ? (
                      <Text className="text-xs text-gray-500 mt-1">
                        {resolveServiceCategoryLabel(service, data.rubro)}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-lg font-bold text-primary">
                    {service.price ? (service.price.includes('$') ? service.price : `$${service.price}`) : 'Consultar'}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedServiceId(service.id);
                    setReserveMessage(null);
                  }}
                  className={`h-12 rounded-full items-center justify-center mt-2 ${isSelected ? 'bg-primary' : 'bg-secondary'}`}
                >
                  <Text className="text-white font-bold">{isSelected ? 'Servicio seleccionado' : 'Elegir servicio'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
          )}
        </View>

        <View className="px-6 mb-10">
          <Text className="text-xl font-bold text-secondary mb-3">Reservar turno</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {upcomingDates.map((date) => {
              const selected = selectedDate === date;
              return (
                <TouchableOpacity
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  className={`rounded-full px-4 py-2 ${selected ? 'bg-secondary' : 'bg-white border border-secondary/10'}`}
                >
                  <Text className={`font-semibold ${selected ? 'text-white' : 'text-secondary'}`}>{date.slice(5)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="mt-4 rounded-[20px] bg-white p-4 border border-secondary/5">
            {slotsLoading ? (
              <View className="py-5 items-center">
                <ActivityIndicator color="#1FB6A6" />
              </View>
            ) : slots.length === 0 ? (
              <Text className="text-gray-500">No hay horarios disponibles para esta fecha.</Text>
            ) : (
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {slots.map((slot) => {
                  const selected = selectedSlot === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      onPress={() => setSelectedSlot(slot)}
                      className={`rounded-full px-4 py-2 ${selected ? 'bg-primary' : 'bg-background border border-secondary/10'}`}
                    >
                      <Text className={`font-semibold ${selected ? 'text-white' : 'text-secondary'}`}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              disabled={!selectedServiceId || !selectedDate || !selectedSlot}
              onPress={() => {
                if (!slug || !selectedServiceId || !selectedDate || !selectedSlot) return;
                setReserveMessage(null);
                router.push({
                  pathname: '/reservar',
                  params: {
                    slug,
                    serviceId: selectedServiceId,
                    date: selectedDate,
                    time: selectedSlot,
                  },
                });
              }}
              className="mt-4 h-12 rounded-full items-center justify-center bg-secondary"
            >
              <Text className="font-bold text-white">Continuar al checkout</Text>
            </TouchableOpacity>

            {reserveMessage ? <Text className="mt-3 text-sm text-secondary">{reserveMessage}</Text> : null}
          </View>
        </View>

        {/* Sección Sobre Mí */}
        {data.about && (
          <View className="px-6 mb-10">
            <Text className="text-xl font-bold text-secondary mb-3">Sobre el local</Text>
            <View className="bg-white rounded-[20px] p-5 shadow-sm border border-secondary/5">
              <Text className="text-gray-500 leading-relaxed text-sm">
                {data.about}
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
