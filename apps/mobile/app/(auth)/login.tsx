import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen, surfaceStyles } from '../../src/components/ui/AppScreen';
import { theme } from '../../src/theme';

export default function LoginEntryScreen() {
  return (
    <AppScreen
      scroll
      contentContainerStyle={{ justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 }}
    >
      <LinearGradient
        colors={theme.gradients.heroElevated}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-[32px] px-6 py-7"
      >
        <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">
          Acceso Plura
        </Text>
        <Text className="mt-3 text-3xl font-bold text-white">
          Entra con una experiencia alineada a la web
        </Text>
        <Text className="mt-3 text-sm leading-6 text-white/78">
          Cliente y profesional ahora comparten la misma identidad visual: limpia, moderna y más premium.
        </Text>

        <View className="mt-5 flex-row flex-wrap" style={{ gap: 10 }}>
          <View className="rounded-full bg-white/12 px-4 py-2">
            <Text className="text-xs font-semibold text-white">Reserva simple</Text>
          </View>
          <View className="rounded-full bg-white/12 px-4 py-2">
            <Text className="text-xs font-semibold text-white">Agenda clara</Text>
          </View>
          <View className="rounded-full bg-white/12 px-4 py-2">
            <Text className="text-xs font-semibold text-white">Diseño consistente</Text>
          </View>
        </View>
      </LinearGradient>

      <View className="mt-5 rounded-[32px] p-6" style={surfaceStyles.card}>
        <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
          Elegir acceso
        </Text>
        <Text className="mt-2 text-2xl font-bold text-secondary">
          Iniciar sesion
        </Text>
        <Text className="mt-2 text-sm leading-6 text-muted">
          Selecciona el flujo que mejor encaja con tu cuenta.
        </Text>

        <Link href="/(auth)/login-client" asChild>
          <TouchableOpacity
            className="mt-6 rounded-[26px] border border-secondary/10 bg-backgroundSoft p-5"
            activeOpacity={0.86}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Como cliente</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">
                  Explora, guarda favoritos y gestiona reservas.
                </Text>
              </View>
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${theme.colors.primary}18` }}
              >
                <Ionicons name="person-outline" size={22} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/login-professional" asChild>
          <TouchableOpacity
            className="mt-4 rounded-[26px] border border-secondary/10 bg-white p-5"
            activeOpacity={0.86}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Como profesional</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">
                  Administra agenda, servicios y la operación del negocio.
                </Text>
              </View>
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${theme.colors.accent}18` }}
              >
                <Ionicons name="briefcase-outline" size={22} color={theme.colors.accentStrong} />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <View className="mt-6 rounded-[24px] border border-dashed border-secondary/15 bg-backgroundSoft p-5">
          <Text className="text-sm font-semibold text-secondary">Todavia no tienes cuenta</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">
            Crea tu cuenta y luego entra desde el flujo correcto.
          </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity
              className="mt-4 h-12 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.colors.secondary }}
            >
              <Text className="font-semibold text-white">Crear cuenta</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </AppScreen>
  );
}
