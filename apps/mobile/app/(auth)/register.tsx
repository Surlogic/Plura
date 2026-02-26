import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    fullName: '',
    rubro: '',
    email: '',
    phoneNumber: '',
    location: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    
    // Validación básica
    if (!form.fullName || !form.rubro || !form.email || !form.password) {
      setErrorMessage('Completá los campos obligatorios.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Enviamos "LOCAL" por defecto en la app móvil, podrías añadir un picker luego si lo deseas
      const payload = { ...form, email: form.email.trim().toLowerCase(), tipoCliente: 'LOCAL' };
      
      await api.post('/auth/register/profesional', payload);
      
      // Una vez creado, lo mandamos al login para que inicie sesión
      router.replace('/(auth)/login');
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'No se pudo crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 40 }} keyboardShouldPersistTaps="handled">
        <View className="px-6">
          
          <View className="w-full space-y-4 rounded-[32px] bg-white p-8 shadow-sm">
            <View className="space-y-2 mb-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">
                Registro
              </Text>
              <Text className="text-2xl font-semibold text-secondary">
                Creá tu negocio
              </Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="mb-1 text-xs font-medium text-secondary">Nombre o empresa</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="Ej: Atelier Glow"
                  value={form.fullName}
                  onChangeText={(text) => setForm({ ...form, fullName: text })}
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1 text-xs font-medium text-secondary">Rubro</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="Ej: Salón de belleza"
                  value={form.rubro}
                  onChangeText={(text) => setForm({ ...form, rubro: text })}
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1 text-xs font-medium text-secondary">Email</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="tucorreo@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1 text-xs font-medium text-secondary">Teléfono</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="Ej: +54 11 1234 5678"
                  keyboardType="phone-pad"
                  value={form.phoneNumber}
                  onChangeText={(text) => setForm({ ...form, phoneNumber: text })}
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1 text-xs font-medium text-secondary">Ubicación</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="Ej: Palermo, CABA"
                  value={form.location}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1 text-xs font-medium text-secondary">Contraseña</Text>
                <TextInput
                  className="h-12 w-full rounded-2xl border border-secondary/10 bg-background px-4 text-sm text-secondary"
                  placeholder="••••••••"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(text) => setForm({ ...form, password: text })}
                />
              </View>

              {errorMessage && (
                <View className="mt-2 rounded-xl bg-red-50 p-3">
                  <Text className="text-xs text-red-600 text-center">{errorMessage}</Text>
                </View>
              )}

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
                    <Text className="text-base font-semibold text-white">Crear cuenta</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-gray-500">¿Ya tenés cuenta? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-sm font-bold text-primary">Iniciar sesión</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}