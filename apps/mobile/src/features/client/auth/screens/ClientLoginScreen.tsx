import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../../services/api';
import AuthLoadingOverlay from '../../../../components/auth/AuthLoadingOverlay';
import { useClientSession } from '../../session/useClientSession';
import { useGoogleOAuth } from '../../../../hooks/useGoogleOAuth';
import { getApiErrorMessage } from '../../../../services/errors';
import type { OAuthResult } from '../../../../services/authBackend';
import { AppScreen, surfaceStyles } from '../../../../components/ui/AppScreen';
import { theme } from '../../../../theme';
import { clientAuthCopy, continueAfterClientAuth } from '../config';
import {
  AUTH_WELCOME_ROUTE,
  AUTH_FORGOT_PASSWORD_ROUTE,
} from '../../../shared/auth/routes';
import { clearSession } from '../../../../services/session';

export function ClientLoginScreen() {
  const { refreshProfile } = useClientSession();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOAuthAuthenticated = async (result: OAuthResult) => {
    setErrorMessage(null);

    if (result.role === 'PROFESSIONAL') {
      await clearSession();
      await refreshProfile();
      setErrorMessage('Esta cuenta pertenece al acceso profesional. Usa el login profesional.');
      return;
    }

    if (!(result.user.phoneNumber ?? '').trim()) {
      router.replace(clientAuthCopy.completePhoneRoute);
      return;
    }

    await continueAfterClientAuth();
  };

  const { isGoogleSubmitting, handleGoogleAuth } = useGoogleOAuth({
    role: 'cliente',
    authAction: 'LOGIN',
    refreshProfile,
    onSuccess: handleOAuthAuthenticated,
    onError: (message) => {
      setErrorMessage(message || null);
    },
  });

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!form.email.trim() || !form.password) {
      setErrorMessage('Completa email y contrasena para continuar.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post(clientAuthCopy.loginEndpoint, {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      const accessToken = response.data?.accessToken || response.data?.token;
      const refreshToken = response.data?.refreshToken;

      if (!accessToken || !refreshToken) {
        setErrorMessage('El servidor no devolvio una sesion valida.');
        return;
      }

      await refreshProfile();
      await continueAfterClientAuth();
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo iniciar sesion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <AppScreen
          scroll
          contentContainerStyle={{ justifyContent: 'center', paddingVertical: 32 }}
          scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
        >
          <View className="px-6">
            <LinearGradient
              colors={theme.gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[30px] px-6 py-6"
            >
              <Text className="text-xs font-bold uppercase tracking-[2px] text-secondary/70">
                {clientAuthCopy.badge}
              </Text>
              <Text className="mt-3 text-3xl font-semibold text-secondary">
                {clientAuthCopy.title}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-secondary/80">
                {clientAuthCopy.description}
              </Text>
            </LinearGradient>

            <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
                    {clientAuthCopy.badge}
                  </Text>
                  <Text className="mt-2 text-3xl font-semibold text-secondary">
                    {clientAuthCopy.title}
                  </Text>
                </View>
                <Link href={AUTH_WELCOME_ROUTE} asChild>
                  <TouchableOpacity className="rounded-full border border-secondary/10 bg-backgroundSoft px-4 py-2">
                    <Text className="text-xs font-semibold text-secondary">Volver</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <Text className="mt-3 text-sm leading-6 text-muted">
                {clientAuthCopy.description}
              </Text>

              <Link href={clientAuthCopy.alternateLoginRoute} asChild>
                <TouchableOpacity className="mt-4 self-start">
                  <Text className="text-xs font-semibold text-primary">
                    Ir al login profesional
                  </Text>
                </TouchableOpacity>
              </Link>

              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-secondary">Email</Text>
                <TextInput
                  className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                  placeholder="tucorreo@gmail.com"
                  placeholderTextColor={theme.colors.inkFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-medium text-secondary">Contrasena</Text>
                <TextInput
                  className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                  placeholder="********"
                  placeholderTextColor={theme.colors.inkFaint}
                  secureTextEntry
                  value={form.password}
                  onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
                />
                <Link href={AUTH_FORGOT_PASSWORD_ROUTE} asChild>
                  <TouchableOpacity className="mt-3 self-end">
                    <Text className="text-xs font-semibold text-secondary">Olvide mi contrasena</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {errorMessage ? (
                <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
                  <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                className="mt-6 shadow-md"
                onPress={handleSubmit}
                disabled={isSubmitting || isGoogleSubmitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={theme.gradients.brand}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="h-14 flex-row items-center justify-center rounded-full"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Iniciar sesion</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-3 h-14 items-center justify-center rounded-full border border-secondary/15 bg-backgroundSoft"
                onPress={handleGoogleAuth}
                disabled={isSubmitting || isGoogleSubmitting}
                activeOpacity={0.85}
              >
                {isGoogleSubmitting ? (
                  <ActivityIndicator color={theme.colors.ink} />
                ) : (
                  <Text className="text-base font-semibold text-secondary">Continuar con Google</Text>
                )}
              </TouchableOpacity>

              <View className="mt-8 flex-row justify-center">
                <Text className="text-sm text-muted">No tienes cuenta </Text>
                <Link href={clientAuthCopy.registerRoute} asChild>
                  <TouchableOpacity>
                    <Text className="text-sm font-bold text-primary">{clientAuthCopy.registerLinkLabel}</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </AppScreen>
      </KeyboardAvoidingView>

      <AuthLoadingOverlay
        visible={isSubmitting || isGoogleSubmitting}
        title="Iniciando sesion"
        description={
          isGoogleSubmitting
            ? 'Conectando tu cuenta de Google como cliente.'
            : 'Verificando tus credenciales como cliente.'
        }
      />
    </>
  );
}
