import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import type { ProfessionalService } from '../../src/types/professional';

export default function ServicesScreen() {
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await api.get('/profesional/services');
        setServices(response.data);
      } catch (error) {
        console.error("Error cargando servicios", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#1FB6A6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}>
        
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">
            Tus Servicios ({services.length})
          </Text>
          <TouchableOpacity className="bg-secondary px-3 py-1.5 rounded-full">
            <Text className="text-white text-xs font-bold">+ Nuevo</Text>
          </TouchableOpacity>
        </View>

        {services.length === 0 ? (
          <View className="bg-white rounded-[20px] p-6 items-center border border-dashed border-gray-300">
            <Ionicons name="cut-outline" size={40} color="#9CA3AF" />
            <Text className="text-gray-500 text-center mt-3">Todavía no creaste servicios. Creá el primero para empezar.</Text>
          </View>
        ) : (
          services.map((service, index) => (
            <View key={service.id || index} className="bg-white rounded-[20px] p-5 mb-4 shadow-sm border border-secondary/5">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-secondary mb-1">{service.name}</Text>
                  <Text className="text-sm text-gray-500">Duración: {service.duration || 'A definir'}</Text>
                </View>
                <Text className="text-base font-bold text-primary">
                  {service.price ? `$${service.price}` : 'Consultar'}
                </Text>
              </View>

              <View className="flex-row mt-4 gap-2">
                <TouchableOpacity className="flex-1 bg-background border border-secondary/10 py-2.5 rounded-full items-center">
                  <Text className="text-secondary font-bold text-sm">Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-red-50 border border-red-100 py-2.5 px-5 rounded-full items-center">
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}