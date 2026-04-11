import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../src/lib/icons';
import { AppScreen, surfaceStyles } from '../../src/components/ui/AppScreen';
import { theme } from '../../src/theme';

export default function LoginEntryScreen() {
  return (
    <AppScreen
      scroll
      contentContainerStyle={{ justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 }}
    >
      <LinearGradient
        colors={[theme.colors.surfaceStrong, theme.colors.backgroundMuted, theme.colors.backgroundSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-[32px] px-6 py-7"
      >
        <Text className="text-xs font-bold uppercase tracking-[2px] text-secondary/60">
          Acceso Plura
        </Text>
        <Text className="mt-3 text-3xl font-bold text-secondary">
          Elegí cómo querés iniciar
        </Text>
        <Text className="mt-3 text-sm leading-6 text-secondary/78">
          Desde acá vas directo al login correcto, sin repetir la portada inicial.
        </Text>

        <View className="mt-5 flex-row flex-wrap" style={{ gap: 10 }}>
          <View className="rounded-full bg-white/80 px-4 py-2">
            <Text className="text-xs font-semibold text-secondary">Cliente</Text>
          </View>
          <View className="rounded-full bg-white/80 px-4 py-2">
            <Text className="text-xs font-semibold text-secondary">Profesional</Text>
          </View>
        </View>
      </LinearGradient>

      <View className="mt-5 rounded-[32px] p-6" style={surfaceStyles.card}>
        <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
          Accesos directos
        </Text>
        <Text className="mt-2 text-2xl font-bold text-secondary">
          Iniciar sesión
        </Text>
        <Text className="mt-2 text-sm leading-6 text-muted">
          Elegí el acceso correcto según tu cuenta.
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

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted">¿No tenés cuenta? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-sm font-bold text-primary">Crear cuenta</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </AppScreen>
  );
}
