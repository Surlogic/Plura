import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardTab() {
  const { profile, clientProfile, role, hasLoaded, logout } = useProfessionalProfileContext();

  if (!hasLoaded) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#1FB6A6" />
      </View>
    );
  }

  // Si no hay perfil, mostramos la opción de iniciar sesión
  if (!profile) {
    if (clientProfile && role === 'client') {
      return (
        <SafeAreaView className="flex-1 bg-background">
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
            <LinearGradient
              colors={['#0E2A47', '#1FB6A6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[26px] p-5"
            >
              <Text className="text-xs font-bold uppercase tracking-[2px] text-white/80">Panel cliente</Text>
              <Text className="mt-2 text-3xl font-bold text-white">Hola, {clientProfile.fullName}</Text>
              <Text className="mt-2 text-sm text-white/80">
                Gestiona tus reservas, notificaciones y preferencias en mobile.
              </Text>
            </LinearGradient>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/favorites')}
              className="mt-6 rounded-[24px] bg-white p-5 border border-secondary/10 shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 rounded-full bg-red-50 items-center justify-center">
                    <Ionicons name="heart" size={18} color="#EF4444" />
                  </View>
                  <View className="ml-3">
                    <Text className="font-bold text-secondary">Favoritos</Text>
                    <Text className="text-xs text-gray-500">Tu lista guardada</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/dashboard/settings')}
              className="mt-4 rounded-[24px] bg-white p-5 border border-secondary/10 shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                    <Ionicons name="settings-outline" size={18} color="#0E2A47" />
                  </View>
                  <View className="ml-3">
                    <Text className="font-bold text-secondary">Configuracion</Text>
                    <Text className="text-xs text-gray-500">Preferencias de cuenta</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={logout}
              className="mt-8 rounded-full border border-red-200 bg-red-50 h-12 items-center justify-center"
            >
              <Text className="font-semibold text-red-600">Cerrar sesion</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
      <LinearGradient
        colors={['#0E2A47', '#103E5F', '#1FB6A6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-[26px] p-6"
      >
        <Text className="text-xs font-bold uppercase tracking-[2px] text-white/80">Panel profesional</Text>
        <Text className="mt-2 text-3xl font-bold text-white">Mi Panel</Text>
        <Text className="text-base text-white/80">Hola, {profile.fullName}</Text>
      </LinearGradient>

      <View className="space-y-3 mt-6">
        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/agenda')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-primary/15 items-center justify-center">
                <Ionicons name="calendar-outline" size={18} color="#1FB6A6" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Agenda</Text>
                <Text className="text-xs text-gray-500">Turnos y estados del dia</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/services')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="cut-outline" size={18} color="#0E2A47" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Mis Servicios</Text>
                <Text className="text-xs text-gray-500">Alta, edicion y disponibilidad</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/business-profile')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="storefront-outline" size={18} color="#0E2A47" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Perfil del negocio</Text>
                <Text className="text-xs text-gray-500">Info publica y redes</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/schedule')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="time-outline" size={18} color="#0E2A47" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Horarios</Text>
                <Text className="text-xs text-gray-500">Disponibilidad semanal</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/settings')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="settings-outline" size={18} color="#0E2A47" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Configuracion</Text>
                <Text className="text-xs text-gray-500">Preferencias de la cuenta</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={logout}
          className="w-full h-14 bg-red-50 border border-red-200 rounded-full items-center justify-center"
        >
          <Text className="text-red-600 font-bold text-base">Cerrar sesion</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}