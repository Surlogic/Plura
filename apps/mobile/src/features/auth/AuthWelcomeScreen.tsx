import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen, surfaceStyles } from '../../components/ui/AppScreen';
import { theme } from '../../theme';

export function AuthWelcomeScreen() {
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
        <View className="flex-row items-center justify-between">
          <View
            className="items-center justify-center rounded-[24px] bg-white/14"
            style={{ width: 72, height: 72 }}
          >
            <Image
              source={require('../../../assets/icon.png')}
              style={{ width: 52, height: 52 }}
              resizeMode="contain"
            />
          </View>

          <View className="rounded-full bg-white/12 px-4 py-2">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-white/76">
              Acceso mobile
            </Text>
          </View>
        </View>

        <Text className="mt-6 text-3xl font-bold text-white">
          Bienvenido a Plura
        </Text>
        <Text className="mt-3 text-sm leading-6 text-white/80">
          Elige como quieres entrar para seguir una experiencia pensada para cliente o profesional.
        </Text>

        <View className="mt-5 flex-row flex-wrap" style={{ gap: 10 }}>
          <View className="rounded-full bg-white/12 px-4 py-2">
            <Text className="text-xs font-semibold text-white">Reservas simples</Text>
          </View>
          <View className="rounded-full bg-white/12 px-4 py-2">
            <Text className="text-xs font-semibold text-white">Agenda profesional</Text>
          </View>
        </View>
      </LinearGradient>

      <View className="mt-5 rounded-[32px] p-6" style={surfaceStyles.card}>
        <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
          Elegir acceso
        </Text>
        <Text className="mt-2 text-2xl font-bold text-secondary">
          Inicia segun tu rol
        </Text>
        <Text className="mt-2 text-sm leading-6 text-muted">
          Usa el mismo look de la app para entrar directo al flujo correcto.
        </Text>

        <Link href="/(auth)/login-client" asChild>
          <TouchableOpacity
            className="mt-6 rounded-[26px] p-5"
            style={{ backgroundColor: theme.colors.surfaceTint, borderWidth: 1, borderColor: theme.colors.border }}
            activeOpacity={0.88}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Iniciar como cliente</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">
                  Descubre profesionales, reserva y gestiona tus turnos.
                </Text>
              </View>
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${theme.colors.primary}16` }}
              >
                <Ionicons name="person-outline" size={22} color={theme.colors.primaryStrong} />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/login-professional" asChild>
          <TouchableOpacity
            className="mt-4 rounded-[26px] p-5"
            style={{ backgroundColor: theme.colors.surfaceStrong, borderWidth: 1, borderColor: theme.colors.border }}
            activeOpacity={0.88}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Iniciar como profesional</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">
                  Administra agenda, servicios y configuracion del negocio.
                </Text>
              </View>
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${theme.colors.accent}16` }}
              >
                <Ionicons name="briefcase-outline" size={22} color={theme.colors.accentStrong} />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <View className="mt-6 rounded-[24px] border border-dashed border-secondary/15 bg-backgroundSoft p-5">
          <Text className="text-sm font-semibold text-secondary">Todavia no tienes cuenta</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">
            Puedes crearla despues desde el flujo de cliente o profesional.
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
