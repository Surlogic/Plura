import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmailVerificationCard from '../../src/components/auth/EmailVerificationCard';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppScreen } from '../../src/components/ui/AppScreen';
import {
  ActionButton,
  ScreenHero,
  SectionCard,
  StatusPill,
} from '../../src/components/ui/MobileSurface';

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
        <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
            <ScreenHero
              eyebrow="Panel cliente"
              title={`Hola, ${clientProfile.fullName}`}
              description="Gestiona tus reservas, notificaciones y preferencias en mobile con una vista mas clara."
              icon="person-outline"
            />

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

            <SectionCard style={{ marginTop: 24, paddingVertical: 18 }}>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/favorites')}
                className="flex-row items-center justify-between"
              >
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
              </TouchableOpacity>
            </SectionCard>

            <SectionCard style={{ marginTop: 16, paddingVertical: 18 }}>
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
            </SectionCard>

            <ActionButton
              onPress={logout}
              label="Cerrar sesion"
              tone="danger"
              style={{ marginTop: 32 }}
            />
        </AppScreen>
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
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
      <ScreenHero
        eyebrow="Cuenta profesional"
        title="Centro de gestion"
        description={`Hola, ${profile.fullName}. Revisa tu estado, accesos clave y configuracion del negocio.`}
        icon="briefcase-outline"
        badges={[
          { label: `Plan ${profile.professionalPlan || 'BASIC'}`, tone: 'light' },
          { label: profile.rubro || 'Profesional', tone: 'light' },
        ]}
      />

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

      <SectionCard style={{ marginTop: 24 }}>
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
          <ActionButton
            onPress={() => router.push(`/profesional/${profile.slug}`)}
            label="Ver pagina publica"
            style={{ marginTop: 4 }}
          />
        ) : null}
      </SectionCard>

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

        <ActionButton onPress={logout} label="Cerrar sesion" tone="danger" />
      </View>
    </AppScreen>
  );
}
