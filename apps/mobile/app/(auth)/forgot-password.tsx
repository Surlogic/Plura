import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';
import { getApiErrorMessage } from '../../src/services/errors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setMessage(null);
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage('Ingresa tu email.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post<{ message: string }>('/auth/password/forgot', {
        email: email.trim().toLowerCase(),
      });
      setMessage(response.data.message);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo procesar la solicitud.'));
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
          <View className="w-full rounded-[32px] bg-white p-8 shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Recuperar acceso</Text>
            <Text className="mt-2 text-3xl font-semibold text-secondary">Restablecer contraseña</Text>
            <Text className="mt-2 text-sm text-gray-500">
              Si existe una cuenta recuperable, te enviaremos instrucciones por email.
            </Text>

            <View className="mt-6">
              <Text className="mb-2 text-sm font-medium text-secondary">Email</Text>
              <TextInput
                className="h-14 w-full rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                placeholder="tucorreo@gmail.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {message ? (
              <View className="mt-4 rounded-xl bg-emerald-50 p-3">
                <Text className="text-xs text-emerald-700 text-center">{message}</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="mt-4 rounded-xl bg-red-50 p-3">
                <Text className="text-xs text-red-600 text-center">{errorMessage}</Text>
              </View>
            ) : null}

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
                className="h-14 items-center justify-center rounded-full"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-bold text-white">Enviar instrucciones</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity className="mt-5 items-center">
                <Text className="text-sm font-semibold text-secondary">Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
