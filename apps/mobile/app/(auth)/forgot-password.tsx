import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';
import { getApiErrorMessage } from '../../src/services/errors';
import { AppScreen, surfaceStyles } from '../../src/components/ui/AppScreen';
import { theme } from '../../src/theme';

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
      style={{ flex: 1 }}
    >
      <AppScreen
        scroll
        contentContainerStyle={{ justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
        scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
      >
        <LinearGradient
          colors={theme.gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[30px] px-6 py-6"
        >
          <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">Recuperar acceso</Text>
          <Text className="mt-3 text-3xl font-semibold text-white">Restablecer contrasena</Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">
            Si existe una cuenta recuperable, te enviaremos instrucciones por email.
          </Text>
        </LinearGradient>

        <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
          <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">Email principal</Text>
          <Text className="mt-2 text-2xl font-semibold text-secondary">Enviar instrucciones</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">
            Usa el correo con el que te registraste para recuperar el acceso.
          </Text>

          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-secondary">Email</Text>
            <TextInput
              className="h-14 w-full rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
              placeholder="tucorreo@gmail.com"
              placeholderTextColor={theme.colors.inkFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {message ? (
            <View className="mt-4 rounded-xl bg-emerald-50 p-3">
              <Text className="text-center text-xs text-emerald-700">{message}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View className="mt-4 rounded-xl bg-red-50 p-3">
              <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            className="mt-6 shadow-md"
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-14 items-center justify-center rounded-full"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-secondary">Enviar instrucciones</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="mt-5 items-center">
              <Text className="text-sm font-semibold text-secondary">Volver a iniciar sesion</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}
