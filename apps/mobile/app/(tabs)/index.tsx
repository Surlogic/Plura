import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { listPublicProfessionals, type PublicProfessionalSummary } from '../../src/services/publicBookings';
import { getClientNextBooking, type ClientNextBooking } from '../../src/services/clientFeatures';
import { getApiErrorMessage } from '../../src/services/errors';

// Datos de prueba (los mismos de tu web)
const categories = ['Peluqueria', 'Barberia', 'Unas', 'Cosmetologia', 'Spa', 'Maquillaje'];

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<PublicProfessionalSummary[]>([]);
  const [nextBooking, setNextBooking] = useState<ClientNextBooking | null>(null);

  const load = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [professionals, upcoming] = await Promise.all([
        listPublicProfessionals(),
        getClientNextBooking().catch(() => null),
      ]);
      setBusinesses(professionals);
      setNextBooking(upcoming);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'No pudimos cargar la pantalla de inicio.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const topBusinesses = useMemo(() => businesses.slice(0, 6), [businesses]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Hero Section */}
        <View className="px-6 pt-6 pb-4">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
                Bienvenido a Plura
              </Text>
              <Text className="text-2xl font-bold text-secondary mt-1">
                ¿Qué estás buscando hoy?
              </Text>
            </View>
            <View className="h-12 w-12 rounded-full bg-white items-center justify-center shadow-sm">
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#0E2A47"
                onPress={() => router.push('/(tabs)/notifications')}
              />
            </View>
          </View>

          {/* Falsa Barra de Búsqueda (Al tocarla, te lleva a la pestaña Explorar) */}
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => router.push('/(tabs)/explore')}
            className="flex-row items-center bg-white h-14 rounded-full px-5 shadow-sm border border-secondary/5"
          >
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <Text className="ml-3 text-base text-gray-400 flex-1">
              Buscar servicios, rubros, locales...
            </Text>
            <View className="bg-primary/10 px-3 py-1.5 rounded-full">
              <Text className="text-xs font-bold text-primary">Cerca tuyo</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Categories Section (Scroll Horizontal) */}
        <View className="mt-4">
          <View className="px-6 flex-row justify-between items-end mb-4">
            <Text className="text-xl font-bold text-secondary">Rubros destacados</Text>
            <TouchableOpacity>
              <Text className="text-sm font-bold text-primary">Ver todos</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
          >
            {categories.map((cat, index) => (
              <TouchableOpacity 
                key={index}
                activeOpacity={0.7}
                className="items-center w-24"
              >
                <View className="h-16 w-16 bg-white rounded-[20px] items-center justify-center shadow-sm mb-2 border border-secondary/5">
                  {/* Ícono de ejemplo, en un caso real se mapea por categoría */}
                  <Ionicons name="cut-outline" size={28} color="#1FB6A6" />
                </View>
                <Text className="text-xs font-medium text-secondary text-center" numberOfLines={1}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Banner Promocional con Gradiente */}
        <View className="px-6 mt-10">
          {errorMessage ? (
            <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <Text className="text-sm text-red-600">{errorMessage}</Text>
              <TouchableOpacity onPress={load} className="mt-3 self-start rounded-full bg-white px-4 py-2">
                <Text className="text-xs font-bold text-secondary">Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <LinearGradient
            colors={['#1FB6A6', '#0E2A47']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-[28px] p-6 shadow-md"
          >
            <Text className="text-white text-xl font-bold mb-2">
              {nextBooking ? 'Tu proximo turno' : 'Turnos disponibles hoy'}
            </Text>
            <Text className="text-white/80 text-sm mb-4">
              {nextBooking
                ? `${nextBooking.service} con ${nextBooking.professional} - ${nextBooking.date} ${nextBooking.time}`
                : 'Encontra profesionales con espacios libres para las proximas horas.'}
            </Text>
            <TouchableOpacity className="bg-white px-5 py-2.5 rounded-full self-start">
              <Text className="text-secondary font-bold text-sm">{nextBooking ? 'Ver detalle' : 'Ver disponibilidad'}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Top Businesses Section */}
        <View className="mt-10">
          <View className="px-6 flex-row justify-between items-end mb-4">
            <Text className="text-xl font-bold text-secondary">Top Locales</Text>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
          >
            {isLoading ? (
              <View className="w-64 bg-white rounded-[28px] p-4 shadow-sm border border-secondary/5 items-center justify-center">
                <ActivityIndicator color="#1FB6A6" />
              </View>
            ) : null}

            {!isLoading && topBusinesses.map((business, index) => (
              <TouchableOpacity 
                key={business.id || index}
                activeOpacity={0.9}
                onPress={() => router.push(`/profesional/${business.slug}`)}
                className="w-64 bg-white rounded-[28px] p-4 shadow-sm border border-secondary/5"
              >
                {/* Imagen del Local (Placeholder) */}
                <View className="h-32 w-full bg-[#E9EEF2] rounded-[20px] mb-4 items-center justify-center overflow-hidden">
                   <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                </View>
                
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-2">
                    <Text className="text-lg font-bold text-secondary" numberOfLines={1}>
                      {business.fullName}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-0.5">
                      {business.rubro || 'Profesional'}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-primary/10 px-2 py-1 rounded-full">
                    <Ionicons name="star" size={12} color="#1FB6A6" />
                    <Text className="text-xs font-bold text-primary ml-1">
                      4.9
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}