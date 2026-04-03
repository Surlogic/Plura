import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import EmailVerificationCard from '../../src/components/auth/EmailVerificationCard';
import { useAuthSession } from '../../src/context/ProfessionalProfileContext';
import { AppScreen } from '../../src/components/ui/AppScreen';
import {
  ActionButton,
  ScreenHero,
  SectionCard,
} from '../../src/components/ui/MobileSurface';

export default function DashboardTab() {
  const { clientProfile, hasLoaded, logout, refreshProfile } = useAuthSession();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshProfile]);

  if (!hasLoaded) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#0A7A43" />
      </View>
    );
  }

  if (clientProfile) {
    return (
      <AppScreen
        scroll
        edges={['top']}
        refreshing={isRefreshing}
        onRefresh={() => {
          void handleRefresh();
        }}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
      >
        <ScreenHero
          eyebrow="Panel cliente"
          title={`Hola, ${clientProfile.fullName}`}
          description="Gestiona tus reservas, notificaciones y preferencias desde una vista mobile propia del cliente."
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
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications')}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-full bg-secondary/10 items-center justify-center">
                <Ionicons name="notifications-outline" size={18} color="#0F172A" />
              </View>
              <View className="ml-3">
                <Text className="font-bold text-secondary">Alertas</Text>
                <Text className="text-xs text-gray-500">Promos, reservas y avisos</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7D8DA1" />
          </TouchableOpacity>
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
        Tu perfil
      </Text>
      <Text className="text-base text-gray-500 mb-8 text-center">
        Inicia sesion para entrar como cliente o profesional y gestionar tu espacio correspondiente.
      </Text>
      <ActionButton
        label="Iniciar sesion"
        tone="brand"
        onPress={() => router.push('/(auth)/login')}
        style={{ width: '100%', minHeight: 56, marginBottom: 12 }}
        textStyle={{ fontSize: 16 }}
      />
      <ActionButton
        label="Crear cuenta"
        tone="secondary"
        onPress={() => router.push('/(auth)/register')}
        style={{ width: '100%', minHeight: 56 }}
        textStyle={{ fontSize: 16 }}
      />
    </SafeAreaView>
  );
}
