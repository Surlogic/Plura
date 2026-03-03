import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';

export default function DashboardTab() {
  const { profile, hasLoaded } = useProfessionalProfileContext();

  if (!hasLoaded) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#1FB6A6" />
      </View>
    );
  }

  // Si no hay perfil, mostramos la opción de iniciar sesión
  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
        <Text className="text-2xl font-bold text-secondary mb-3 text-center">
          Tu Perfil
        </Text>
        <Text className="text-base text-gray-500 mb-8 text-center">
          Iniciá sesión para ver tus reservas, guardar favoritos y gestionar tu cuenta.
        </Text>
        <TouchableOpacity
          className="w-full h-14 bg-[#1FB6A6] rounded-full items-center justify-center mb-3"
          onPress={() => router.push('/(auth)/login')}
        >
          <Text className="text-white font-bold text-base">Iniciar Sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="w-full h-14 border border-secondary/20 rounded-full items-center justify-center"
          onPress={() => router.push('/(auth)/register')}
        >
          <Text className="text-secondary font-bold text-base">Crear cuenta</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Si es un profesional logueado
  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-6">
      <Text className="text-3xl font-bold text-secondary mb-2">Mi Panel</Text>
      <Text className="text-base text-gray-500 mb-8">¡Hola, {profile.fullName}!</Text>
      
      <View className="space-y-4">
        <TouchableOpacity
          className="w-full h-14 bg-secondary rounded-full items-center justify-center"
          onPress={() => router.push('/dashboard/agenda')}
        >
          <Text className="text-white font-bold text-base">Ir a mi Agenda</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="w-full h-14 bg-white border border-secondary/10 rounded-full items-center justify-center shadow-sm"
          onPress={() => router.push('/dashboard/services')}
        >
          <Text className="text-secondary font-bold text-base">Mis Servicios</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}