import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterEntryScreen() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
    >
      <View className="rounded-[32px] bg-white p-6 shadow-sm">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">
          Registro
        </Text>
        <Text className="mt-3 text-3xl font-bold text-secondary">
          Crea la cuenta correcta para tu rol
        </Text>
        <Text className="mt-3 text-sm text-gray-500">
          Igual que en web, el alta de cliente y profesional ahora queda separada desde el inicio.
        </Text>

        <Link href="/(auth)/register-client" asChild>
          <TouchableOpacity
            className="mt-6 rounded-[24px] border border-secondary/10 bg-background p-5"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Crear cuenta cliente</Text>
                <Text className="mt-1 text-sm text-gray-500">
                  Para reservar, seguir favoritos y gestionar tus turnos.
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name="sparkles-outline" size={22} color="#1FB6A6" />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/register-professional" asChild>
          <TouchableOpacity
            className="mt-4 rounded-[24px] border border-secondary/10 bg-white p-5"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-secondary">Crear cuenta profesional</Text>
                <Text className="mt-1 text-sm text-gray-500">
                  Para publicar servicios, configurar agenda y operar tu negocio.
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <Ionicons name="storefront-outline" size={22} color="#0E2A47" />
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-500">Ya tienes cuenta </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-sm font-bold text-primary">Iniciar sesion</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
