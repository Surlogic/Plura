import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../src/lib/icons';
import { AppScreen, surfaceStyles } from '../../src/components/ui/AppScreen';
import { theme } from '../../src/theme';

export default function RegisterEntryScreen() {
  return (
    <AppScreen
      scroll
      contentContainerStyle={{ justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 }}
    >
      <LinearGradient
        colors={theme.gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-[32px] px-6 py-7"
      >
        <Text className="text-xs font-bold uppercase tracking-[2px] text-secondary/70">
          Registro
        </Text>
        <Text className="mt-3 text-3xl font-bold text-secondary">
          Crea la cuenta adecuada para tu rol
        </Text>
        <Text className="mt-3 text-sm leading-6 text-secondary/80">
          El alta mobile ahora acompaña la misma estética luminosa y profesional de la web.
        </Text>
      </LinearGradient>

      <View className="mt-5 rounded-[32px] p-6" style={surfaceStyles.card}>
        <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
          Elegir registro
        </Text>
        <Text className="mt-2 text-2xl font-bold text-secondary">
          Empieza en minutos
        </Text>
        <Text className="mt-2 text-sm leading-6 text-muted">
          Separamos cliente y profesional desde el inicio para dejar cada experiencia más clara.
        </Text>

        <Link href="/(auth)/register-client" asChild>
          <TouchableOpacity
            className="mt-6 rounded-[26px] border border-secondary/10 bg-backgroundSoft p-5"
            activeOpacity={0.86}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Crear cuenta cliente</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">
                  Para reservar, seguir favoritos y gestionar tus turnos.
                </Text>
              </View>
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${theme.colors.primary}18` }}
              >
                <Ionicons name="sparkles-outline" size={22} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/register-professional" asChild>
          <TouchableOpacity
            className="mt-4 rounded-[26px] border border-secondary/10 bg-white p-5"
            activeOpacity={0.86}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Crear cuenta profesional</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">
                  Para publicar servicios, agenda y la operación del negocio.
                </Text>
              </View>
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${theme.colors.premium}18` }}
              >
                <Ionicons name="storefront-outline" size={22} color={theme.colors.premiumStrong} />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted">Ya tienes cuenta </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-sm font-bold text-primary">Iniciar sesion</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </AppScreen>
  );
}
