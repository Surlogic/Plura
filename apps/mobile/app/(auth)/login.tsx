import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function LoginEntryScreen() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
    >
      <LinearGradient
        colors={['#0E2A47', '#1FB6A6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-[32px] p-6"
      >
        <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">
          Acceso Plura
        </Text>
        <Text className="mt-3 text-3xl font-bold text-white">
          Elige como quieres entrar
        </Text>
        <Text className="mt-3 text-sm text-white/80">
          Ahora cliente y profesional quedan separados desde el acceso, igual que en la web.
        </Text>
      </LinearGradient>

      <View className="mt-6 rounded-[32px] bg-white p-6 shadow-sm">
        <Text className="text-sm font-semibold text-secondary">
          Iniciar sesion
        </Text>

        <Link href="/(auth)/login-client" asChild>
          <TouchableOpacity
            className="mt-5 rounded-[24px] border border-secondary/10 bg-background p-5"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Como cliente</Text>
                <Text className="mt-1 text-sm text-gray-500">
                  Explora, guarda favoritos y gestiona tus reservas.
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name="person-outline" size={22} color="#1FB6A6" />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/login-professional" asChild>
          <TouchableOpacity
            className="mt-4 rounded-[24px] border border-secondary/10 bg-white p-5"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Como profesional</Text>
                <Text className="mt-1 text-sm text-gray-500">
                  Administra agenda, servicios y configuracion de tu negocio.
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <Ionicons name="briefcase-outline" size={22} color="#0E2A47" />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <View className="mt-6 rounded-[24px] border border-dashed border-secondary/15 bg-background p-5">
          <Text className="text-sm font-semibold text-secondary">Todavia no tienes cuenta</Text>
          <Text className="mt-1 text-sm text-gray-500">
            Crea tu cuenta y luego entra por el flujo correspondiente.
          </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity className="mt-4 h-12 items-center justify-center rounded-full bg-secondary">
              <Text className="font-semibold text-white">Crear cuenta</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
