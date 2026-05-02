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
import { isAxiosError } from 'axios';
import AuthLoadingOverlay from '../../../../components/auth/AuthLoadingOverlay';
import { AppScreen, surfaceStyles } from '../../../../components/ui/AppScreen';
import { theme } from '../../../../theme';
import {
  loginUnified,
  selectContext,
  type AuthContextDescriptor,
} from '../../../../services/authContext';
import { setSession } from '../../../../services/session';
import { useAuthSession } from '../../../../context/auth/AuthSessionContext';
import { getApiErrorMessage } from '../../../../services/errors';
import {
  AUTH_FORGOT_PASSWORD_ROUTE,
  CLIENT_REGISTER_ROUTE,
  PROFESSIONAL_REGISTER_ROUTE,
  homeRouteForContext,
} from '../routes';

const contextLabel = (descriptor: AuthContextDescriptor): string => {
  switch (descriptor.type) {
    case 'PROFESSIONAL':
      return descriptor.professionalName
        ? `Administrar ${descriptor.professionalName}`
        : 'Administrar mi local';
    case 'WORKER':
      return descriptor.professionalName
        ? `Trabajar en ${descriptor.professionalName}`
        : 'Entrar como trabajador';
    default:
      return 'Reservar como cliente';
  }
};

const contextDescription = (descriptor: AuthContextDescriptor): string => {
  switch (descriptor.type) {
    case 'PROFESSIONAL':
      return 'Dashboard del local: agenda, reservas, equipo y configuracion.';
    case 'WORKER':
      return descriptor.workerDisplayName
        ? `Tu agenda y reservas asignadas como ${descriptor.workerDisplayName}.`
        : 'Tu agenda y reservas asignadas en este local.';
    default:
      return 'Buscar profesionales y reservar tus turnos.';
  }
};

const contextKey = (descriptor: AuthContextDescriptor) =>
  `${descriptor.type}-${descriptor.workerId ?? descriptor.professionalId ?? 'self'}`;

const extractMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
  }
  return getApiErrorMessage(error, fallback);
};

export function UnifiedLoginScreen() {
  const { refreshProfile } = useAuthSession();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contexts, setContexts] = useState<AuthContextDescriptor[] | null>(null);
  const [selectingKey, setSelectingKey] = useState<string | null>(null);

  const finishLogin = async (descriptor: AuthContextDescriptor | null | undefined) => {
    await refreshProfile();
    router.replace(homeRouteForContext(descriptor));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!form.email.trim() || !form.password) {
      setErrorMessage('Completa email y contrasena para continuar.');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await loginUnified({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      await setSession({
        accessToken: response.accessToken ?? null,
        refreshToken: response.refreshToken ?? null,
      });
      const list = Array.isArray(response.contexts) ? response.contexts : [];
      if (response.contextSelectionRequired && list.length > 1) {
        setContexts(list);
        return;
      }
      await finishLogin(response.activeContext ?? null);
    } catch (error) {
      setErrorMessage(extractMessage(error, 'No se pudo iniciar sesion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickContext = async (descriptor: AuthContextDescriptor) => {
    setErrorMessage(null);
    const key = contextKey(descriptor);
    try {
      setSelectingKey(key);
      const response = await selectContext({
        type: descriptor.type,
        workerId: descriptor.workerId ?? undefined,
        professionalId: descriptor.professionalId ?? undefined,
      });
      if (response.accessToken) {
        await setSession({ accessToken: response.accessToken });
      }
      await finishLogin(response.activeContext ?? descriptor);
    } catch (error) {
      setErrorMessage(extractMessage(error, 'No pudimos cambiar de contexto.'));
    } finally {
      setSelectingKey(null);
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
                Acceso a Plura
              </Text>
              <Text className="mt-3 text-3xl font-semibold text-secondary">
                Iniciar sesion
              </Text>
              <Text className="mt-2 text-sm leading-6 text-secondary/80">
                Si tu cuenta tiene varios accesos, vas a poder elegir como continuar.
              </Text>
            </LinearGradient>

            {!contexts ? (
              <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
                <Text className="text-3xl font-semibold text-secondary">Bienvenida</Text>
                <Text className="mt-2 text-sm leading-6 text-muted">
                  Login unificado para clientes, trabajadores y locales.
                </Text>

                <View className="mt-6">
                  <Text className="mb-2 text-sm font-medium text-secondary">Email</Text>
                  <TextInput
                    className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                    placeholder="tucorreo@ejemplo.com"
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
                      <Text className="text-xs font-semibold text-secondary">
                        Olvide mi contrasena
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>

                {errorMessage ? (
                  <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
                    <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  className="mt-6"
                  onPress={handleSubmit}
                  disabled={isSubmitting}
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

                <View className="mt-8 flex-row flex-wrap justify-center gap-2">
                  <Text className="text-sm text-muted">No tenes cuenta?</Text>
                  <Link href={CLIENT_REGISTER_ROUTE} asChild>
                    <TouchableOpacity>
                      <Text className="text-sm font-bold text-primary">Crear cliente</Text>
                    </TouchableOpacity>
                  </Link>
                  <Text className="text-sm text-muted">·</Text>
                  <Link href={PROFESSIONAL_REGISTER_ROUTE} asChild>
                    <TouchableOpacity>
                      <Text className="text-sm font-bold text-primary">Cuenta profesional</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            ) : (
              <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
                <Text className="text-xs font-bold uppercase tracking-[2px] text-faint">
                  Eleg&iacute; como continuar
                </Text>
                <Text className="mt-2 text-3xl font-semibold text-secondary">
                  Tu email tiene varios accesos
                </Text>
                <Text className="mt-2 text-sm leading-6 text-muted">
                  Eleg&iacute; uno para entrar; pod&eacute;s cambiar despu&eacute;s.
                </Text>

                {errorMessage ? (
                  <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
                    <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
                  </View>
                ) : null}

                <View className="mt-6" style={{ gap: 12 }}>
                  {contexts.map((descriptor) => {
                    const key = contextKey(descriptor);
                    const busy = selectingKey === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        activeOpacity={0.85}
                        onPress={() => handlePickContext(descriptor)}
                        disabled={busy}
                        className="rounded-[20px] border border-secondary/10 bg-backgroundSoft px-4 py-4"
                      >
                        <Text className="text-sm font-semibold text-secondary">
                          {contextLabel(descriptor)}
                        </Text>
                        <Text className="mt-1 text-xs text-muted">
                          {contextDescription(descriptor)}
                        </Text>
                        {busy ? (
                          <Text className="mt-2 text-[11px] font-bold uppercase tracking-[1.2px] text-primary">
                            Cargando...
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  className="mt-6 self-start"
                  onPress={() => {
                    setContexts(null);
                    setForm((prev) => ({ ...prev, password: '' }));
                  }}
                >
                  <Text className="text-sm font-semibold text-secondary">Volver al login</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </AppScreen>
      </KeyboardAvoidingView>

      <AuthLoadingOverlay
        visible={isSubmitting || Boolean(selectingKey)}
        title={selectingKey ? 'Cambiando de contexto' : 'Iniciando sesion'}
        description="Validando credenciales y preparando tu acceso."
      />
    </>
  );
}
