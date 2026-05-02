import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { isAxiosError } from 'axios';
import AuthLoadingOverlay from '../../../../components/auth/AuthLoadingOverlay';
import { AppScreen, surfaceStyles } from '../../../../components/ui/AppScreen';
import { theme } from '../../../../theme';
import {
  acceptWorkerInvitation,
  lookupWorkerInvitation,
  type InvitationLookup,
} from '../../../../services/workerInvitations';
import { getApiErrorMessage } from '../../../../services/errors';
import { UNIFIED_LOGIN_ROUTE } from '../routes';

const formatExpiry = (value: string | null) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('es-UY', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

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

export function WorkerInvitationScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => {
    const raw = Array.isArray(params.token) ? params.token[0] : params.token;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [params.token]);

  const [lookup, setLookup] = useState<InvitationLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!token) {
      setErrorMessage('Falta el token de invitacion.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await lookupWorkerInvitation(token);
        if (cancelled) return;
        setLookup(data);
        setForm((prev) => ({ ...prev, fullName: data.displayName ?? '' }));
      } catch (error) {
        if (cancelled) return;
        if (isAxiosError(error) && error.response?.status === 410) {
          setErrorMessage('La invitacion vencio. Pedile al local que te envie una nueva.');
        } else if (isAxiosError(error) && error.response?.status === 404) {
          setErrorMessage('Invitacion no encontrada o ya fue aceptada.');
        } else {
          setErrorMessage(extractMessage(error, 'No pudimos cargar la invitacion.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!lookup) return;
    setErrorMessage(null);

    if (lookup.needsAccountCreation) {
      if (!form.fullName.trim()) {
        setErrorMessage('Ingresa tu nombre completo.');
        return;
      }
      if (!form.phoneNumber.trim()) {
        setErrorMessage('Ingresa tu telefono.');
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
    }

    try {
      setSubmitting(true);
      await acceptWorkerInvitation({
        token,
        fullName: lookup.needsAccountCreation ? form.fullName.trim() : undefined,
        phoneNumber: lookup.needsAccountCreation ? form.phoneNumber.trim() : undefined,
        password: lookup.needsAccountCreation ? form.password : undefined,
      });
      setAccepted(true);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 410) {
        setErrorMessage('La invitacion vencio.');
      } else if (isAxiosError(error) && error.response?.status === 409) {
        setErrorMessage('Ese email ya no esta disponible.');
      } else {
        setErrorMessage(extractMessage(error, 'No pudimos completar el registro.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formattedExpiry = formatExpiry(lookup?.expiresAt ?? null);

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
              className="rounded-[30px] px-6 py-6"
            >
              <Text className="text-xs font-bold uppercase tracking-[2px] text-secondary/70">
                Invitacion de trabajo
              </Text>
              <Text className="mt-3 text-3xl font-semibold text-secondary">
                Sumate al equipo
              </Text>
              {lookup ? (
                <Text className="mt-2 text-sm leading-6 text-secondary/80">
                  Te invitaron a gestionar tu agenda y reservas en{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {lookup.professionalName ?? 'el local'}
                  </Text>
                  .
                </Text>
              ) : null}
              {formattedExpiry ? (
                <Text className="mt-2 text-xs text-secondary/70">
                  La invitacion vence el {formattedExpiry}.
                </Text>
              ) : null}
            </LinearGradient>

            <View className="mt-4 rounded-[32px] p-8" style={surfaceStyles.card}>
              {loading ? (
                <View className="items-center py-6">
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text className="mt-3 text-sm text-muted">Cargando invitacion...</Text>
                </View>
              ) : null}

              {!loading && errorMessage && !accepted ? (
                <View>
                  <View className="rounded-2xl border border-red-200 bg-red-50 p-3">
                    <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
                  </View>
                  <Link href={UNIFIED_LOGIN_ROUTE} asChild>
                    <TouchableOpacity className="mt-4 self-start">
                      <Text className="text-sm font-semibold text-primary">Volver al inicio</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              ) : null}

              {!loading && lookup && !accepted ? (
                <View>
                  <View>
                    <Text className="mb-2 text-sm font-medium text-secondary">Email</Text>
                    <View className="h-14 justify-center rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5">
                      <Text className="text-base text-secondary">{lookup.email}</Text>
                    </View>
                  </View>

                  {lookup.needsAccountCreation ? (
                    <>
                      <View className="mt-4">
                        <Text className="mb-2 text-sm font-medium text-secondary">
                          Nombre completo
                        </Text>
                        <TextInput
                          className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                          value={form.fullName}
                          onChangeText={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
                          placeholderTextColor={theme.colors.inkFaint}
                        />
                      </View>
                      <View className="mt-4">
                        <Text className="mb-2 text-sm font-medium text-secondary">Telefono</Text>
                        <TextInput
                          className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                          value={form.phoneNumber}
                          keyboardType="phone-pad"
                          onChangeText={(value) =>
                            setForm((prev) => ({ ...prev, phoneNumber: value }))
                          }
                          placeholder="+598..."
                          placeholderTextColor={theme.colors.inkFaint}
                        />
                      </View>
                      <View className="mt-4">
                        <Text className="mb-2 text-sm font-medium text-secondary">Contrasena</Text>
                        <TextInput
                          className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                          secureTextEntry
                          value={form.password}
                          onChangeText={(value) =>
                            setForm((prev) => ({ ...prev, password: value }))
                          }
                          placeholder="Minimo 8 caracteres"
                          placeholderTextColor={theme.colors.inkFaint}
                        />
                      </View>
                      <View className="mt-4">
                        <Text className="mb-2 text-sm font-medium text-secondary">
                          Confirmar contrasena
                        </Text>
                        <TextInput
                          className="h-14 rounded-[16px] border border-secondary/10 bg-backgroundSoft px-5 text-base text-secondary"
                          secureTextEntry
                          value={form.confirmPassword}
                          onChangeText={(value) =>
                            setForm((prev) => ({ ...prev, confirmPassword: value }))
                          }
                          placeholderTextColor={theme.colors.inkFaint}
                        />
                      </View>
                    </>
                  ) : (
                    <Text className="mt-4 text-sm leading-6 text-muted">
                      Ya tenes cuenta en Plura con este email. Aceptamos la invitacion para
                      conectar tu cuenta como trabajador del local.
                    </Text>
                  )}

                  {errorMessage ? (
                    <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
                      <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    className="mt-6"
                    activeOpacity={0.85}
                    onPress={handleAccept}
                    disabled={submitting}
                  >
                    <LinearGradient
                      colors={theme.gradients.brand}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="h-14 flex-row items-center justify-center rounded-full"
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text className="text-base font-semibold text-white">
                          {lookup.needsAccountCreation
                            ? 'Crear cuenta y aceptar'
                            : 'Aceptar invitacion'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : null}

              {accepted ? (
                <View>
                  <View className="rounded-2xl border border-green-200 bg-green-50 p-3">
                    <Text className="text-center text-xs text-green-700">
                      Listo! Aceptaste la invitacion. Inicia sesion para entrar a tu agenda.
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="mt-6"
                    activeOpacity={0.85}
                    onPress={() => router.replace(UNIFIED_LOGIN_ROUTE)}
                  >
                    <LinearGradient
                      colors={theme.gradients.brand}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="h-14 flex-row items-center justify-center rounded-full"
                    >
                      <Text className="text-base font-semibold text-white">
                        Ir a iniciar sesion
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </AppScreen>
      </KeyboardAvoidingView>

      <AuthLoadingOverlay
        visible={submitting}
        title="Activando tu acceso"
        description="Estamos guardando los datos de tu cuenta de trabajador."
      />
    </>
  );
}
