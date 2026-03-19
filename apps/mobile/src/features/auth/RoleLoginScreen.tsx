import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import AuthLoadingOverlay from '../../components/auth/AuthLoadingOverlay';
import { useProfessionalProfileContext } from '../../context/ProfessionalProfileContext';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { setProfessionalSession } from '../../services/session';
import { authRoleCopy, continueAfterAuth, type AuthRole } from './config';

type RoleLoginScreenProps = {
  role: AuthRole;
};

export function RoleLoginScreen({ role }: RoleLoginScreenProps) {
  const copy = authRoleCopy[role];
  const { refreshProfile } = useProfessionalProfileContext();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isGoogleSubmitting, handleGoogleAuth } = useGoogleOAuth({
    role,
    authAction: 'LOGIN',
    refreshProfile,
    onSuccess: async () => {
      await continueAfterAuth(role);
    },
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

      await setProfessionalSession({ accessToken, refreshToken });
      await refreshProfile();
      await continueAfterAuth(role);
    } catch {
      setErrorMessage('Credenciales invalidas o error de servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-background"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6">
            <View className="rounded-[32px] bg-white p-8 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">
                    {copy.badge}
                  </Text>
                  <Text className="mt-2 text-3xl font-semibold text-secondary">
                    {copy.title}
                  </Text>
                </View>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity className="rounded-full border border-secondary/10 px-4 py-2">
                    <Text className="text-xs font-semibold text-secondary">Cambiar acceso</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <Text className="mt-3 text-sm text-gray-500">
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
                  className="h-14 rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                  placeholder="tucorreo@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-medium text-secondary">Contrasena</Text>
                <TextInput
                  className="h-14 rounded-[16px] border border-secondary/10 bg-background px-5 text-base text-secondary"
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
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
                <View className="mt-4 rounded-xl bg-red-50 p-3">
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
                  colors={['#1FB6A6', '#0E2A47']}
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
                className="mt-3 h-14 items-center justify-center rounded-full border border-secondary/15 bg-white"
                onPress={handleGoogleAuth}
                disabled={isSubmitting || isGoogleSubmitting}
                activeOpacity={0.85}
              >
                {isGoogleSubmitting ? (
                  <ActivityIndicator color="#0E2A47" />
                ) : (
                  <Text className="text-base font-semibold text-secondary">Continuar con Google</Text>
                )}
              </TouchableOpacity>

              <View className="mt-8 flex-row justify-center">
                <Text className="text-sm text-gray-500">No tienes cuenta </Text>
                <Link href={copy.registerRoute} asChild>
                  <TouchableOpacity>
                    <Text className="text-sm font-bold text-primary">{copy.registerLinkLabel}</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
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
