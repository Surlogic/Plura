import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Usamos la misma data de prueba que en tu web
const places = [
  { name: 'Atelier Glow', category: 'Salón de belleza', rating: '4.9', price: 'Desde $9.500', available: true, slug: 'atelier-glow' },
  { name: 'Barbería Sur', category: 'Barbería', rating: '4.8', price: 'Desde $6.200', available: true, slug: 'barberia-sur' },
  { name: 'Studio Aura', category: 'Cosmetología', rating: '4.9', price: 'Desde $8.900', available: false, slug: 'studio-aura' },
  { name: 'Nail District', category: 'Uñas', rating: '4.7', price: 'Desde $5.400', available: true, slug: 'nail-district' },
];

const filters = ['Todos', 'Peluquería', 'Barbería', 'Uñas', 'Cosmetología', 'Spa'];

export default function ExploreScreen() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Cabecera y Buscador Fijo */}
      <View className="bg-white px-6 pb-4 pt-2 shadow-sm z-10">
        <Text className="text-2xl font-bold text-secondary mb-4">Explorar locales</Text>
        
        <View className="flex-row items-center bg-background h-12 rounded-[16px] px-4 border border-secondary/10">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-base text-secondary"
            placeholder="Buscar servicios o profesionales..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Filtros Horizontales (Chips) */}
        <View className="py-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-full border ${
                    isActive ? 'bg-secondary border-secondary' : 'bg-white border-secondary/10'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-secondary'}`}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lista de Resultados */}
        <View className="px-6 space-y-4 mt-2">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
              Resultados ({places.length})
            </Text>
          </View>

          {places.map((place, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.9}
              onPress={() => router.push(`/profesional/${place.slug}`)}
              className="bg-white rounded-[24px] p-4 shadow-sm border border-secondary/5 mb-4"
            >
              <View className="h-40 w-full bg-[#E9EEF2] rounded-[20px] mb-4 items-center justify-center">
                <Ionicons name="image-outline" size={40} color="#9CA3AF" />
              </View>
              
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-lg font-bold text-secondary">{place.name}</Text>
                  <Text className="text-sm text-gray-500">{place.category}</Text>
                </View>
                {place.available && (
                  <View className="bg-primary/10 px-3 py-1 rounded-full">
                    <Text className="text-xs font-bold text-primary">Disponible hoy</Text>
                  </View>
                )}
              </View>

              <View className="flex-row justify-between items-center mt-3">
                <View className="flex-row items-center">
                  <Ionicons name="star" size={14} color="#1FB6A6" />
                  <Text className="text-sm font-bold text-secondary ml-1">{place.rating}</Text>
                </View>
                <Text className="text-sm text-gray-500">{place.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}