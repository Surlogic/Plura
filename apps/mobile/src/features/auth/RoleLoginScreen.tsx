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
import api from '../../services/api';
import AuthLoadingOverlay from '../../components/auth/AuthLoadingOverlay';
import { useAuthSession } from '../../context/ProfessionalProfileContext';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { setSession } from '../../services/session';
import { getApiErrorMessage } from '../../services/errors';
import type { OAuthResult } from '../../services/authBackend';
import {
  authRoleCopy,
  backendRoleToAuthRole,
  continueAfterAuth,
  resolveCompletePhoneRouteFromBackendRole,
  type AuthRole,
} from './config';
import { AppScreen, surfaceStyles } from '../../components/ui/AppScreen';
import { theme } from '../../theme';

type RoleLoginScreenProps = {
  role: AuthRole;
};

export function RoleLoginScreen({ role }: RoleLoginScreenProps) {
  const copy = authRoleCopy[role];
  const { refreshProfile } = useAuthSession();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOAuthAuthenticated = async (result: OAuthResult) => {
    setErrorMessage(null);

    if (role === 'profesional' && result.role !== 'PROFESSIONAL') {
      setErrorMessage('Esta cuenta no quedo asociada como profesional. Usa acceso cliente o registrate como profesional.');
      return;
    }

    const resolvedRole = backendRoleToAuthRole(result.role);
    if (!resolvedRole) {
      setErrorMessage('El backend no devolvio un rol valido para esta sesion.');
      return;
    }

    if (!(result.user.phoneNumber ?? '').trim()) {
      router.replace(resolveCompletePhoneRouteFromBackendRole(result.role));
      return;
    }

    await continueAfterAuth(resolvedRole);
  };

  const { isGoogleSubmitting, handleGoogleAuth } = useGoogleOAuth({
    role,
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
      const response = await api.post(copy.loginEndpoint, {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      const accessToken = response.data?.accessToken || response.data?.token;
      const refreshToken = response.data?.refreshToken;

      if (!accessToken || !refreshToken) {
        setErrorMessage('El servidor no devolvio una sesion valida.');
        return;
      }

      await setSession({ accessToken, refreshToken });
      await refreshProfile();
      await continueAfterAuth(role);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo iniciar sesion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const heroColors = role === 'cliente' ? theme.gradients.brand : theme.gradients.heroElevated;
  const submitColors = role === 'cliente' ? theme.gradients.brand : theme.gradients.hero;

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
              colors={heroColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[30px] px-6 py-6"
            >
              <Text className={`text-xs font-bold uppercase tracking-[2px] ${role === 'cliente' ? 'text-secondary/70' : 'text-white/70'}`}>
                {copy.badge}
              </Text>
              <Text className={`mt-3 text-3xl font-semibold ${role === 'cliente' ? 'text-secondary' : 'text-white'}`}>
                {copy.title}
              </Text>
              <Text className={`mt-2 text-sm leading-6 ${role === 'cliente' ? 'text-secondary/80' : 'text-white/80'}`}>
                {copy.description}
              </Text>
            </LinearGradient>

            <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
                    {copy.badge}
                  </Text>
                  <Text className="mt-2 text-3xl font-semibold text-secondary">
                    {copy.title}
                  </Text>
                </View>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity className="rounded-full border border-secondary/10 bg-backgroundSoft px-4 py-2">
                    <Text className="text-xs font-semibold text-secondary">Cambiar acceso</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <Text className="mt-3 text-sm leading-6 text-muted">
                {copy.description}
              </Text>

              <Link href={copy.alternateLoginRoute} asChild>
                <TouchableOpacity className="mt-4 self-start">
                  <Text className="text-xs font-semibold text-primary">
                    {copy.alternateLoginLabel}
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
                <Link href="/(auth)/forgot-password" asChild>
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
                  colors={submitColors}
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
                <Link href={copy.registerRoute} asChild>
                  <TouchableOpacity>
                    <Text className="text-sm font-bold text-primary">{copy.registerLinkLabel}</Text>
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
            ? `Conectando tu cuenta de Google como ${copy.label}.`
            : `Verificando tus credenciales como ${copy.label}.`
        }
      />
    </>
  );
}
