import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmailVerificationCard from '../../src/components/auth/EmailVerificationCard';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardTab() {
  const { profile, clientProfile, role, hasLoaded, logout, refreshProfile } = useProfessionalProfileContext();

  if (!hasLoaded) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#0A7A43" />
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
              colors={['#0F172A', '#0A7A43']}
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

            {!clientProfile.emailVerified ? (
              <View className="mt-6">
                <EmailVerificationCard
                  email={clientProfile.email}
                  emailVerified={clientProfile.emailVerified}
                  onStatusChanged={refreshProfile}
                  variant="banner"
                />
              </View>
            ) : null}

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
                <Ionicons name="chevron-forward" size={18} color="#7D8DA1" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/dashboard/settings')}
              className="mt-4 rounded-[24px] bg-white p-5 border border-secondary/10 shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                    <Ionicons name="settings-outline" size={18} color="#0F172A" />
                  </View>
                  <View className="ml-3">
                    <Text className="font-bold text-secondary">Configuracion</Text>
                    <Text className="text-xs text-gray-500">Preferencias de cuenta</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#7D8DA1" />
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
          Inicia sesion para entrar como cliente o profesional y gestionar tu espacio correspondiente.
        </Text>
        <TouchableOpacity
          className="w-full h-14 bg-[#0A7A43] rounded-full items-center justify-center mb-3"
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
        colors={['#0F172A', '#162033', '#0A7A43']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-[26px] p-6"
      >
        <Text className="text-xs font-bold uppercase tracking-[2px] text-white/80">Cuenta profesional</Text>
        <Text className="mt-2 text-3xl font-bold text-white">Centro de gestion</Text>
        <Text className="text-base text-white/80">Hola, {profile.fullName}</Text>
        <View className="mt-5 flex-row flex-wrap" style={{ gap: 10 }}>
          <View className="rounded-full bg-white/15 px-4 py-2">
            <Text className="text-xs font-semibold text-white">Plan {profile.professionalPlan || 'BASIC'}</Text>
          </View>
          <View className="rounded-full bg-white/15 px-4 py-2">
            <Text className="text-xs font-semibold text-white">{profile.rubro || 'Profesional'}</Text>
          </View>
        </View>
      </LinearGradient>

      {!profile.emailVerified ? (
        <View className="mt-6">
          <EmailVerificationCard
            email={profile.email}
            emailVerified={profile.emailVerified}
            onStatusChanged={refreshProfile}
            variant="banner"
          />
        </View>
        ) : null}

      <View className="mt-6 rounded-[24px] bg-white border border-secondary/10 p-5 shadow-sm">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Estado del negocio</Text>
        <View className="mt-4 flex-row flex-wrap justify-between">
          <View className="mb-4 w-[48%] rounded-[20px] bg-background p-4">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">Email</Text>
            <Text className="mt-2 text-base font-bold text-secondary">
              {profile.emailVerified ? 'Verificado' : 'Pendiente'}
            </Text>
          </View>
          <View className="mb-4 w-[48%] rounded-[20px] bg-background p-4">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">Pagina publica</Text>
            <Text className="mt-2 text-base font-bold text-secondary">
              {profile.slug ? 'Activa' : 'Sin slug'}
            </Text>
          </View>
          <View className="w-[48%] rounded-[20px] bg-background p-4">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">Ubicacion</Text>
            <Text className="mt-2 text-base font-bold text-secondary">
              {profile.city || profile.location || 'Sin definir'}
            </Text>
          </View>
          <View className="w-[48%] rounded-[20px] bg-background p-4">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">Tipo</Text>
            <Text className="mt-2 text-base font-bold text-secondary">
              {profile.tipoCliente || 'Profesional'}
            </Text>
          </View>
        </View>
        {profile.slug ? (
          <TouchableOpacity
            onPress={() => router.push(`/profesional/${profile.slug}`)}
            className="mt-1 h-12 items-center justify-center rounded-full bg-secondary"
          >
            <Text className="font-bold text-white">Ver pagina publica</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="space-y-3 mt-6">
        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/agenda')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-primary/15 items-center justify-center">
                <Ionicons name="calendar-outline" size={18} color="#0A7A43" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Agenda</Text>
                <Text className="text-xs text-gray-500">Turnos y estados del dia</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7D8DA1" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/services')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="cut-outline" size={18} color="#0F172A" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Mis Servicios</Text>
                <Text className="text-xs text-gray-500">Alta, edicion y disponibilidad</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7D8DA1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/business-profile')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="storefront-outline" size={18} color="#0F172A" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Perfil del negocio</Text>
                <Text className="text-xs text-gray-500">Info publica y redes</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7D8DA1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/schedule')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="time-outline" size={18} color="#0F172A" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Horarios</Text>
                <Text className="text-xs text-gray-500">Disponibilidad semanal</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7D8DA1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/billing')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="card-outline" size={18} color="#0F172A" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Facturacion</Text>
                <Text className="text-xs text-gray-500">Plan y datos de cobro</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7D8DA1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full rounded-[22px] bg-white border border-secondary/10 p-5 shadow-sm"
          onPress={() => router.push('/dashboard/settings')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="settings-outline" size={18} color="#0F172A" />
              </View>
              <View className="ml-3">
                <Text className="text-secondary font-bold text-base">Cuenta y seguridad</Text>
                <Text className="text-xs text-gray-500">Preferencias, verificacion y acceso</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7D8DA1" />
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
