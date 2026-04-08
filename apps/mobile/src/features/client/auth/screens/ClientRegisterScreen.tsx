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
import AuthLoadingOverlay from '../../../../components/auth/AuthLoadingOverlay';
import { useAuthSession } from '../../../../context/auth/AuthSessionContext';
import { useGoogleOAuth } from '../../../../hooks/useGoogleOAuth';
import { getApiErrorMessage } from '../../../../services/errors';
import api from '../../../../services/api';
import type { OAuthResult } from '../../../../services/authBackend';
import { AppScreen, surfaceStyles } from '../../../../components/ui/AppScreen';
import InternationalPhoneField from '../../../../components/ui/InternationalPhoneField';
import { hasMinimumPhoneDigits } from '../../../../lib/internationalPhone';
import { theme } from '../../../../theme';
import { clientAuthCopy, continueAfterClientAuth } from '../config';
import {
  AUTH_ENTRY_REGISTER_ROUTE,
  PROFESSIONAL_COMPLETE_PHONE_ROUTE,
  PROFESSIONAL_HOME_ROUTE,
} from '../../../shared/auth/routes';

type ClientRegisterForm = {
  fullName: string;
  email: string;
  confirmEmail: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

export function ClientRegisterScreen() {
  const { refreshProfile } = useAuthSession();
  const [form, setForm] = useState<ClientRegisterForm>({
    fullName: '',
    email: '',
    confirmEmail: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOAuthAuthenticated = async (result: OAuthResult) => {
    setErrorMessage(null);

    if (result.role === 'PROFESSIONAL') {
      if (!(result.user.phoneNumber ?? '').trim()) {
        router.replace(PROFESSIONAL_COMPLETE_PHONE_ROUTE);
        return;
      }
      router.replace(PROFESSIONAL_HOME_ROUTE);
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
    authAction: 'REGISTER',
    refreshProfile,
    onSuccess: handleOAuthAuthenticated,
    onError: (message) => {
      setErrorMessage(message || null);
    },
  });

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const confirmEmail = form.confirmEmail.trim().toLowerCase();
    const phoneNumber = form.phoneNumber.trim();

    if (!fullName || !email || !confirmEmail || !phoneNumber || !form.password || !form.confirmPassword) {
      setErrorMessage('Completa todos los campos para crear tu cuenta.');
      return;
    }

    if (email !== confirmEmail) {
      setErrorMessage('Los emails no coinciden.');
      return;
    }

    if (!hasMinimumPhoneDigits(phoneNumber)) {
      setErrorMessage('Ingresa un telefono valido.');
      return;
    }

    if (form.password.length < 8) {
      setErrorMessage('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(clientAuthCopy.registerEndpoint, {
        fullName,
        email,
        phoneNumber,
        password: form.password,
      });

      setSuccessMessage('Cuenta creada correctamente. Ahora puedes iniciar sesion.');
      router.replace(clientAuthCopy.loginRoute);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'No se pudo crear la cuenta.'));
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
          contentContainerStyle={{ paddingVertical: 32 }}
          scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
        >
          <View className="px-6">
            <LinearGradient
              colors={theme.gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[28px] px-6 py-6"
            >
              <Text className="text-xs font-bold uppercase tracking-[2px] text-secondary/70">
                Registro
              </Text>
              <Text className="mt-3 text-3xl font-semibold text-secondary">
                Crear cuenta cliente
              </Text>
              <Text className="mt-2 text-sm leading-6 text-secondary/80">
                Completa tus datos para reservar y seguir tus locales favoritos.
              </Text>
            </LinearGradient>

            <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
                    Registro
                  </Text>
                  <Text className="mt-2 text-2xl font-semibold text-secondary">
                    Crear cuenta cliente
                  </Text>
                </View>
                <Link href={AUTH_ENTRY_REGISTER_ROUTE} asChild>
                  <TouchableOpacity className="rounded-full border border-secondary/10 px-4 py-2">
                    <Text className="text-xs font-semibold text-secondary">Cambiar rol</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <Text className="mt-3 text-sm leading-6 text-muted">
                Completa tus datos para reservar y seguir tus locales favoritos.
              </Text>

              <View className="mt-6">
                <View className="flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-secondary/10" />
                  <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-faint">
                    Registrate con
                  </Text>
                  <View className="h-px flex-1 bg-secondary/10" />
                </View>

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

                <View className="mt-4 flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-secondary/10" />
                  <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-faint">
                    o con email
                  </Text>
                  <View className="h-px flex-1 bg-secondary/10" />
                </View>
              </View>

              <View className="mt-6">
                <Text className="mb-1 text-xs font-medium text-secondary">Nombre completo</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="Tu nombre y apellido"
                  value={form.fullName}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Email</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="tucorreo@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Confirmar email</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="tucorreo@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.confirmEmail}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, confirmEmail: value }))}
                />
              </View>

              <InternationalPhoneField
                label="Telefono"
                value={form.phoneNumber}
                onChange={(value) => setForm((prev) => ({ ...prev, phoneNumber: value }))}
                placeholder="11 2345 6789"
                helperText="Selecciona el pais y escribe el numero sin repetir el codigo internacional."
              />

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Contrasena</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="••••••••"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-1 text-xs font-medium text-secondary">Confirmar contrasena</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                  placeholder="••••••••"
                  secureTextEntry
                  value={form.confirmPassword}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, confirmPassword: value }))}
                />
              </View>

              {errorMessage ? (
                <View className="mt-4 rounded-xl bg-red-50 p-3">
                  <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View className="mt-4 rounded-xl bg-emerald-50 p-3">
                  <Text className="text-center text-xs text-emerald-700">{successMessage}</Text>
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
                    <Text className="text-base font-semibold text-white">Crear cuenta</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View className="mt-6 flex-row justify-center">
                <Text className="text-sm text-muted">Ya tienes cuenta </Text>
                <Link href={clientAuthCopy.loginRoute} asChild>
                  <TouchableOpacity>
                    <Text className="text-sm font-bold text-primary">{clientAuthCopy.loginLinkLabel}</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </AppScreen>
      </KeyboardAvoidingView>

      <AuthLoadingOverlay
        visible={isSubmitting || isGoogleSubmitting}
        title="Registrando cuenta"
        description={
          isGoogleSubmitting
            ? 'Creando tu cuenta con Google como cliente.'
            : 'Creando tu cuenta de cliente.'
        }
      />
    </>
  );
}
