import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../src/services/api';
import type { PublicService } from '../../src/types/professional';

export default function ProfesionalDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`/public/profesionales/${slug}`);
        setData(response.data);
      } catch (err) {
        setError('No encontramos este profesional.');
      } finally {
        setIsLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug]);

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
            {data.publicHeadline && (
              <Text className="mt-4 text-base text-gray-500 leading-relaxed">
                {data.publicHeadline}
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
            data.services.map((service: PublicService, index: number) => (
              <View key={service.id || index} className="bg-white rounded-[20px] p-5 mb-4 shadow-sm border border-secondary/5">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-bold text-secondary">{service.name}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{service.duration || 'Duración a definir'}</Text>
                  </View>
                  <Text className="text-lg font-bold text-primary">
                    {service.price ? (service.price.includes('$') ? service.price : `$${service.price}`) : 'Consultar'}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  activeOpacity={0.8}
                  // Al tocar, podrías navegar a una pantalla de reservar pasando los parámetros
                  onPress={() => alert(`Iniciando reserva para ${service.name}`)}
                  className="bg-secondary h-12 rounded-full items-center justify-center mt-2"
                >
                  <Text className="text-white font-bold">Reservar turno</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Sección Sobre Mí */}
        {data.publicAbout && (
          <View className="px-6 mb-10">
            <Text className="text-xl font-bold text-secondary mb-3">Sobre el local</Text>
            <View className="bg-white rounded-[20px] p-5 shadow-sm border border-secondary/5">
              <Text className="text-gray-500 leading-relaxed text-sm">
                {data.publicAbout}
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}