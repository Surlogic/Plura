import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';
import { setProfessionalToken } from '../../src/services/session';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';

export default function LoginScreen() {
  const { refreshProfile } = useProfessionalProfileContext();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!form.email || !form.password) {
      setErrorMessage('Por favor, completa todos los campos.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/auth/login/profesional', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      await setProfessionalToken(response.data.accessToken);
      await refreshProfile();
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      setErrorMessage('Credenciales inválidas o error de servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View className="px-6 py-12">
          
          {/* Tarjeta Blanca Principal */}
          <View className="w-full space-y-6 rounded-[32px] bg-white p-8 shadow-sm">
            
            {/* Cabecera */}
            <View className="space-y-2 mb-4">
              <Text className="text-xs font-bold uppercase tracking-[0.35em] text-gray-500">
                Login
              </Text>
              <Text className="text-3xl font-semibold text-secondary">
                Acceso Plura
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                Gestioná tu agenda y tus clientes desde tu celular.
              </Text>
            </View>

            {/* Formulario */}
            <View className="space-y-5">
              <View>
                <Text className="mb-2 text-sm font-medium text-secondary">Email</Text>
                <TextInput
                  className="h-14 w-full rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                  placeholder="tucorreo@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-medium text-secondary">Contraseña</Text>
                <TextInput
                  className="h-14 w-full rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(text) => setForm({ ...form, password: text })}
                />
              </View>

              {errorMessage && (
                <View className="mt-4 rounded-xl bg-red-50 p-3">
                  <Text className="text-xs text-red-600 text-center">{errorMessage}</Text>
                </View>
              )}

              {/* Botón con Degradado Premium */}
              <TouchableOpacity 
                className="mt-6 shadow-md"
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#1FB6A6', '#0E2A47']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="h-14 w-full flex-row items-center justify-center rounded-full"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Iniciar sesión</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Link al registro */}
            <View className="mt-8 flex-row justify-center">
              <Text className="text-sm text-gray-500">¿No tenés cuenta? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-sm font-bold text-primary">Crear cuenta</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}