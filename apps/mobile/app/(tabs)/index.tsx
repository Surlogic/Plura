import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Datos de prueba (los mismos de tu web)
const categories = ['Peluquería', 'Barbería', 'Uñas', 'Cosmetología', 'Spa', 'Maquillaje'];
const businesses = [
  { name: 'Atelier Glow', category: 'Salón de belleza', rating: '4.9' },
  { name: 'Barbería Sur', category: 'Barbería', rating: '4.8' },
  { name: 'Studio Aura', category: 'Cosmetología', rating: '4.9' },
];

export default function HomeScreen() {
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
              <Ionicons name="notifications-outline" size={24} color="#0E2A47" />
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
          <LinearGradient
            colors={['#1FB6A6', '#0E2A47']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-[28px] p-6 shadow-md"
          >
            <Text className="text-white text-xl font-bold mb-2">
              Turnos disponibles hoy
            </Text>
            <Text className="text-white/80 text-sm mb-4">
              Encontrá profesionales con espacios libres para las próximas horas.
            </Text>
            <TouchableOpacity className="bg-white px-5 py-2.5 rounded-full self-start">
              <Text className="text-secondary font-bold text-sm">Ver disponibilidad</Text>
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
            {businesses.map((business, index) => (
              <TouchableOpacity 
                key={index}
                activeOpacity={0.9}
                className="w-64 bg-white rounded-[28px] p-4 shadow-sm border border-secondary/5"
              >
                {/* Imagen del Local (Placeholder) */}
                <View className="h-32 w-full bg-[#E9EEF2] rounded-[20px] mb-4 items-center justify-center overflow-hidden">
                   <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                </View>
                
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-2">
                    <Text className="text-lg font-bold text-secondary" numberOfLines={1}>
                      {business.name}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-0.5">
                      {business.category}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-primary/10 px-2 py-1 rounded-full">
                    <Ionicons name="star" size={12} color="#1FB6A6" />
                    <Text className="text-xs font-bold text-primary ml-1">
                      {business.rating}
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